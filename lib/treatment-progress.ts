import type { TreatmentStatus } from "../generated/prisma/enums";

export const treatmentStatusLabels = {
  PLANNED: "Planned",
  IN_PROGRESS: "In progress",
  DONE: "Done",
} satisfies Record<TreatmentStatus, string>;

export const nextTreatmentStatus = {
  PLANNED: { status: "IN_PROGRESS", action: "Start treatment" },
  IN_PROGRESS: { status: "DONE", action: "Mark done" },
} as const;

export function treatmentPlanStatus(status: TreatmentStatus, teeth: { status: TreatmentStatus }[]): TreatmentStatus {
  if (!teeth.length) return status;
  if (teeth.every((tooth) => tooth.status === "DONE")) return "DONE";
  return teeth.every((tooth) => tooth.status === "PLANNED") ? "PLANNED" : "IN_PROGRESS";
}

export function countTreatments(plans: { status: TreatmentStatus; teeth: { status: TreatmentStatus }[] }[]) {
  const counts: Record<TreatmentStatus, number> = { PLANNED: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const plan of plans) {
    if (plan.teeth.length) {
      for (const tooth of plan.teeth) counts[tooth.status]++;
    } else {
      counts[plan.status]++;
    }
  }
  return counts;
}

export const treatmentToothSelect = {
  tooth: true, details: true, procedure: true, diagnosis: true, suggestedTreatment: true, surfaces: true, status: true,
} as const;
