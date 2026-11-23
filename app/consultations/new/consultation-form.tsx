"use client";

import { useActionState, useState } from "react";
import { DentalSpecialtyFields } from "@/components/dental-specialty-fields";
import { Button } from "@/components/ui/button";
import { saveConsultation } from "./actions";

export function ConsultationForm({ patientId, appointments, appointmentId, inPatientRecord = false }: {
  patientId: string; inPatientRecord?: boolean; appointments: { id: string; label: string }[]; appointmentId: string;
}) {
  const [error, action, pending] = useActionState(saveConsultation.bind(null, inPatientRecord), "");
  const [fields, setFields] = useState({ appointmentId, concern: "", findings: "", assessment: "", plan: "" });
  function bind(name: keyof typeof fields) {
    return {
      name, value: fields[name],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const value = event.target.value;
        setFields((current) => ({ ...current, [name]: value }));
      },
    };
  }
  const linkedAppointment = appointments.find(({ id }) => id === appointmentId);

  return <form action={action} className="login-form patient-form">
    <input type="hidden" name="patientId" value={patientId} />
    <fieldset className="consultation-fields" disabled={pending}>
      {linkedAppointment ? <div className="appointment-patient">
        <strong>Appointment</strong><span>{linkedAppointment.label}</span>
        <input type="hidden" name="appointmentId" value={linkedAppointment.id} />
      </div> : <>
      <label htmlFor="consultation-appointment">Appointment (optional)</label>
      <select id="consultation-appointment" {...bind("appointmentId")}>
        <option value="">No appointment</option>
        {appointments.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
      </select>
      </>}
      <label>Reason for visit<input {...bind("concern")} maxLength={200} required /></label>
      <DentalSpecialtyFields mode="consultation" />
      <label>Clinical findings<textarea {...bind("findings")} maxLength={4000} rows={4} /></label>
      <label>Assessment (optional)<textarea {...bind("assessment")} maxLength={4000} rows={3} /></label>
      <label>Plan and follow-up (optional)<textarea {...bind("plan")} maxLength={4000} rows={3} /></label>
    </fieldset>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save consultation"}</Button></div>
  </form>;
}
