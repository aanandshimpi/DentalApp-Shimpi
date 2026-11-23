import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { canReadConsultations, consultationDateTime } from "@/lib/consultations";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";

const pageSize = 25;

export default async function ConsultationsPage({ searchParams }: {
  searchParams: Promise<{ patient?: string | string[]; page?: string | string[] }>;
}) {
  const viewer = await requireViewer();
  if (!canReadConsultations(viewer)) notFound();
  const params = await searchParams;
  const clinicId = viewer.clinic.id;
  const patientId = z.uuid().safeParse(params.patient).data;
  const patient = patientId ? await db.patient.findFirst({
    where: { clinicId, id: patientId }, select: { id: true, name: true, number: true, archivedAt: true },
  }) : null;
  if (params.patient && !patient) notFound();

  const where = { clinicId, patientId: patient?.id };
  const count = await db.consultation.count({ where });
  const pageCount = Math.max(1, Math.ceil(count / pageSize));
  const requested = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(requested) ? Math.min(pageCount, Math.max(1, requested)) : 1;
  const records = await db.consultation.findMany({
    where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: pageSize, skip: (page - 1) * pageSize,
    select: { id: true, createdAt: true, concern: true, appointmentId: true,
      patient: { select: { name: true, number: true } }, author: { select: { name: true } } },
  });

  return <Card className="panel patient-panel">
    <div className="panel-heading">
      <h2>{patient ? `Consultation history for ${patient.name} (${patient.number})` : "Consultation history"}</h2>
      {can(viewer.roles, "encounter.create") && !patient?.archivedAt && <Link className={buttonVariants()}
        href={{ pathname: "/consultations/new", query: patient ? { patient: patient.id } : {} }}>
        <Stethoscope size={16} /> New Consultation
      </Link>}
    </div>
    {records.length ? <div className="patient-table" role="region" aria-label="Consultation records" tabIndex={0}>
      <table>
        <thead><tr><th>Recorded</th><th>Patient</th><th>Reason for visit</th><th>Recorded by</th><th>Visit type</th></tr></thead>
        <tbody>{records.map((record) => <tr key={record.id}>
          <td>{consultationDateTime(record.createdAt, viewer.clinic.timezone)}</td>
          <td>{record.patient.name} ({record.patient.number})</td>
          <td className="consultation-concern"><Link className="appointment-manage" href={`/consultations/${record.id}`}>{record.concern}</Link></td>
          <td>{record.author.name}</td><td>{record.appointmentId ? "Appointment" : "Without appointment"}</td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="empty">No consultations recorded.</p>}
    {pageCount > 1 && <nav className="patient-pagination" aria-label="Consultation pages">
      {page > 1 && <Link href={{ pathname: "/consultations", query: { patient: patient?.id, page: page - 1 } }}>Previous</Link>}
      <span>Page {page} of {pageCount}</span>
      {page < pageCount && <Link href={{ pathname: "/consultations", query: { patient: patient?.id, page: page + 1 } }}>Next</Link>}
    </nav>}
  </Card>;
}
