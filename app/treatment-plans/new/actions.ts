"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTreatmentPlan } from "@/lib/treatment-plans";
import { requireViewer } from "@/lib/viewer";

export async function saveTreatmentPlan(inPatientRecord: boolean, _state: string, form: FormData): Promise<string> {
  const result = await createTreatmentPlan(await requireViewer(), Object.fromEntries(form));
  if ("error" in result) return result.error;
  revalidatePath("/treatment-plans");
  const patientPath = `/patients/${result.patientId}`;
  revalidatePath(patientPath);
  if (inPatientRecord) redirect(`${patientPath}?plan=${result.id}#plan-${result.id}`);
  redirect(`/treatment-plans/${result.id}`);
}
