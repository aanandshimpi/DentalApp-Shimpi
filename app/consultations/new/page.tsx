import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { ClinicalPatientPicker } from "@/components/clinical-patient-picker";
import { canReadConsultations, consultationDateTime } from "@/lib/consultations";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { ConsultationForm } from "./consultation-form";

export default async function NewConsultationPage({ searchParams }: {
  searchParams: Promise<{ patient?: string | string[]; appointment?: string | string[] }>;
}) {
  const viewer = await requireViewer();
  if (!canReadConsultations(viewer) || !can(viewer.roles, "encounter.create")) notFound();
  const params = await searchParams;
  const clinicId = viewer.clinic.id;
  const appointmentId = z.uuid().safeParse(params.appointment).data;
  const patientId = z.uuid().safeParse(params.patient).data;
  const appointment = appointmentId ? await db.appointment.findFirst({
    where: { clinicId, id: appointmentId },
    select: {
      id: true, patientId: true, status: true, startsAt: true,
      doctor: { select: { user: { select: { name: true } } } },
      consultation: { select: { id: true } },
    },
  }) : null;
  if (params.appointment && (!appointment || (params.patient && patientId !== appointment.patientId))) notFound();
  if (appointment?.consultation) redirect(`/consultations/${appointment.consultation.id}`);
  if (appointment?.status === "CANCELLED") notFound();

  const selectedId = appointment?.patientId ?? patientId;
  const patient = selectedId ? await db.patient.findFirst({
    where: { clinicId, id: selectedId, archivedAt: null }, select: { id: true, name: true, number: true },
  }) : null;
  if ((params.patient || appointment) && !patient) notFound();

  const patients = patient ? [] : await db.patient.findMany({
    where: { clinicId, archivedAt: null },
    select: { id: true, name: true, number: true }, orderBy: [{ name: "asc" }, { number: "asc" }],
  });
  const available = appointment ? [appointment] : patient ? await db.appointment.findMany({
    where: { clinicId, patientId: patient.id, status: { not: "CANCELLED" }, consultation: null },
    select: { id: true, startsAt: true, doctor: { select: { user: { select: { name: true } } } } },
    orderBy: [{ startsAt: "desc" }, { id: "asc" }],
  }) : [];

  return <Card className="panel consultation-panel">
    <div className="panel-heading">
      <h2>New Consultation</h2>
      <Link className="appointment-manage" href="/consultations">Consultation history</Link>
    </div>
    {patient ? <>
      <div className="consultation-context">
        <strong>{patient.name} ({patient.number})</strong>
        <Link className="appointment-manage" href="/consultations/new">Change patient</Link>
      </div>
      <ConsultationForm key={patient.id + (appointmentId ?? "")} patientId={patient.id} appointmentId={appointmentId ?? ""}
        appointments={available.map(({ id, startsAt, doctor }) => ({
          id, label: `${consultationDateTime(startsAt, viewer.clinic.timezone)} · ${doctor.user.name}`,
        }))} />
    </> : <ClinicalPatientPicker action="/consultations/new" patients={patients} />}
  </Card>;
}
