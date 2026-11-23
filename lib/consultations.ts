import { z } from "zod";
import { Prisma } from "../generated/prisma/client";
import { lockAppointments } from "./appointments";
import { db } from "./db";
import { can } from "./permissions";
import { parseClinicalSpecialty } from "./specialty-records";
import type { Viewer } from "./session";

const consultation = z.object({
  patientId: z.uuid(),
  appointmentId: z.union([z.literal(""), z.uuid()]),
  concern: z.string().trim().min(1).max(200),
  findings: z.string().trim().max(4000),
  assessment: z.string().trim().max(4000),
  plan: z.string().trim().max(4000),
});

export function canReadConsultations(viewer: Viewer) {
  return can(viewer.roles, "clinical.read");
}

export async function recordConsultation(viewer: Viewer, fields: Record<string, unknown>): Promise<{ id: string; patientId: string } | { error: string }> {
  if (!canReadConsultations(viewer) || !can(viewer.roles, "encounter.create")) {
    return { error: "You do not have permission to record consultations." };
  }
  const parsed = consultation.safeParse(fields);
  if (!parsed.success) return { error: "Select a patient and enter the reason for the visit and clinical findings. Check the field lengths." };

  const { patientId, appointmentId, concern, findings, assessment, plan } = parsed.data;
  const specialty = parseClinicalSpecialty(fields, "consultation");
  if ("error" in specialty) return { error: specialty.error };
  if (!findings && !Object.keys(specialty.specialtyData.fields).length && !specialty.teeth.length) {
    return { error: "Enter clinical findings, specialty findings, or findings for a selected tooth." };
  }

  const clinicId = viewer.clinic.id;
  try {
    return await db.$transaction(async (tx) => {
      if (appointmentId) await lockAppointments(tx, clinicId);
      const patient = await tx.patient.findFirst({
        where: { clinicId, id: patientId, archivedAt: null }, select: { id: true },
      });
      if (!patient) return { error: "Select an active patient from this clinic." };

      if (appointmentId) {
        const appointment = await tx.appointment.findFirst({
          where: { clinicId, id: appointmentId, patientId, status: { not: "CANCELLED" } },
          select: { consultation: { select: { id: true } } },
        });
        if (!appointment) return { error: "Select an appointment for this patient that has not been cancelled." };
        if (appointment.consultation) return { error: "This appointment already has a consultation. Open it from the schedule." };
      }

      return tx.consultation.create({
        data: {
          clinicId, patientId, appointmentId: appointmentId || null, authorId: viewer.id,
          concern, findings, assessment: assessment || null, plan: plan || null,
          specialtyData: specialty.specialtyData,
          teeth: { create: specialty.teeth.map(({ tooth, details, diagnosis, surfaces }) => ({ tooth, details, diagnosis, surfaces })) },
        },
        select: { id: true, patientId: true },
      });
    }, { isolationLevel: "ReadCommitted" });
  } catch (error) {
    if (appointmentId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "This appointment already has a consultation. Open it from the schedule." };
    }
    throw error;
  }
}

export function consultationDateTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: timezone, dateStyle: "medium", timeStyle: "short",
  }).format(date);
}
