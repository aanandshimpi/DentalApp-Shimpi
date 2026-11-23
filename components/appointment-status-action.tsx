"use client";

import { useActionState } from "react";
import { updateAppointmentStatus } from "@/app/appointments/actions";

export function AppointmentStatusAction({ id, revision, action, patient }: {
  id: string; revision: number; action: string; patient: string;
}) {
  const [error, submit, pending] = useActionState(updateAppointmentStatus, "");

  return <form action={submit} className="status-action">
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="revision" value={revision} />
    <button type="submit" aria-label={`${action} for ${patient}`} disabled={pending}>
      {pending ? "Updating…" : action}
    </button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
