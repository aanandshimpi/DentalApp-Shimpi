import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, ClipboardPlus, Search, Stethoscope } from "lucide-react";
import { ConsultationForm } from "@/app/consultations/new/consultation-form";
import { TreatmentPlanForm } from "@/app/treatment-plans/new/treatment-plan-form";
import { DentalSpecialtyRecord, SavedToothDetails } from "@/components/dental-specialty-record";
import { TreatmentCards, TreatmentMatches, TreatmentStatusBadge, type TreatmentTooth } from "@/components/treatment-cards";
import type { TreatmentStatus } from "@/generated/prisma/enums";
import { PatientProfile, PatientTreatmentOverview } from "@/components/patient-overview";
import { RecordPicker } from "@/components/record-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { consultationDateTime } from "@/lib/consultations";
import { db } from "@/lib/db";
import { getDentalSpecialty, procedureLabel } from "@/lib/dental-specialties";
import { can } from "@/lib/permissions";
import { readSpecialtyRecord } from "@/lib/specialty-records";
import { countTreatments, treatmentPlanStatus, treatmentStatusLabels, treatmentToothSelect } from "@/lib/treatment-progress";
import { canManageTreatmentPlans } from "@/lib/treatment-plans";
import { requireViewer } from "@/lib/viewer";

const toothSelect = { tooth: true, details: true, diagnosis: true, surfaces: true } as const;
const recentFirst = [{ createdAt: "desc" }, { id: "desc" }] as const;

function specialtyLabel(data: unknown) {
  const specialty = readSpecialtyRecord(data)?.specialty;
  return specialty ? getDentalSpecialty(specialty)?.label : undefined;
}

function PlanDetails({ plan, format, editable }: {
  plan: {
    id: string; title: string; treatment: string; specialtyData: unknown; followUp: string | null; createdAt: Date;
    status: TreatmentStatus; teeth: TreatmentTooth[];
  };
  format: (date: Date) => string; editable: boolean;
}) {
  return <div className="patient-selected-plan" id={`plan-${plan.id}`}>
    <div className="patient-selected-plan-header">
      <div><h4>{plan.title}</h4><p>{format(plan.createdAt)}</p></div>
      <TreatmentStatusBadge status={treatmentPlanStatus(plan.status, plan.teeth)} />
    </div>
    <TreatmentCards key={plan.id} plan={plan} editable={editable} />
    {(plan.specialtyData != null || (plan.teeth.length > 0 && (plan.treatment || plan.followUp))) &&
      <details className="patient-plan-notes">
        <summary>Plan notes</summary>
        <dl className="consultation-record">
          <DentalSpecialtyRecord data={plan.specialtyData} mode="treatment" />
          {plan.teeth.length > 0 && plan.treatment && <div><dt>Proposed treatment</dt><dd>{plan.treatment}</dd></div>}
          {plan.teeth.length > 0 && plan.followUp && <div><dt>Follow-up instructions</dt><dd>{plan.followUp}</dd></div>}
        </dl>
      </details>}
  </div>;
}

