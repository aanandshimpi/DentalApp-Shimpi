"use client";

import { useActionState } from "react";
import { changeTreatmentProgress } from "@/app/treatment-plans/progress-action";
import { nextTreatmentStatus } from "@/lib/treatment-progress";
import { Button } from "./ui/button";

export function TreatmentProgressAction({ planId, tooth, status, subject }: {
  planId: string; tooth?: string; status: keyof typeof nextTreatmentStatus; subject: string;
}) {
  const [error, action, pending] = useActionState(changeTreatmentProgress, "");
  const { action: label } = nextTreatmentStatus[status];
  return <form className="treatment-progress-action" action={action}>
    <input type="hidden" name="id" value={planId} />
    <input type="hidden" name="expected" value={status} />
    {tooth && <input type="hidden" name="tooth" value={tooth} />}
    <Button type="submit" variant="outline" aria-label={`${label}: ${subject}`} disabled={pending}>
      {pending ? "Updating…" : label}
    </Button>
    {error && <p role="alert">{error}</p>}
  </form>;
}
