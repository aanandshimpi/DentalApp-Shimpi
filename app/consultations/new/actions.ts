"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { recordConsultation } from "@/lib/consultations";
import { requireViewer } from "@/lib/viewer";

export async function saveConsultation(inPatientRecord: boolean, _state: string, form: FormData): Promise<string> {
  const result = await recordConsultation(await requireViewer(), Object.fromEntries(form));
  if ("error" in result) return result.error;
  revalidatePath("/consultations");
  const patientPath = `/patients/${result.patientId}`;
  revalidatePath(patientPath);
  if (inPatientRecord) redirect(`${patientPath}?visit=${result.id}#visit-${result.id}`);
  redirect(`/consultations/${result.id}`);
}
