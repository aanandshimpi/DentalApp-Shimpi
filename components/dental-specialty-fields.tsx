"use client";

import { useId, useState } from "react";
import {
  defaultDentalSpecialty, dentalSpecialties, getDentalSpecialty, maxSpecialtyFieldLength,
  specialtyFields, type SpecialtyFormMode,
} from "@/lib/dental-specialties";
import { toothNumbers } from "@/lib/teeth";
import { Button } from "./ui/button";
import { ToothChart, type ToothDetails } from "./tooth-chart";

type Draft = {
  fields: Record<string, string>;
  options: string[];
  teeth: ToothDetails[];
};

const emptyDraft: Draft = { fields: {}, options: [], teeth: [] };

export function DentalSpecialtyFields({ mode, initialSpecialty, referenceTeeth = [] }: {
  mode: SpecialtyFormMode; initialSpecialty?: string; referenceTeeth?: string[];
}) {
  const [specialty, setSpecialty] = useState(initialSpecialty && getDentalSpecialty(initialSpecialty)
    ? initialSpecialty : defaultDentalSpecialty);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const fieldId = useId();
  const draft = drafts[specialty] ?? emptyDraft;
  const template = dentalSpecialties[specialty];

  function updateDraft(update: (previous: Draft) => Draft) {
    setDrafts((previous) => ({ ...previous, [specialty]: update(previous[specialty] ?? emptyDraft) }));
  }

  const reference = referenceTeeth.filter((tooth) => toothNumbers.has(tooth));
  const unselected = reference.filter((tooth) => !draft.teeth.some((entry) => entry.tooth === tooth));
  const consultation = mode === "consultation";
  return <section className="dental-specialty-fields" aria-label="Specialty documentation">
    <label htmlFor={`${fieldId}-specialty`}>Dental specialty</label>
    <select id={`${fieldId}-specialty`} value={specialty} onChange={(event) => setSpecialty(event.target.value)}>
      {Object.entries(dentalSpecialties).map(([id, { label }]) => <option key={id} value={id}>{label}</option>)}
    </select>
    <p className="empty specialty-help">Only entries for the selected specialty are saved.</p>
    <fieldset className="specialty-group">
      <legend>{consultation ? "Specialty findings" : "Specialty planning details"}</legend>
      {specialtyFields(template, mode).map(({ id, label }) => <div className="specialty-field" key={id}>
        <label htmlFor={`${fieldId}-${id}`}>{label}</label>
        <textarea id={`${fieldId}-${id}`} rows={2} maxLength={maxSpecialtyFieldLength} value={draft.fields[id] ?? ""}
          onChange={(event) => {
            const value = event.target.value;
            updateDraft((previous) => ({ ...previous, fields: { ...previous.fields, [id]: value } }));
          }} />
      </div>)}
    </fieldset>
    <fieldset className="specialty-group">
      <legend>{consultation ? "Treatment options discussed" : "Planned treatment options"}</legend>
      <div className="specialty-options">
        {template.options.map(({ id, label }) => <label key={id}>
          <input type="checkbox" checked={draft.options.includes(id)} onChange={(event) => {
            const checked = event.target.checked;
            updateDraft((previous) => ({
              ...previous, options: checked ? [...previous.options, id] : previous.options.filter((option) => option !== id),
            }));
          }} />
          {label}
        </label>)}
      </div>
    </fieldset>
    <input type="hidden" name="specialtyData" value={JSON.stringify({ specialty, fields: draft.fields, options: draft.options })} />
    {reference.length > 0 && <div className="specialty-reference">
      <span>Teeth noted during the checkup: {reference.join(", ")}</span>
      {unselected.length > 0 && <Button type="button" variant="outline" onClick={() => {
        updateDraft((previous) => ({
          ...previous, teeth: [...previous.teeth, ...unselected.map((tooth) => ({ tooth, details: "" }))],
        }));
      }}>Use checkup teeth</Button>}
    </div>}
    <ToothChart selected={draft.teeth} findings={consultation} referenceTeeth={reference}
      procedures={consultation ? [] : template.options.filter(({ tooth }) => tooth)}
      onChange={(teeth) => updateDraft((previous) => ({ ...previous, teeth }))} />
  </section>;
}
