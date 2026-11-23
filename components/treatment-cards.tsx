import { CheckCircle2, ClipboardList, Timer } from "lucide-react";
import type { TreatmentStatus } from "@/generated/prisma/enums";
import { procedureLabel } from "@/lib/dental-specialties";
import { readSpecialtyRecord } from "@/lib/specialty-records";
import { toothSurfaces } from "@/lib/teeth";
import { treatmentStatusLabels } from "@/lib/treatment-progress";
import { TreatmentBoard } from "./treatment-board";
import { ToothModel } from "./tooth-model";
import { TreatmentProgressAction } from "./treatment-progress-action";

export type TreatmentTooth = {
  tooth: string; details: string; procedure: string | null; diagnosis: string | null;
  suggestedTreatment: string | null; surfaces: string[]; status: TreatmentStatus;
};

type TreatmentPlan = {
  id: string; title: string; treatment: string; followUp: string | null; status: TreatmentStatus;
  specialtyData: unknown; teeth: TreatmentTooth[];
};

const columns = [
  { status: "PLANNED", Icon: ClipboardList, empty: "No planned treatments" },
  { status: "IN_PROGRESS", Icon: Timer, empty: "No treatments in progress" },
  { status: "DONE", Icon: CheckCircle2, empty: "No completed treatments" },
] as const;

export function TreatmentStatusBadge({ status }: { status: TreatmentStatus }) {
  return <span className={`status treatment-status treatment-${status.toLowerCase()}`}>{treatmentStatusLabels[status]}</span>;
}

function GeneralTreatmentCard({ plan, editable, showStatus }: { plan: TreatmentPlan; editable: boolean; showStatus?: boolean }) {
  const specialty = readSpecialtyRecord(plan.specialtyData);
  return <article className="treatment-item" aria-label="General treatment">
    <header>
      <div className="treatment-item-image"><ClipboardList size={24} aria-hidden="true" /></div>
      <div><h5>General treatment</h5>{showStatus && <TreatmentStatusBadge status={plan.status} />}</div>
    </header>
    {(plan.treatment || plan.followUp || Boolean(specialty?.options.length)) && <dl className="treatment-item-details">
      {specialty && specialty.options.length > 0 && <div><dt>Procedures</dt>
        <dd>{specialty.options.map((option) => procedureLabel(specialty.specialty, option)).join(", ")}</dd>
      </div>}
      {plan.treatment && <div><dt>Proposed treatment</dt><dd>{plan.treatment}</dd></div>}
      {plan.followUp && <div><dt>Follow-up instructions</dt><dd>{plan.followUp}</dd></div>}
    </dl>}
    {editable && plan.status !== "DONE" && <TreatmentProgressAction key={plan.status}
      planId={plan.id} status={plan.status} subject={plan.title} />}
  </article>;
}

function ToothTreatmentCard({ item, specialty, planId, editable, showStatus }: {
  item: TreatmentTooth; specialty: string; planId: string; editable: boolean; showStatus?: boolean;
}) {
  const option = item.procedure ? procedureLabel(specialty, item.procedure) : null;
  return <article className="treatment-item" aria-label={`Tooth ${item.tooth}`}>
    <header>
      <div className="treatment-item-image"><ToothModel tooth={item.tooth} /></div>
      <div>
        <h5>Tooth {item.tooth}</h5>
        {option && <p>{option}</p>}
        {showStatus && <TreatmentStatusBadge status={item.status} />}
      </div>
    </header>
    {(item.suggestedTreatment || item.details || item.diagnosis || item.surfaces.length > 0) && <dl className="treatment-item-details">
      {item.diagnosis && <div><dt>Diagnosis</dt><dd>{item.diagnosis}</dd></div>}
      {item.suggestedTreatment && <div><dt>Suggested treatment</dt><dd>{item.suggestedTreatment}</dd></div>}
      {item.details && <div><dt>Examination</dt><dd>{item.details}</dd></div>}
      {item.surfaces.length > 0 && <div><dt>Surfaces</dt><dd>{item.surfaces.map((surface) =>
        toothSurfaces[surface as keyof typeof toothSurfaces] ?? surface).join(", ")}</dd></div>}
    </dl>}
    {editable && item.status !== "DONE" && <TreatmentProgressAction key={item.status}
      planId={planId} tooth={item.tooth} status={item.status} subject={`Tooth ${item.tooth}`} />}
  </article>;
}

export function TreatmentCards({ plan, editable }: { plan: TreatmentPlan; editable: boolean }) {
  const specialty = readSpecialtyRecord(plan.specialtyData)?.specialty ?? "";

  return <TreatmentBoard columns={columns.map(({ status, Icon, empty }) => {
    const teeth = plan.teeth.filter((item) => item.status === status);
    const general = !plan.teeth.length && plan.status === status;
    const count = general ? 1 : teeth.length;
    const label = treatmentStatusLabels[status];
    return { status, count, content: <section className={`treatment-lane treatment-lane-${status.toLowerCase()}`} aria-label={label}>
      <header className="treatment-lane-heading">
        <Icon size={16} aria-hidden="true" />
        <div>{label}</div>
        <span aria-label={`${count} ${count === 1 ? "treatment" : "treatments"}`}>{count}</span>
      </header>
      {general && <GeneralTreatmentCard plan={plan} editable={editable} />}
      {teeth.map((item) => <ToothTreatmentCard key={item.tooth} item={item} specialty={specialty} planId={plan.id} editable={editable} />)}
      {!count && <p className="treatment-lane-empty">{empty}</p>}
    </section> };
  })} />;
}

export function TreatmentMatches({ plan, editable, showStatus }: { plan: TreatmentPlan; editable: boolean; showStatus?: boolean }) {
  const specialty = readSpecialtyRecord(plan.specialtyData)?.specialty ?? "";
  return <div className="patient-treatment-results-grid">
    {plan.teeth.length ? plan.teeth.map((item) =>
      <ToothTreatmentCard key={item.tooth} item={item} specialty={specialty} planId={plan.id} editable={editable} showStatus={showStatus} />)
      : <GeneralTreatmentCard plan={plan} editable={editable} showStatus={showStatus} />}
  </div>;
}
