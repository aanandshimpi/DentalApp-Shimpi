import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { DentalSpecialtyRecord } from "@/components/dental-specialty-record";
import { TreatmentCards, TreatmentStatusBadge } from "@/components/treatment-cards";
import { Card } from "@/components/ui/card";
import { consultationDateTime } from "@/lib/consultations";
import { db } from "@/lib/db";
import { treatmentPlanStatus, treatmentToothSelect } from "@/lib/treatment-progress";
import { canManageTreatmentPlans } from "@/lib/treatment-plans";
import { requireViewer } from "@/lib/viewer";

export default async function TreatmentPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  if (!canManageTreatmentPlans(viewer)) notFound();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const plan = await db.treatmentPlan.findFirst({
    where: { clinicId: viewer.clinic.id, id },
    select: {
      id: true, status: true, title: true, treatment: true, followUp: true, createdAt: true, specialtyData: true,
      teeth: { select: treatmentToothSelect, orderBy: { tooth: "asc" } },
      patient: { select: { id: true, name: true, number: true, archivedAt: true } },
      author: { select: { name: true } },
      consultation: { select: { id: true, concern: true, createdAt: true } },
    },
  });
  if (!plan) notFound();

  const { patient, consultation } = plan;
  const timezone = viewer.clinic.timezone;
  return <Card className="panel treatment-plan-panel">
    <div className="panel-heading">
      <h2>{plan.title} <TreatmentStatusBadge status={treatmentPlanStatus(plan.status, plan.teeth)} /></h2>
      <Link className="appointment-manage" href={`/patients/${patient.id}?plan=${id}#plan-${id}`}>
        Patient record
      </Link>
    </div>
    <dl className="consultation-record">
      <div><dt>Patient</dt><dd>{patient.name} ({patient.number})</dd></div>
      <div><dt>Created</dt><dd>{consultationDateTime(plan.createdAt, timezone)} · {plan.author.name}</dd></div>
      <div><dt>Consultation</dt><dd>{consultation ? <Link className="appointment-manage" href={`/consultations/${consultation.id}`}>
        {consultationDateTime(consultation.createdAt, timezone)} · {consultation.concern}
      </Link> : "No consultation linked"}</dd></div>
      <DentalSpecialtyRecord data={plan.specialtyData} mode="treatment" />
      {plan.teeth.length > 0 && plan.treatment && <div><dt>Proposed treatment</dt><dd>{plan.treatment}</dd></div>}
      {plan.teeth.length > 0 && plan.followUp && <div><dt>Follow-up instructions</dt><dd>{plan.followUp}</dd></div>}
    </dl>
    <TreatmentCards plan={plan} editable={!patient.archivedAt} />
  </Card>;
}
