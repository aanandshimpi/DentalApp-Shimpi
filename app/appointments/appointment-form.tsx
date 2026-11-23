"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { saveAppointment, updateAppointment } from "./actions";

type Option = { id: string; name: string };

type Edit = {
  id: string; revision: number; patient: string; doctorId: string; chairId: string;
  time: string; duration: string;
};

export function AppointmentForm({ day, timezone, patients, doctors, chairs, edit, calendar = false }: {
  day: string; timezone: string; patients?: Option[]; doctors: Option[]; chairs: Option[]; edit?: Edit; calendar?: boolean;
}) {
  const [error, action, pending] = useActionState(edit ? updateAppointment : saveAppointment, "");
  const [fields, setFields] = useState({
    patientId: "", doctorId: edit?.doctorId ?? "", chairId: edit?.chairId ?? "", day,
    time: edit?.time ?? "", duration: edit?.duration ?? "30", reason: "",
  });
  function bind(name: keyof typeof fields) {
    return {
      name, value: fields[name],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const value = event.target.value;
        setFields((current) => ({ ...current, [name]: value }));
      },
    };
  }

  return <form action={action} className="login-form patient-form appointment-form">
    {calendar && <input type="hidden" name="view" value="calendar" />}
    {edit ? <>
      <input type="hidden" name="id" value={edit.id} />
      <input type="hidden" name="revision" value={edit.revision} />
      <div className="appointment-patient"><strong>Patient</strong><span>{edit.patient}</span></div>
    </> : <label><span id="appointment-patient">Patient</span><select aria-labelledby="appointment-patient" required {...bind("patientId")}>
      <option value="">Select a patient</option>
      {patients?.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
    </select></label>}
    <label><span id="appointment-doctor">Doctor</span><select aria-labelledby="appointment-doctor" required {...bind("doctorId")}>
      <option value="">Select a doctor</option>
      {doctors.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
    </select></label>
    <label><span id="appointment-chair">Chair (optional)</span><select aria-labelledby="appointment-chair" {...bind("chairId")}>
      <option value="">No chair assigned</option>
      {chairs.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
    </select></label>
    <p id="appointment-timezone">Clinic time zone: {timezone}</p>
    <div className="appointment-time-fields">
      <label>Date<input type="date" required aria-describedby="appointment-timezone" {...bind("day")} /></label>
      <label>Start time<input type="time" required aria-describedby="appointment-timezone" {...bind("time")} /></label>
    </div>
    <label>Duration (minutes)<input type="number" min={5} max={480} required {...bind("duration")} /></label>
    {!edit && <label>Reason for visit<input required maxLength={200} {...bind("reason")} /></label>}
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="patient-form-actions">
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : edit ? "Save changes" : "Book appointment"}</Button>
      <Link href={{ pathname: "/appointments", query: { date: day, view: calendar ? "calendar" : undefined } }}
        className={buttonVariants({ variant: "outline" })}>{edit ? "Back to schedule" : "Cancel"}</Link>
    </div>
  </form>;
}
