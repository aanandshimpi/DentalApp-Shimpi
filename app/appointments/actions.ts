"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { advanceAppointment, bookAppointment, cancelAppointment, rescheduleAppointment } from "@/lib/appointments";
import { requireViewer } from "@/lib/viewer";

function returnToSchedule(day: string, form: FormData, change?: "rescheduled" | "cancelled"): never {
  revalidatePath("/dashboard");
  revalidatePath("/appointments");
  const query = new URLSearchParams({ date: day });
  if (form.get("view") === "calendar") query.set("view", "calendar");
  if (change) query.set("change", change);
  redirect(`/appointments?${query}`);
}

export async function saveAppointment(_state: string, form: FormData) {
  const result = await bookAppointment(await requireViewer(), Object.fromEntries(form));
  if ("error" in result) return result.error;
  returnToSchedule(result.day, form);
}

export async function updateAppointment(_state: string, form: FormData) {
  const result = await rescheduleAppointment(await requireViewer(), Object.fromEntries(form));
  if ("error" in result) return result.error;
  returnToSchedule(result.day, form, "rescheduled");
}

export async function removeAppointment(_state: string, form: FormData) {
  const result = await cancelAppointment(await requireViewer(), Object.fromEntries(form));
  if ("error" in result) return result.error;
  returnToSchedule(result.day, form, "cancelled");
}

export async function updateAppointmentStatus(_state: string, form: FormData): Promise<string> {
  const result = await advanceAppointment(await requireViewer(), Object.fromEntries(form));
  if ("error" in result) return result.error;
  revalidatePath("/dashboard");
  revalidatePath("/appointments");
  return "";
}
