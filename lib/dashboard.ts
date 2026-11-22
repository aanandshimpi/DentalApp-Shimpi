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

  const [appointments, chairs, doctors] = await Promise.all([
    snapshot ? db.appointment.findMany({
      where: {
        clinicId,
        // The fictional preview runs on a fixed Asia/Kolkata clinic day.
        startsAt: {
          gte: new Date(snapshot.day.getTime() - 330 * 60_000),
          lt: new Date(snapshot.day.getTime() + (1440 - 330) * 60_000),
        },
        patient: { archivedAt: null },
      },
      orderBy: { startsAt: "asc" },
      select: {
        id: true, startsAt: true, status: true, reason: clinical,
        patient: { select: { id: true, name: true } }, chairId: true, doctorId: true,
        doctor: { select: { user: { select: { name: true } } } },
      },
    }) : [],
    db.chair.findMany({ where: { clinicId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.doctor.findMany({
      where: { clinicId, active: true, user: { active: true } },
      select: { id: true, user: { select: { name: true } } },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  return {
    day: snapshot?.day ?? null, appointments, chairs, doctors,
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
