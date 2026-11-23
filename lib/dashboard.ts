import { appointmentDayBounds, clinicToday } from "./appointments";
import { db } from "./db";
import { can } from "./permissions";
import type { Viewer } from "./session";

export async function readDashboard(viewer: Viewer) {
  if (!can(viewer.roles, "dashboard.read")) return null;
  const clinicId = viewer.clinic.id;
  const clinical = can(viewer.roles, "clinical.read");
  const finance = can(viewer.roles, "finance.read");
  const snapshot = await db.dashboardSnapshot.findUnique({
    where: { clinicId },
    select: {
      day: true, followUps: true,
      diagnostic: clinical, inTreatment: clinical, awaitingLab: clinical,
      completed: clinical, incompleteRecords: clinical,
      collections: finance, invoiceCount: finance, outstanding: finance,
    },
  });

  const day = snapshot?.day ?? new Date(`${clinicToday(viewer.clinic.timezone)}T00:00:00Z`);
  const { start, end } = await appointmentDayBounds(day.toISOString().slice(0, 10), viewer.clinic.timezone);
  const [appointments, chairs, doctors] = await Promise.all([
    db.appointment.findMany({
      where: {
        clinicId,
        startsAt: { gte: start, lt: end },
        status: { not: "CANCELLED" },
        patient: { archivedAt: null },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true, startsAt: true, status: true, reason: clinical,
        patient: { select: { id: true, name: true } }, chairId: true, doctorId: true,
        doctor: { select: { user: { select: { name: true } } } },
      },
    }),
    db.chair.findMany({ where: { clinicId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.doctor.findMany({
      where: { clinicId, active: true, user: { active: true } },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return {
    day, appointments, chairs, doctors,
    followUps: snapshot?.followUps ?? 0,
    pipeline: clinical ? [
      snapshot?.diagnostic ?? 0, snapshot?.inTreatment ?? 0,
      snapshot?.awaitingLab ?? 0, snapshot?.completed ?? 0,
    ] : null,
    incompleteRecords: clinical ? snapshot?.incompleteRecords ?? 0 : null,
    finance: finance ? {
      collections: snapshot?.collections.toString() ?? "0", invoices: snapshot?.invoiceCount ?? 0,
      outstanding: snapshot?.outstanding ?? 0,
    } : null,
  };
}
