import { getDentalSpecialty, procedureLabel, specialtyFields, type SpecialtyFormMode } from "@/lib/dental-specialties";
import { toothSurfaces } from "@/lib/teeth";
import { ToothModel } from "./tooth-model";
import { readSpecialtyRecord } from "@/lib/specialty-records";

export function DentalSpecialtyRecord({ data, mode }: { data: unknown; mode: SpecialtyFormMode }) {
  const record = readSpecialtyRecord(data);
  if (!record) return null;
  const template = getDentalSpecialty(record.specialty);
  const fields = template ? specialtyFields(template, mode) : [];

  return <>
    <div><dt>Dental specialty</dt><dd>{template?.label ?? record.specialty}</dd></div>
    {Object.entries(record.fields).map(([id, value]) => <div key={id}>
      <dt>{fields.find((field) => field.id === id)?.label ?? id}</dt><dd>{value}</dd>
    </div>)}
    {record.options.length > 0 && <div>
      <dt>{mode === "consultation" ? "Treatment options discussed" : "Planned treatment options"}</dt>
      <dd><ul className="record-options">{record.options.map((option) => <li key={option}>{procedureLabel(record.specialty, option)}</li>)}</ul></dd>
    </div>}
  </>;
}

export function SavedToothDetails({ teeth, data, heading }: {
  teeth: { tooth: string; details: string; procedure?: string | null; diagnosis?: string | null; suggestedTreatment?: string | null; surfaces?: string[] }[];
  data: unknown;
  heading: string;
}) {
  if (!teeth.length) return null;
  const record = readSpecialtyRecord(data);
  return <section className="saved-tooth-notes" aria-label={heading}>
    <h3>{heading}</h3>
    <dl className="consultation-record">
      {teeth.map(({ tooth, details, procedure, diagnosis, suggestedTreatment, surfaces }) => <div key={tooth}>
        <dt className="saved-tooth-label"><ToothModel tooth={tooth} /> Tooth {tooth}</dt>
        {surfaces?.length ? <dd><strong>Surfaces</strong> {surfaces.map((surface) => toothSurfaces[surface as keyof typeof toothSurfaces] ?? surface).join(", ")}</dd> : null}
        {details && <dd><strong>Examination</strong> {details}</dd>}
        {diagnosis && <dd><strong>Diagnosis</strong> {diagnosis}</dd>}
        {procedure && <dd><strong>Procedure</strong> {procedureLabel(record?.specialty ?? "", procedure)}</dd>}
        {suggestedTreatment && <dd><strong>Suggested treatment</strong> {suggestedTreatment}</dd>}
      </div>)}
    </dl>
  </section>;
}
