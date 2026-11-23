"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";

const registration = z.object({
  name: z.string().trim().min(1, "Enter a patient name.").max(100),
  number: z.string().trim().min(1, "Enter a patient number.").max(32),
  phone: z.string().trim().max(30),
});

export async function registerPatient(_state: string, form: FormData) {
  const viewer = await requireViewer();
  if (!can(viewer.roles, "patient.write")) return "You do not have permission to register patients.";

  const parsed = registration.safeParse({
    name: form.get("name"), number: form.get("number"), phone: form.get("phone"),
  });
  if (!parsed.success) return parsed.error.issues[0].message;

  const { name, number, phone } = parsed.data;
  let patientId: string;
  try {
    const patient = await db.patient.create({
      data: { clinicId: viewer.clinic.id, name, number, phone: phone || null },
      select: { id: true },
    });
    patientId = patient.id;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return "This patient number is already in use at your clinic.";
    }
    throw error;
  }

  redirect(`/patients/${patientId}`);
}
