"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { removeAppointment } from "../actions";

export function CancelAppointmentForm({ id, revision, calendar }: { id: string; revision: number; calendar: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const [error, action, pending] = useActionState(removeAppointment, "");

  return <div className="appointment-cancellation">
    {confirming ? <form action={action} className="login-form">
      {calendar && <input type="hidden" name="view" value="calendar" />}
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      <p>The appointment will be marked cancelled and its time slot will become available.</p>
      {error && <p className="login-error" role="alert">{error}</p>}
      <div className="patient-form-actions">
        <Button className="cancel-appointment" type="submit" disabled={pending}>
          {pending ? "Cancelling…" : "Confirm cancellation"}
        </Button>
        <Button variant="outline" type="button" disabled={pending} onClick={() => setConfirming(false)}>Keep appointment</Button>
      </div>
    </form> : <Button className="cancel-appointment" variant="outline" type="button" onClick={() => setConfirming(true)}>
      Cancel appointment
    </Button>}
  </div>;
}
