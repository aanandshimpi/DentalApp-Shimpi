import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ClinicalPatientPicker } from "@/components/clinical-patient-picker";
import { Card } from "@/components/ui/card";
import { consultationDateTime } from "@/lib/consultations";
import { db } from "@/lib/db";
import { readSpecialtyRecord } from "@/lib/specialty-records";
import { canManageTreatmentPlans } from "@/lib/treatment-plans";
import { requireViewer } from "@/lib/viewer";
import { TreatmentPlanForm } from "./treatment-plan-form";

export default async function NewTreatmentPlanPage({ searchParams }: {
  searchParams: Promise<{ patient?: string | string[]; consultation?: string | string[] }>;
}) {
  const viewer = await requireViewer();
  if (!canManageTreatmentPlans(viewer)) notFound();
  const params = await searchParams;
  const clinicId = viewer.clinic.id;
  const patientId = z.uuid().safeParse(params.patient).data;
  const consultationId = z.uuid().safeParse(params.consultation).data;
  const linked = consultationId ? await db.consultation.findFirst({
    where: { clinicId, id: consultationId },
    select: { id: true, patientId: true, concern: true, createdAt: true, specialtyData: true,
      teeth: { select: { tooth: true }, orderBy: { tooth: "asc" } } },
  }) : null;
  if (params.consultation && (!linked || (params.patient && patientId !== linked.patientId))) notFound();

  const selectedId = linked?.patientId ?? patientId;
  const patient = selectedId ? await db.patient.findFirst({
    where: { clinicId, id: selectedId, archivedAt: null }, select: { id: true, name: true, number: true },
  }) : null;
  if ((params.patient || linked) && !patient) notFound();

  const patients = patient ? [] : await db.patient.findMany({
    where: { clinicId, archivedAt: null },
    select: { id: true, name: true, number: true }, orderBy: [{ name: "asc" }, { number: "asc" }],
  });
  const consultations = patient && !linked ? await db.consultation.findMany({
    where: { clinicId, patientId: patient.id },
    select: { id: true, concern: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  }) : [];
  const option = ({ id, concern, createdAt }: { id: string; concern: string; createdAt: Date }) => ({
    id, label: `${consultationDateTime(createdAt, viewer.clinic.timezone)} · ${concern}`,
  });

  return <Card className="panel consultation-panel">
    <div className="panel-heading">
      <h2>Create Treatment Plan</h2>
      <Link className="appointment-manage" href="/treatment-plans">Treatment plan history</Link>
    </div>
    {patient ? <>
      <div className="consultation-context">
        <strong>{patient.name} ({patient.number})</strong>
        {linked ? <Link className="appointment-manage" href={`/consultations/${linked.id}`}>Back to consultation</Link>
          : <Link className="appointment-manage" href="/treatment-plans/new">Change patient</Link>}
      </div>
      <TreatmentPlanForm key={patient.id + (linked?.id ?? "")} patientId={patient.id}
        linked={linked ? option(linked) : undefined} consultations={consultations.map(option)}
        initialSpecialty={readSpecialtyRecord(linked?.specialtyData)?.specialty}
        referenceTeeth={linked?.teeth.map(({ tooth }) => tooth)} />
    </> : <ClinicalPatientPicker action="/treatment-plans/new" patients={patients} />}
  </Card>;
}
