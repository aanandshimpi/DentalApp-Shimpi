import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ClipboardPlus } from "lucide-react";
import { TreatmentStatusBadge } from "@/components/treatment-cards";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { consultationDateTime } from "@/lib/consultations";
import { db } from "@/lib/db";
import { treatmentPlanStatus } from "@/lib/treatment-progress";
import { canManageTreatmentPlans } from "@/lib/treatment-plans";
import { requireViewer } from "@/lib/viewer";

const pageSize = 25;

export default async function TreatmentPlansPage({ searchParams }: {
  searchParams: Promise<{ patient?: string | string[]; consultation?: string | string[]; page?: string | string[] }>;
}) {
  const viewer = await requireViewer();
  if (!canManageTreatmentPlans(viewer)) notFound();
  const params = await searchParams;
  const clinicId = viewer.clinic.id;
  const patientId = z.uuid().safeParse(params.patient).data;
  const consultationId = z.uuid().safeParse(params.consultation).data;
  const consultation = consultationId ? await db.consultation.findFirst({
    where: { clinicId, id: consultationId },
    select: { id: true, patientId: true, concern: true },
  }) : null;
  if (params.consultation && (!consultation || (params.patient && consultation.patientId !== patientId))) notFound();

  const selectedId = consultation?.patientId ?? patientId;
  const patient = selectedId ? await db.patient.findFirst({
    where: { clinicId, id: selectedId }, select: { id: true, name: true, number: true, archivedAt: true },
  }) : null;
  if ((params.patient || consultation) && !patient) notFound();

  const filters = { patient: patient?.id, consultation: consultation?.id };
  const where = { clinicId, patientId: filters.patient, consultationId: filters.consultation };
  const count = await db.treatmentPlan.count({ where });
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const requested = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(requested) ? Math.min(pageCount, Math.max(1, requested)) : 1;
  const plans = await db.treatmentPlan.findMany({
    where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize, skip: (page - 1) * pageSize,
    select: {
      id: true, title: true, createdAt: true, consultationId: true, status: true,
      teeth: { select: { status: true } },
      patient: { select: { name: true, number: true } }, author: { select: { name: true } },
    },
  });

  return <Card className="panel patient-panel">
    <div className="panel-heading">
      <h2>{patient ? `Treatment plans for ${patient.name} (${patient.number})` : "Treatment plan history"}</h2>
      {!patient?.archivedAt && <Link className={buttonVariants()} href={{ pathname: "/treatment-plans/new", query: filters }}>
        <ClipboardPlus size={16} /> Create Treatment Plan
      </Link>}
    </div>
    {consultation && <div className="consultation-context"><span>Consultation</span>
      <Link className="appointment-manage" href={`/consultations/${consultation.id}`}>{consultation.concern}</Link>
    </div>}
    {plans.length ? <div className="patient-table" role="region" aria-label="Treatment plan records" tabIndex={0}>
      <table>
        <thead><tr><th>Plan</th><th>Patient</th><th>Created</th><th>Created by</th><th>Source</th><th>Status</th></tr></thead>
        <tbody>{plans.map((plan) => <tr key={plan.id}>
          <td className="consultation-concern"><Link className="appointment-manage" href={`/treatment-plans/${plan.id}`}>{plan.title}</Link></td>
          <td>{plan.patient.name} ({plan.patient.number})</td>
          <td>{consultationDateTime(plan.createdAt, viewer.clinic.timezone)}</td>
          <td>{plan.author.name}</td><td>{plan.consultationId ? "Consultation" : "Standalone plan"}</td>
          <td><TreatmentStatusBadge status={treatmentPlanStatus(plan.status, plan.teeth)} /></td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="empty">No treatment plans recorded.</p>}
    {pageCount > 1 && <nav className="patient-pagination" aria-label="Treatment plan pages">
      {page > 1 && <Link href={{ pathname: "/treatment-plans", query: { ...filters, page: page - 1 } }}>Previous</Link>}
      <span>Page {page} of {pageCount}</span>
      {page < pageCount && <Link href={{ pathname: "/treatment-plans", query: { ...filters, page: page + 1 } }}>Next</Link>}
    </nav>}
  </Card>;
}
