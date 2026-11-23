"use client";

import { useActionState, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { DentalSpecialtyFields } from "@/components/dental-specialty-fields";
import { saveTreatmentPlan } from "./actions";

type ConsultationOption = { id: string; label: string };

export function TreatmentPlanForm({ patientId, linked, consultations, initialSpecialty, referenceTeeth, inPatientRecord = false }: {
  patientId: string; inPatientRecord?: boolean; linked?: ConsultationOption; consultations: ConsultationOption[]; initialSpecialty?: string; referenceTeeth?: string[];
}) {
  const [error, action, pending] = useActionState(saveTreatmentPlan.bind(null, inPatientRecord), "");
  const [fields, setFields] = useState({ consultationId: "", title: "", treatment: "", followUp: "" });

  function bind(name: keyof typeof fields) {
    return {
      name, value: fields[name],
      onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setFields((current) => ({ ...current, [name]: value }));
      },
    };
  }

  return <form action={action} className="login-form patient-form">
    <input type="hidden" name="patientId" value={patientId} />
    <fieldset className="consultation-fields" disabled={pending}>
      {linked ? <div className="appointment-patient">
        <strong>Consultation</strong><span>{linked.label}</span>
        <input type="hidden" name="consultationId" value={linked.id} />
      </div> : <>
        <label htmlFor="treatment-consultation">Consultation (optional)</label>
        <select id="treatment-consultation" {...bind("consultationId")}>
          <option value="">No consultation</option>
          {consultations.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
        </select>
      </>}
      <label>Plan title<input {...bind("title")} maxLength={160} required /></label>
      <DentalSpecialtyFields mode="treatment" initialSpecialty={initialSpecialty} referenceTeeth={referenceTeeth} />
      <label>Proposed treatment<textarea {...bind("treatment")} maxLength={6000} rows={4}
        placeholder="Add general treatment notes if needed" /></label>
      <label>Follow-up instructions (optional)<textarea {...bind("followUp")} maxLength={2000} rows={3} /></label>
    </fieldset>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save treatment plan"}</Button></div>
  </form>;
}
