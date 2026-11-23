import { z } from "zod";
import { db } from "./db";
import { can } from "./permissions";
import { parseClinicalSpecialty } from "./specialty-records";
import { nextTreatmentStatus } from "./treatment-progress";
import { toothNumbers } from "./teeth";
import type { Viewer } from "./session";

export function canManageTreatmentPlans(viewer: Viewer) {
  return can(viewer.roles, "clinical.read") && can(viewer.roles, "treatment.manage");
}

const planFields = z.object({
  patientId: z.uuid(),
  consultationId: z.union([z.literal(""), z.uuid()]),
  title: z.string().trim().min(1).max(160),
  treatment: z.string().trim().max(6000),
  followUp: z.string().trim().max(2000),
});

export async function createTreatmentPlan(viewer: Viewer, fields: Record<string, unknown>): Promise<{ id: string; patientId: string } | { error: string }> {
  if (!canManageTreatmentPlans(viewer)) return { error: "You do not have permission to create treatment plans." };

  const result = planFields.safeParse(fields);
  if (!result.success) return { error: "Select a patient, enter a plan title, and check the field lengths." };

  const { patientId, consultationId, title, treatment, followUp } = result.data;
  const specialty = parseClinicalSpecialty(fields, "treatment");
  if ("error" in specialty) return { error: specialty.error };
  if (!treatment && !specialty.specialtyData.options.length && !specialty.teeth.length) {
    return { error: "Add proposed treatment, select a treatment option, or record a procedure or details for a tooth." };
  }

  const clinicId = viewer.clinic.id;
  return db.$transaction(async (tx) => {
    const patient = await tx.patient.findFirst({
      where: { clinicId, id: patientId, archivedAt: null }, select: { id: true },
    });
    if (!patient) return { error: "Select an active patient from this clinic." };

    if (consultationId) {
      const consultation = await tx.consultation.findFirst({
        where: { clinicId, id: consultationId, patientId }, select: { id: true },
      });
      if (!consultation) return { error: "Select a consultation for this patient in your clinic." };
    }

    return tx.treatmentPlan.create({
      data: {
        clinicId, patientId, consultationId: consultationId || null, authorId: viewer.id,
        title, treatment, followUp: followUp || null,
        specialtyData: specialty.specialtyData,
        teeth: { create: specialty.teeth },
      },
      select: { id: true, patientId: true },
    });
  });
}

const progressFields = z.object({
  id: z.uuid(),
  expected: z.enum(["PLANNED", "IN_PROGRESS"]),
  tooth: z.string().refine((tooth) => toothNumbers.has(tooth)).optional(),
});

export async function advanceTreatment(viewer: Viewer, fields: Record<string, unknown>): Promise<
  { patientId: string; id: string } | { error: string }
> {
  if (!canManageTreatmentPlans(viewer)) return { error: "You do not have permission to update treatment progress." };
  const parsed = progressFields.safeParse(fields);
  if (!parsed.success) return { error: "Invalid treatment update. Refresh the patient record." };
  const { id, expected, tooth } = parsed.data;
  const clinicId = viewer.clinic.id;
  const status = nextTreatmentStatus[expected].status;
  const plan = await db.treatmentPlan.findFirst({
    where: { id, clinicId, patient: { archivedAt: null } },
    select: { patientId: true },
  });
  if (!plan) return { error: "This treatment is unavailable." };

  const updated = tooth
    ? await db.treatmentPlanTooth.updateMany({
      where: { planId: id, tooth, status: expected, plan: { clinicId, patient: { archivedAt: null } } },
      data: { status },
    })
    : await db.treatmentPlan.updateMany({
      where: { id, clinicId, status: expected, teeth: { none: {} }, patient: { archivedAt: null } },
      data: { status },
    });
  return updated.count ? { id, patientId: plan.patientId } : { error: "This treatment has changed. Refresh the patient record." };
}
