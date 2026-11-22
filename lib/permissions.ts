import type { Role } from "../generated/prisma/enums";

export type Permission = "dashboard.read" | "clinical.read" | "finance.read" | "patient.read" |
  "patient.write" | "appointment.manage" | "encounter.create" | "treatment.manage" |
  "document.read" | "reports.read" | "user.manage";

const grants: Record<Role, readonly Permission[]> = {
  DENTIST: ["dashboard.read", "clinical.read", "patient.read", "patient.write", "appointment.manage", "encounter.create", "treatment.manage", "document.read"],
  RECEPTIONIST: ["dashboard.read", "finance.read", "patient.read", "patient.write", "appointment.manage"],
  ASSISTANT: ["dashboard.read", "patient.read"],
  ADMIN: ["dashboard.read", "finance.read", "patient.read", "appointment.manage", "reports.read", "user.manage"],
};

export const roleLabels: Record<Role, string> = {
  DENTIST: "Dentist", RECEPTIONIST: "Receptionist", ASSISTANT: "Dental Assistant", ADMIN: "Clinic Admin",
};

export function can(roles: readonly Role[], permission: Permission) {
  return roles.some((role) => grants[role].includes(permission));
}
