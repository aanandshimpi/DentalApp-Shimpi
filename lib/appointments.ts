import { z } from "zod";
import type { Prisma } from "../generated/prisma/client";
import { db } from "./db";
import { nextAppointmentStatus } from "./appointment-status";
import { can } from "./permissions";
import type { Viewer } from "./session";

export const appointmentDate = z.iso.date().refine((day) => !day.startsWith("0000"));

export function clinicToday(timezone: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

export async function appointmentDayBounds(day: string, timezone: string) {
  const [bounds] = await db.$queryRaw<{ start: number; end: number }[]>`
    SELECT EXTRACT(EPOCH FROM ${day}::date::timestamp AT TIME ZONE ${timezone})::double precision AS start,
           EXTRACT(EPOCH FROM (${day}::date + 1)::timestamp AT TIME ZONE ${timezone})::double precision AS end
  `;
  return { start: new Date(bounds.start * 1000), end: new Date(bounds.end * 1000) };
}

const booking = z.object({
  patientId: z.uuid("Select a patient."),
  doctorId: z.uuid("Select a doctor."),
  chairId: z.union([z.literal(""), z.uuid("Select a valid chair.")]),
  day: appointmentDate,
  time: z.iso.time({ precision: -1 }),
  duration: z.string().regex(/^\d{1,3}$/).transform(Number).pipe(
    z.number().int().min(5).max(480),
  ),
  reason: z.string().trim().min(1, "Enter the reason for the visit.").max(200),
});

const rescheduling = booking.omit({ patientId: true, reason: true });
const editFields = z.object({
  id: z.uuid(),
  revision: z.string().regex(/^\d{1,10}$/).transform(Number).pipe(z.number().max(2147483647)),
});

type AppointmentResult = { error: string } | { day: string };
type AppointmentEdit = z.output<typeof editFields>;

export async function lockAppointments(tx: Prisma.TransactionClient, clinicId: string) {
  // Use the same lock for changes involving appointments within a clinic.
  await tx.$queryRaw`
    SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${`appointment-booking:${clinicId}`}, 0))
  `;
}

export function appointmentLocalTime(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    day: `${part("year").padStart(4, "0")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

export async function bookAppointment(viewer: Viewer, fields: Record<string, unknown>): Promise<AppointmentResult> {
  if (!can(viewer.roles, "appointment.manage")) return { error: "You do not have permission to book appointments." };
  const result = booking.safeParse(fields);
  if (!result.success) return { error: "Check the selected patient, doctor, date, time, duration and reason." };
  return writeAppointment(viewer, result.data, { booking: result.data });
}

export async function rescheduleAppointment(viewer: Viewer, fields: Record<string, unknown>): Promise<AppointmentResult> {
  if (!can(viewer.roles, "appointment.manage")) return { error: "You do not have permission to reschedule appointments." };
  const edit = editFields.safeParse(fields);
  const schedule = rescheduling.safeParse(fields);
  if (!edit.success || !schedule.success) return { error: "Check the selected doctor, date, time and duration." };
  return writeAppointment(viewer, schedule.data, { edit: edit.data });
}

async function writeAppointment(
  viewer: Viewer,
  schedule: z.output<typeof rescheduling>,
  request: { booking: Pick<z.output<typeof booking>, "patientId" | "reason"> } | { edit: AppointmentEdit },
): Promise<AppointmentResult> {
  const { doctorId, chairId, day, time, duration } = schedule;
  const clinicId = viewer.clinic.id;
  const timezone = viewer.clinic.timezone;
  const localStart = `${day}T${time}:00`;
  const [start] = await db.$queryRaw<{ epoch: number; valid: boolean }[]>`
    SELECT EXTRACT(EPOCH FROM ${localStart}::timestamp AT TIME ZONE ${timezone})::double precision AS epoch,
           ((${localStart}::timestamp AT TIME ZONE ${timezone}) AT TIME ZONE ${timezone})
             = ${localStart}::timestamp AS valid
  `;
  if (!start.valid) return { error: "That start time does not exist in the clinic time zone. Choose another time." };

  const startsAt = new Date(start.epoch * 1000);
  const endsAt = new Date(startsAt.getTime() + duration * 60_000);

  return db.$transaction(async (tx) => {
    await lockAppointments(tx, clinicId);
    const edit = "edit" in request ? request.edit : null;
    const patientId = "booking" in request ? request.booking.patientId : (await tx.appointment.findFirst({
      where: { clinicId, id: request.edit.id, revision: request.edit.revision, status: "SCHEDULED" },
      select: { patientId: true },
    }))?.patientId;
    if (!patientId) return { error: "This appointment changed. Return to the schedule and reopen it." };

    const [patient, doctor, chair] = await Promise.all([
      tx.patient.findFirst({ where: { clinicId, id: patientId, archivedAt: null }, select: { id: true } }),
      tx.doctor.findFirst({
        where: { clinicId, id: doctorId, active: true, user: { active: true } }, select: { id: true },
      }),
      chairId ? tx.chair.findFirst({ where: { clinicId, id: chairId }, select: { id: true } }) : null,
    ]);
    if (!patient || !doctor || (chairId && !chair)) {
      return { error: "Select an active patient and doctor and an available chair from this clinic." };
    }

    const conflict = await tx.appointment.findFirst({
      where: {
        clinicId, status: { not: "CANCELLED" }, id: edit ? { not: edit.id } : undefined,
        startsAt: { lt: endsAt }, endsAt: { gt: startsAt },
        OR: [{ patientId }, { doctorId }, ...(chairId ? [{ chairId }] : [])],
      },
      select: { id: true },
    });
    if (conflict) return { error: "The patient, doctor, or chair already has an appointment during that time." };

    const bookingTime = { doctorId, chairId: chairId || null, startsAt, endsAt };
    if ("edit" in request) {
      const { id, revision } = request.edit;
      const updated = await tx.appointment.updateMany({
        where: { clinicId, id, revision, status: "SCHEDULED" },
        data: { ...bookingTime, revision: { increment: 1 } },
      });
      if (!updated.count) return { error: "This appointment changed. Return to the schedule and reopen it." };
    } else {
      await tx.appointment.create({
        data: { ...bookingTime, clinicId, patientId, reason: request.booking.reason, status: "SCHEDULED" },
      });
    }
    return { day };
  }, { isolationLevel: "ReadCommitted" });
}

export async function cancelAppointment(viewer: Viewer, fields: Record<string, unknown>): Promise<AppointmentResult> {
  if (!can(viewer.roles, "appointment.manage")) return { error: "You do not have permission to cancel appointments." };
  const parsed = editFields.safeParse(fields);
  if (!parsed.success) return { error: "Return to the schedule and reopen the appointment." };

  const clinicId = viewer.clinic.id;
  return db.$transaction(async (tx) => {
    await lockAppointments(tx, clinicId);
    const [appointment] = await tx.appointment.updateManyAndReturn({
      where: { ...parsed.data, clinicId, status: "SCHEDULED" },
      data: { status: "CANCELLED", revision: { increment: 1 } },
      select: { startsAt: true },
    });
    if (!appointment) return { error: "This appointment changed. Return to the schedule and reopen it." };
    return { day: appointmentLocalTime(appointment.startsAt, viewer.clinic.timezone).day };
  }, { isolationLevel: "ReadCommitted" });
}

export async function appointmentResources(clinicId: string) {
  const [doctors, chairs] = await Promise.all([
    db.doctor.findMany({
      where: { clinicId, active: true, user: { active: true } },
      select: { id: true, user: { select: { name: true } } }, orderBy: { user: { name: "asc" } },
    }),
    db.chair.findMany({ where: { clinicId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return { doctors: doctors.map(({ id, user }) => ({ id, name: user.name })), chairs };
}

export async function advanceAppointment(viewer: Viewer, fields: Record<string, unknown>): Promise<{ error: string } | { updated: true }> {
  if (!can(viewer.roles, "appointment.manage")) return { error: "You do not have permission to update appointments." };
  const parsed = editFields.safeParse(fields);
  if (!parsed.success) return { error: "Refresh the schedule and try again." };

  const where = { ...parsed.data, clinicId: viewer.clinic.id };
  return db.$transaction(async (tx) => {
    await lockAppointments(tx, where.clinicId);
    const appointment = await tx.appointment.findFirst({ where, select: { status: true } });
    const next = appointment && nextAppointmentStatus[appointment.status];
    if (!next) return { error: "This appointment changed or has no further status update. Refresh the schedule." };

    const updated = await tx.appointment.updateMany({
      where: { ...where, status: appointment.status },
      data: { status: next.status, revision: { increment: 1 } },
    });
    if (!updated.count) return { error: "This appointment changed. Refresh the schedule." };
    return { updated: true };
  }, { isolationLevel: "ReadCommitted" });
}
