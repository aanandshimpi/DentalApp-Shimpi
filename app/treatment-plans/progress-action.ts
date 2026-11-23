"use server";

import { revalidatePath } from "next/cache";
import { advanceTreatment } from "@/lib/treatment-plans";
import { requireViewer } from "@/lib/viewer";

export async function changeTreatmentProgress(_state: string, form: FormData): Promise<string> {
  const result = await advanceTreatment(await requireViewer(), Object.fromEntries(form));
  if ("error" in result) return result.error;
  revalidatePath(`/patients/${result.patientId}`);
  revalidatePath(`/treatment-plans/${result.id}`);
  revalidatePath("/treatment-plans");
  return "";
}