export default async function PatientRecordPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ add?: string; visit?: string; plan?: string; tab?: string; status?: string | string[]; q?: string | string[] }>;
}) {
  const viewer = await requireViewer();
  if (!can(viewer.roles, "patient.read")) notFound();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const clinicId = viewer.clinic.id;
  const patient = await db.patient.findFirst({
    where: { clinicId, id },
    select: { id: true, name: true, number: true, phone: true, archivedAt: true },
  });
  if (!patient) notFound();
  const patientPath = `/patients/${patient.id}`;
  const clinical = can(viewer.roles, "clinical.read");
  const treatment = canManageTreatmentPlans(viewer);
  const addConsultation = clinical && can(viewer.roles, "encounter.create") && !patient.archivedAt;
  const addPlan = treatment && !patient.archivedAt;
  const query = await searchParams;
  const showConsultForm = addConsultation && query.add === "consultation";
  const showPlanForm = addPlan && query.add === "plan";
  const statusView = treatment && !showConsultForm && !showPlanForm
    ? z.enum(["ALL", "PLANNED", "IN_PROGRESS", "DONE"]).safeParse(query.status).data : undefined;
  const statusFilter = statusView === "ALL" ? undefined : statusView;
  const treatmentQuery = statusView === "ALL" && typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const format = (date: Date) => consultationDateTime(date, viewer.clinic.timezone);
  const [visits, plans, appointments] = await Promise.all([
    clinical ? db.consultation.findMany({
      where: { clinicId, patientId: id }, orderBy: [...recentFirst],
      select: { id: true, concern: true, createdAt: true },
    }) : [],
    treatment ? db.treatmentPlan.findMany({
      where: { clinicId, patientId: id }, orderBy: [...recentFirst],
      select: { id: true, consultationId: true, title: true, status: true, teeth: { select: { status: true } } },
    }) : [],
    showConsultForm ? db.appointment.findMany({
      where: { clinicId, patientId: id, consultation: null, status: { not: "CANCELLED" } },
      orderBy: [{ startsAt: "desc" }, { id: "desc" }],
      select: { id: true, startsAt: true, doctor: { select: { user: { select: { name: true } } } } },
    }) : [],
  ]);

  const requestedPlan = plans.find((plan) => plan.id === query.plan);
  const standaloneCount = plans.filter((plan) => plan.consultationId === null).length;
  const standalone = requestedPlan?.consultationId === null || query.visit === "standalone" || !visits.length;
  const selectedVisit = standalone ? undefined : visits.find((visit) =>
    visit.id === (requestedPlan?.consultationId ?? query.visit)) ?? visits[0];
  const linkedPlans = plans.filter((plan) => plan.consultationId === (selectedVisit?.id ?? null));
  const selectedPlan = requestedPlan && linkedPlans.includes(requestedPlan) ? requestedPlan : linkedPlans[0];
  const treatmentTab = !selectedVisit || Boolean(requestedPlan) || query.tab === "treatment";
  const formVisit = showPlanForm && query.visit && query.visit !== "standalone"
    ? visits.find((visit) => visit.id === query.visit) : undefined;
  if (showPlanForm && query.visit && query.visit !== "standalone" && !formVisit) notFound();
  const [checkup, planRecord, formContext, statusMatches] = await Promise.all([
    selectedVisit && !treatmentTab && !statusView && !showConsultForm && !showPlanForm ? db.consultation.findFirst({
      where: { clinicId, patientId: id, id: selectedVisit.id },
      select: {
        id: true, concern: true, findings: true, assessment: true, plan: true, specialtyData: true, createdAt: true,
        author: { select: { name: true } },
        appointment: { select: { startsAt: true, status: true } },
        teeth: { select: toothSelect, orderBy: { tooth: "asc" } },
      },
    }) : null,
    selectedPlan && treatmentTab && !statusView && !showConsultForm && !showPlanForm ? db.treatmentPlan.findFirst({
      where: { clinicId, patientId: id, id: selectedPlan.id },
      select: {
        id: true, title: true, treatment: true, followUp: true, specialtyData: true, createdAt: true, status: true,
        teeth: { select: treatmentToothSelect, orderBy: { tooth: "asc" } },
      },
    }) : null,
    formVisit ? db.consultation.findFirst({
      where: { clinicId, patientId: id, id: formVisit.id },
      select: { specialtyData: true, teeth: { select: { tooth: true }, orderBy: { tooth: "asc" } } },
    }) : null,
    statusView ? db.treatmentPlan.findMany({
      where: {
        clinicId, patientId: id, OR: statusFilter ? [
          { teeth: { some: { status: statusFilter } } },
          { status: statusFilter, teeth: { none: {} } },
        ] : undefined,
      },
      orderBy: [...recentFirst],
      select: {
        id: true, title: true, treatment: true, followUp: true, specialtyData: true, createdAt: true, status: true,
        consultation: { select: { concern: true, createdAt: true } },
        teeth: { where: { status: statusFilter }, select: treatmentToothSelect, orderBy: { tooth: "asc" } },
      },
    }) : [],
  ]);

  const terms = treatmentQuery.toLowerCase().split(/\s+/);
  const visibleTreatments = treatmentQuery ? statusMatches.flatMap((plan) => {
    const specialty = readSpecialtyRecord(plan.specialtyData);
    const label = (option: string) => procedureLabel(specialty?.specialty ?? "", option);
    const matches = (values: (string | null)[], tooth?: string) => {
      const text = values.join(" ").toLowerCase();
      return terms.every((term) => /^\d{1,2}$/.test(term)
        ? Boolean(tooth?.startsWith(term))
        : text.includes(term));
    };
    if (!plan.teeth.length) {
      return matches([plan.title, plan.treatment, ...(specialty?.options.map(label) ?? [])]) ? [plan] : [];
    }
    const teeth = plan.teeth.filter((tooth) =>
      matches([plan.title, tooth.procedure ? label(tooth.procedure) : null, tooth.suggestedTreatment], tooth.tooth));
    return teeth.length ? [{ ...plan, teeth }] : [];
  }) : statusMatches;

  function careUrl(visit: string, tab?: "treatment", plan?: string) {
    const search = new URLSearchParams({ visit });
    if (tab) search.set("tab", tab);
    if (plan) search.set("plan", plan);
    return `${patientPath}?${search}`;
  }

  const visitKey = selectedVisit?.id ?? "standalone";
  const visitOption = (visit: (typeof visits)[number]) => ({
    id: visit.id, label: `${format(visit.createdAt)} · ${visit.concern}`,
  });
  const visitOptions = visits.map((visit) => ({
    href: careUrl(visit.id, treatmentTab ? "treatment" : undefined), label: visitOption(visit).label,
  }));
  if (standaloneCount || visitKey === "standalone") {
    visitOptions.push({ href: careUrl("standalone", treatmentTab ? "treatment" : undefined), label: "Plans without a checkup" });
  }
  const currentCareUrl = careUrl(visitKey, treatmentTab ? "treatment" : undefined, treatmentTab ? selectedPlan?.id : undefined);
  const searchContext = new URLSearchParams({ visit: visitKey, status: "ALL" });
  if (treatmentTab) searchContext.set("tab", "treatment");
  if (treatmentTab && selectedPlan) searchContext.set("plan", selectedPlan.id);
  const addPlanUrl = `${currentCareUrl}&add=plan#patient-form`;

  return <div className="patient-record">
    <Link href="/patients" className="patient-back"><ArrowLeft size={15} aria-hidden="true" /> Patient directory</Link>
    <PatientProfile patient={patient} checkupCount={clinical ? visits.length : undefined}
      lastCheckup={visits[0] && new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: viewer.clinic.timezone }).format(visits[0].createdAt)}>
      {addConsultation && <Link className={buttonVariants()} href={`${patientPath}?add=consultation#patient-form`}>
        <Stethoscope size={16} /> New Checkup
      </Link>}
      {addPlan && !visits.length && !plans.length && <Link className={buttonVariants({ variant: "outline" })} href={addPlanUrl}>
        <ClipboardPlus size={16} /> Create Treatment Plan
      </Link>}
    </PatientProfile>
    {treatment && !showConsultForm && !showPlanForm && <PatientTreatmentOverview counts={countTreatments(plans)}
      planCount={plans.length} activeStatus={statusView}
      statusHref={(status) => `${currentCareUrl}&status=${status}`} />}

    {statusView && <section id="patient-treatments" className="patient-care-history" aria-labelledby="patient-status-heading">
      <div className="patient-section-heading">
        <h3 id="patient-status-heading">{statusFilter ? `${treatmentStatusLabels[statusFilter]} treatments` : "All treatments"}</h3>
        <Link href={currentCareUrl} scroll={false} className="appointment-manage">Back to care history</Link>
      </div>
      {statusView === "ALL" && <form action={patientPath} className="patient-treatment-search">
        {[...searchContext].map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        <label>
          <Search size={16} aria-hidden="true" />
          <input type="search" name="q" aria-label="Search treatments" placeholder="Search tooth number or treatment name"
            defaultValue={treatmentQuery} key={treatmentQuery} maxLength={100} />
        </label>
        <Button type="submit" variant="outline">Search</Button>
        {treatmentQuery && <Link href={`${currentCareUrl}&status=ALL`} scroll={false} className="appointment-manage">Clear</Link>}
      </form>}
      {!visibleTreatments.length && <Card><p className="empty">{treatmentQuery ? "No treatments match your search."
        : statusFilter ? "No treatments with this status." : "No treatments recorded."}</p></Card>}
      {visibleTreatments.map((plan) => <Card key={plan.id} className="patient-status-plan">
        <div className="patient-selected-plan-header">
          <div>
            <h4><Link className="appointment-manage" href={`${patientPath}?plan=${plan.id}#plan-${plan.id}`}>{plan.title}</Link></h4>
            <p>{plan.consultation ? `${plan.consultation.concern} · ${format(plan.consultation.createdAt)}`
              : `Plan without a checkup · ${format(plan.createdAt)}`}</p>
          </div>
          {statusFilter && <TreatmentStatusBadge status={statusFilter} />}
        </div>
        <TreatmentMatches plan={plan} editable={addPlan} showStatus={statusView === "ALL"} />
      </Card>)}
    </section>}

    {(showConsultForm || showPlanForm) && <Card className="consultation-panel" id="patient-form">
      <div className="panel-heading">
        <h3>{showConsultForm ? "New checkup" : "New treatment plan"}</h3>
        <Link href={currentCareUrl} className="appointment-manage">Close form</Link>
      </div>
      {showConsultForm ? <ConsultationForm patientId={id} appointmentId="" inPatientRecord
        appointments={appointments.map(({ id, startsAt, doctor }) => ({ id, label: `${format(startsAt)} · ${doctor.user.name}` }))} />
        : <TreatmentPlanForm key={formVisit?.id ?? "standalone"} patientId={id} inPatientRecord
          linked={formVisit ? visitOption(formVisit) : undefined}
          consultations={formVisit ? [] : visits.map(visitOption)}
          initialSpecialty={readSpecialtyRecord(formContext?.specialtyData)?.specialty}
          referenceTeeth={formContext?.teeth.map(({ tooth }) => tooth)} />}
    </Card>}

    {clinical && !statusView && !showConsultForm && !showPlanForm && <section aria-labelledby="care-history" className="patient-care-history">
      <div className="patient-section-heading"><h3 id="care-history">Care history</h3></div>
      {!visits.length && !plans.length ? <Card><p className="empty">No checkups or treatment plans recorded.</p></Card>
        : <Card className="patient-care-panel" id={selectedVisit ? `visit-${selectedVisit.id}` : undefined}>
          <div className="patient-care-controls">
            <RecordPicker label="Checkup or plan history" selected={careUrl(visitKey, treatmentTab ? "treatment" : undefined)} options={visitOptions} />
            {selectedVisit && <nav aria-label="Checkup views" className="patient-care-tabs">
              <Link href={careUrl(visitKey)} scroll={false} aria-current={treatmentTab ? undefined : "page"}>Checkup</Link>
              <Link href={careUrl(visitKey, "treatment")} scroll={false} aria-current={treatmentTab ? "page" : undefined}>
                Treatment plans <span>{linkedPlans.length}</span>
              </Link>
            </nav>}
          </div>
          {treatmentTab ? <>
            <div className="patient-treatment-controls">
              {linkedPlans.length > 1 && <RecordPicker label="Treatment plan"
                selected={careUrl(visitKey, "treatment", selectedPlan?.id)}
                options={linkedPlans.map((plan) => ({
                  href: careUrl(visitKey, "treatment", plan.id), label: plan.title,
                }))} />}
              {addPlan && <Link className={buttonVariants({ variant: "outline" })} href={addPlanUrl}>
                {selectedVisit ? "Plan treatment" : "Create Treatment Plan"}
              </Link>}
            </div>
            {planRecord ? <PlanDetails plan={planRecord} format={format} editable={addPlan} />
              : <p className="empty">{selectedVisit ? "No treatment plans for this checkup." : "No treatment plans without a checkup."}</p>}
          </> : checkup && <>
            <div className="patient-visit-header">
              <div>
                <h4>{checkup.concern}</h4>
                <p>{[format(checkup.createdAt), checkup.author.name, specialtyLabel(checkup.specialtyData)].filter(Boolean).join(" · ")}</p>
                {checkup.appointment && <p>Appointment {format(checkup.appointment.startsAt)}
                  {checkup.appointment.status === "CANCELLED" && " · Cancelled"}</p>}
              </div>
              {addPlan && <Link className={buttonVariants({ variant: "outline" })} href={addPlanUrl}>Plan treatment</Link>}
            </div>
            <dl className="consultation-record">
              <DentalSpecialtyRecord data={checkup.specialtyData} mode="consultation" />
              {checkup.findings && <div><dt>Clinical findings</dt><dd>{checkup.findings}</dd></div>}
              {checkup.assessment && <div><dt>Assessment</dt><dd>{checkup.assessment}</dd></div>}
              {checkup.plan && <div><dt>Plan and follow-up</dt><dd>{checkup.plan}</dd></div>}
            </dl>
            <SavedToothDetails data={checkup.specialtyData} teeth={checkup.teeth} heading="Tooth findings" />
          </>}
        </Card>}
    </section>}
  </div>;
}
