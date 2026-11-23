import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { DentalSpecialtyRecord, SavedToothDetails } from "@/components/dental-specialty-record";
import { Card } from "@/components/ui/card";
import { appointmentLocalTime } from "@/lib/appointments";
import { canReadConsultations, consultationDateTime } from "@/lib/consultations";
import { db } from "@/lib/db";
import { canManageTreatmentPlans } from "@/lib/treatment-plans";
import { requireViewer } from "@/lib/viewer";

export default async function ConsultationPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  if (!canReadConsultations(viewer)) notFound();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const consultation = await db.consultation.findFirst({
    where: { clinicId: viewer.clinic.id, id },
    select: {
      concern: true, findings: true, assessment: true, plan: true, createdAt: true, specialtyData: true,
      teeth: { select: { tooth: true, details: true, diagnosis: true, surfaces: true }, orderBy: { tooth: "asc" } },
      patient: { select: { id: true, name: true, number: true, archivedAt: true } },
      author: { select: { name: true } },
      appointment: { select: { startsAt: true, status: true, doctor: { select: { user: { select: { name: true } } } } } },
    },
  });
  if (!consultation) notFound();

  const { patient, author, appointment } = consultation;
  const timezone = viewer.clinic.timezone;
  return <Card className="panel consultation-panel">
    <div className="panel-heading">
      <h2>Consultation record</h2>
      <Link className="appointment-manage" href={`/patients/${patient.id}?visit=${id}#visit-${id}`}>
        Patient record
      </Link>
    </div>
    {canManageTreatmentPlans(viewer) && <div className="consultation-context">
      <Link className="appointment-manage" href={{ pathname: "/treatment-plans", query: { consultation: id } }}>
        View linked treatment plans
      </Link>
      {!patient.archivedAt && <Link className={buttonVariants()} href={{ pathname: "/treatment-plans/new", query: { consultation: id } }}>
        Create Treatment Plan
      </Link>}
    </div>}
    <dl className="consultation-record">
      <div><dt>Patient</dt><dd>{patient.name} ({patient.number})</dd></div>
      <div><dt>Recorded</dt><dd>{consultationDateTime(consultation.createdAt, timezone)} · {author.name}</dd></div>
      <div><dt>Appointment</dt><dd>{appointment ? <>
        <Link className="appointment-manage" href={{ pathname: "/appointments", query: { date: appointmentLocalTime(appointment.startsAt, timezone).day } }}>
          {consultationDateTime(appointment.startsAt, timezone)} · {appointment.doctor.user.name}
        </Link>
        {appointment.status === "CANCELLED" && " (Cancelled)"}
      </> : "No appointment linked"}</dd></div>
      <div><dt>Reason for visit</dt><dd>{consultation.concern}</dd></div>
      <DentalSpecialtyRecord data={consultation.specialtyData} mode="consultation" />
      {consultation.findings && <div><dt>Clinical findings</dt><dd>{consultation.findings}</dd></div>}
      {consultation.assessment && <div><dt>Assessment</dt><dd>{consultation.assessment}</dd></div>}
      {consultation.plan && <div><dt>Plan and follow-up</dt><dd>{consultation.plan}</dd></div>}
    </dl>
    <SavedToothDetails teeth={consultation.teeth} data={consultation.specialtyData} heading="Tooth findings" />
  </Card>;
}
