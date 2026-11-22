import { afterAll, describe, expect, it } from "vitest";
import { db } from "../lib/db";
import { authenticate } from "../lib/login";
import { createSession, readSession, revokeSession, tokenHash } from "../lib/session";
import { readDashboard } from "../lib/dashboard";

const password = "FictionalClinic2026!";

async function account(clinic: string, name: string) {
  const user = await authenticate({ clinic, email: `${name}@${clinic}.example`, password });
  expect(user).not.toBeNull();
  return createSession(user!.clinicId, user!.id);
}

describe.skipIf(process.env.TEST_DATABASE !== "1")("PostgreSQL tenant boundaries", () => {
  afterAll(() => db.$disconnect());

  it("uses clinic-bound sessions and returns only the clinic’s patients and totals", async () => {
    const bright = await account("bright-smile", "dentist");
    const cedar = await account("cedar-smile", "dentist");
    try {
      const brightViewer = (await readSession(bright.token))!;
      const cedarViewer = (await readSession(cedar.token))!;
      const brightData = (await readDashboard(brightViewer))!;
      const cedarData = (await readDashboard(cedarViewer))!;
      expect(brightViewer.clinic.id).not.toBe(cedarViewer.clinic.id);
      expect(brightData.appointments.map(({ patient }) => patient.name)).toContain("Aarav Sen");
      expect(cedarData.appointments.map(({ patient }) => patient.name)).toEqual(["Kiran Pinto"]);
      expect(brightData.finance?.collections).toBe("64500");
      expect(cedarData.finance?.collections).toBe("1800.5");
      const patient = await db.patient.findFirstOrThrow({ where: { clinicId: cedarViewer.clinic.id } });
      const visit = await db.appointment.findFirstOrThrow({ where: { clinicId: brightViewer.clinic.id } });
      await expect(db.appointment.update({ where: { id: visit.id }, data: { patientId: patient.id } })).rejects.toMatchObject({ code: "P2003" });
      await expect(db.session.create({
        data: { tokenHash: "cross-clinic-test", clinicId: cedarViewer.clinic.id, userId: brightViewer.id, expiresAt: bright.expiresAt },
      })).rejects.toMatchObject({ code: "P2003" });
    } finally {
      await Promise.all([revokeSession(bright.token), revokeSession(cedar.token)]);
    }
    await expect(readSession(bright.token)).resolves.toBeNull();
  });

  it("excludes clinical fields on the server for reception and rejects expired sessions", async () => {
    const session = await account("bright-smile", "reception");
    const viewer = (await readSession(session.token))!;
    const data = (await readDashboard(viewer))!;
    expect(data.pipeline).toBeNull();
    expect(data.incompleteRecords).toBeNull();
    expect(data.appointments[0]).not.toHaveProperty("reason");
    expect(data.finance?.collections).toBe("64500");
    await expect(readDashboard({ ...viewer, roles: [] })).resolves.toBeNull();
    try {
      await db.session.update({ where: { tokenHash: tokenHash(session.token) }, data: { expiresAt: new Date(0) } });
      await expect(readSession(session.token)).resolves.toBeNull();
    } finally {
      await revokeSession(session.token);
    }
  });
});
