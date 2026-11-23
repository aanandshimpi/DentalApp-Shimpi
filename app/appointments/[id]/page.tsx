import { notFound } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { appointmentLocalTime, appointmentResources } from "@/lib/appointments";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { AppointmentForm } from "../appointment-form";
import { CancelAppointmentForm } from "./cancel-form";

export default async function ManageAppointmentPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ view?: string | string[] }>;
}) {
  const viewer = await requireViewer();
  if (!can(viewer.roles, "appointment.manage")) notFound();

  const { id } = await params;
  const calendar = (await searchParams).view === "calendar";
  if (!z.uuid().safeParse(id).success) notFound();
  const clinicId = viewer.clinic.id;
  const appointment = await db.appointment.findFirst({
    where: { clinicId, id, status: "SCHEDULED" },
    select: { id: true, startsAt: true, endsAt: true, doctorId: true, chairId: true, revision: true,
      patient: { select: { name: true, number: true } } },
  });
  if (!appointment) notFound();

  const { doctors, chairs } = await appointmentResources(clinicId);
  const { day, time } = appointmentLocalTime(appointment.startsAt, viewer.clinic.timezone);
  const edit = {
    id, revision: appointment.revision, time,
    duration: String((appointment.endsAt.getTime() - appointment.startsAt.getTime()) / 60_000),
    patient: `${appointment.patient.name} (${appointment.patient.number})`,
    doctorId: doctors.some((doctor) => doctor.id === appointment.doctorId) ? appointment.doctorId : "",
    chairId: appointment.chairId ?? "",
  };

  return <Card className="panel patient-registration">
    <div className="panel-heading"><h2>Reschedule appointment</h2></div>
    <AppointmentForm calendar={calendar} day={day} timezone={viewer.clinic.timezone} doctors={doctors} chairs={chairs} edit={edit} />
    <CancelAppointmentForm calendar={calendar} id={id} revision={appointment.revision} />
  </Card>;
}
