import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, ClipboardList, Layers, Timer } from "lucide-react";
import type { TreatmentStatus } from "@/generated/prisma/enums";
import { treatmentStatusLabels } from "@/lib/treatment-progress";
import { Card } from "./ui/card";

const stages = [
  { status: "PLANNED", Icon: ClipboardList },
  { status: "IN_PROGRESS", Icon: Timer },
  { status: "DONE", Icon: CheckCircle2 },
] as const;

export function PatientProfile({ patient, lastCheckup, checkupCount, children }: {
  patient: { name: string; number: string; phone: string | null; archivedAt: Date | null };
  lastCheckup?: string; checkupCount?: number; children: ReactNode;
}) {
  const initials = patient.name.trim().split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join("").toUpperCase();
  return <Card className="patient-profile">
    <div className="patient-profile-main">
      <div className="patient-profile-avatar" aria-hidden="true">{initials}</div>
      <div>
        <h2>{patient.name}</h2>
        {patient.archivedAt && <span className="patient-archived">Archived patient</span>}
      </div>
    </div>
    <div className="patient-form-actions">{children}</div>
    <dl className="patient-profile-details">
      <div><dt>Patient number</dt><dd>{patient.number}</dd></div>
      <div><dt>Phone</dt><dd>{patient.phone ? <a href={`tel:${patient.phone}`}>{patient.phone}</a> : "Not recorded"}</dd></div>
      {checkupCount !== undefined && <>
        <div><dt>Checkups</dt><dd>{checkupCount}</dd></div>
        <div><dt>Last checkup</dt><dd>{lastCheckup ?? "None yet"}</dd></div>
      </>}
    </dl>
  </Card>;
}

export function PatientTreatmentOverview({ counts, planCount, activeStatus, statusHref }: {
  counts: Record<TreatmentStatus, number>; planCount: number; activeStatus?: TreatmentStatus | "ALL";
  statusHref: (status: TreatmentStatus | "ALL") => string;
}) {
  const total = counts.PLANNED + counts.IN_PROGRESS + counts.DONE;
  return <section className="patient-treatment-overview" aria-labelledby="treatment-overview-title">
    <div className="patient-section-heading">
      <h3 id="treatment-overview-title">Treatment overview</h3>
      <span>{planCount} {planCount === 1 ? "plan" : "plans"} across all visits</span>
    </div>
    <dl className="patient-treatment-metrics">
      <div className="patient-treatment-stat patient-treatment-link" data-tone="total" data-active={activeStatus === "ALL"}>
        <dt><Layers size={16} aria-hidden="true" /> <Link href={statusHref("ALL")} scroll={false}
          aria-current={activeStatus === "ALL" ? "page" : undefined}
          aria-label={`Total treatments (${total})`}>Total treatments</Link></dt><dd>{total}</dd>
      </div>
      {stages.map(({ status, Icon }) => <div className="patient-treatment-stat patient-treatment-link" data-tone={status.toLowerCase()} key={status}
        data-active={activeStatus === status}>
        <dt><Icon size={16} aria-hidden="true" /> <Link href={statusHref(status)} scroll={false}
          aria-current={activeStatus === status ? "page" : undefined}
          aria-label={`${treatmentStatusLabels[status]} treatments (${counts[status]})`}>{treatmentStatusLabels[status]}</Link></dt>
        <dd>{counts[status]}</dd>
      </div>)}
    </dl>
  </section>;
}
