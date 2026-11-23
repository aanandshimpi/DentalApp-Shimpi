import type { AppointmentStatus } from "../generated/prisma/enums";

export const appointmentStatusLabels = {
  SCHEDULED: "Pending",
  WAITING: "Checked in",
  IN_VISIT: "In progress",
  SEEN: "Done",
  CANCELLED: "Cancelled",
} satisfies Record<AppointmentStatus, string>;

export const nextAppointmentStatus: Partial<Record<AppointmentStatus, { status: AppointmentStatus; action: string }>> = {
  SCHEDULED: { status: "WAITING", action: "Check in" },
  WAITING: { status: "IN_VISIT", action: "Start visit" },
  IN_VISIT: { status: "SEEN", action: "Mark done" },
};
