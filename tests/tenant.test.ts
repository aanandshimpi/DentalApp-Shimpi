import { afterAll, describe, expect, it } from "vitest";
import { db } from "../lib/db";
import { authenticate } from "../lib/login";
import { createSession, readSession, revokeSession, tokenHash } from "../lib/session";
import { recordConsultation } from "../lib/consultations";
import { advanceTreatment, createTreatmentPlan } from "../lib/treatment-plans";
import { readDashboard } from "../lib/dashboard";
import { advanceAppointment, bookAppointment, cancelAppointment, rescheduleAppointment } from "../lib/appointments";

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

  it("guards booking conflicts, stale edits, and reopening a cancelled slot", async () => {
    const session = await account("bright-smile", "reception");
    const reason = `Fictional booking test ${crypto.randomUUID()}`;
    const viewer = (await readSession(session.token))!;
    const clinicId = viewer.clinic.id;
    try {
      const [patient, doctor, foreignPatient] = await Promise.all([
        db.patient.findFirstOrThrow({ where: { clinicId, archivedAt: null } }),
        db.doctor.findFirstOrThrow({ where: { clinicId, active: true, user: { active: true } } }),
        db.patient.findFirstOrThrow({ where: { clinicId: { not: clinicId }, archivedAt: null } }),
      ]);
      const fields = {
        patientId: patient.id, doctorId: doctor.id, chairId: "", day: "2042-07-18",
        time: "09:00", duration: "30", reason,
      };

      await expect(bookAppointment(viewer, { ...fields, patientId: foreignPatient.id }))
        .resolves.toHaveProperty("error");
      const results = await Promise.all([bookAppointment(viewer, fields), bookAppointment(viewer, fields)]);
      expect(results.filter((result) => "day" in result)).toHaveLength(1);
      expect(results.filter((result) => "error" in result)).toEqual([
        { error: "The patient, doctor, or chair already has an appointment during that time." },
      ]);
      await expect(bookAppointment(viewer, { ...fields, time: "09:30" })).resolves.toEqual({ day: fields.day });
      const saved = await db.appointment.findMany({
        where: { clinicId, reason }, orderBy: { startsAt: "asc" },
      });
      expect(saved.map(({ startsAt }) => startsAt.toISOString())).toEqual([
        "2042-07-18T03:30:00.000Z", "2042-07-18T04:00:00.000Z",
      ]);

      const edit = { ...fields, id: saved[0].id, revision: "0" };
      await expect(rescheduleAppointment(viewer, { ...edit, time: "09:30" })).resolves.toHaveProperty("error");
      await expect(rescheduleAppointment(viewer, { ...edit, time: "10:00" })).resolves.toEqual({ day: fields.day });
      await expect(cancelAppointment(viewer, edit)).resolves.toHaveProperty("error");
      await expect(cancelAppointment({ ...viewer, roles: ["ASSISTANT"] }, { ...edit, revision: "1" }))
        .resolves.toHaveProperty("error");
      await expect(cancelAppointment(viewer, { ...edit, revision: "1" })).resolves.toEqual({ day: fields.day });
      await expect(db.appointment.findUnique({ where: { id: edit.id }, select: { status: true } }))
        .resolves.toEqual({ status: "CANCELLED" });
      await expect(bookAppointment(viewer, { ...fields, time: "10:00" })).resolves.toEqual({ day: fields.day });
      const checkIn = { id: saved[1].id, revision: "0" };
      await expect(advanceAppointment({ ...viewer, roles: ["ASSISTANT"] }, checkIn)).resolves.toHaveProperty("error");
      await expect(advanceAppointment(viewer, checkIn)).resolves.toEqual({ updated: true });
      await expect(advanceAppointment(viewer, checkIn)).resolves.toHaveProperty("error");
      for (const [revision, status] of [[1, "IN_VISIT"], [2, "SEEN"]] as const) {
        await expect(advanceAppointment(viewer, { ...checkIn, revision: String(revision) })).resolves.toEqual({ updated: true });
        await expect(db.appointment.findUnique({ where: { id: checkIn.id }, select: { status: true } })).resolves.toEqual({ status });
      }
      await expect(advanceAppointment(viewer, { ...checkIn, revision: "3" })).resolves.toHaveProperty("error");
    } finally {
      await db.appointment.deleteMany({ where: { clinicId, reason } });
      await revokeSession(session.token);
    }
  });

  it("enforces patient and clinic boundaries when linking a consultation to an appointment", async () => {
    const session = await account("bright-smile", "dentist");
    const viewer = (await readSession(session.token))!;
    const clinicId = viewer.clinic.id;
    const concern = `Fictional consultation test ${crypto.randomUUID()}`;
    const appointmentId = crypto.randomUUID();
    try {
      const template = await db.appointment.findFirstOrThrow({
        where: { clinicId },
        select: { patientId: true, doctorId: true },
      });
      const appointment = await db.appointment.create({
        data: {
          ...template, id: appointmentId, clinicId, reason: concern, status: "SEEN",
          startsAt: new Date("2042-07-22T03:30:00.000Z"),
          endsAt: new Date("2042-07-22T04:00:00.000Z"),
        },
      });
      const anotherPatient = await db.patient.findFirstOrThrow({
        where: { clinicId, id: { not: appointment.patientId } },
      });
      const foreignAppointment = await db.appointment.findFirstOrThrow({
        where: { clinicId: { not: clinicId } },
      });
      const fields = {
        patientId: appointment.patientId, appointmentId: appointment.id, concern,
        findings: "Fictional test notes", assessment: "", plan: "",
      };

      await expect(recordConsultation({ ...viewer, roles: ["RECEPTIONIST"] }, fields)).resolves.toHaveProperty("error");
      await expect(recordConsultation(viewer, { ...fields, patientId: anotherPatient.id })).resolves.toHaveProperty("error");
      await expect(recordConsultation(viewer, { ...fields, appointmentId: foreignAppointment.id })).resolves.toHaveProperty("error");
      await expect(db.consultation.create({
        data: { ...fields, clinicId, authorId: viewer.id, patientId: anotherPatient.id },
      })).rejects.toMatchObject({ code: "P2003" });
      const linked = await Promise.all([recordConsultation(viewer, fields), recordConsultation(viewer, fields)]);
      expect(linked.filter((result) => "id" in result)).toHaveLength(1);
      expect(linked.filter((result) => "error" in result)).toHaveLength(1);
      const specialtyData = { specialty: "endodontics", fields: { "pulp-testing": "Fictional finding" }, options: ["root-canal"] };
      const walkIn = { ...fields, appointmentId: "", findings: "", specialtyData: JSON.stringify(specialtyData) };
      await expect(recordConsultation(viewer, { ...walkIn, teeth: '[{"tooth":"11","details":"Finding","procedure":"root-canal"}]' }))
        .resolves.toHaveProperty("error");
      const tooth = { tooth: "11", details: "Fictional tooth finding", diagnosis: "Fictional diagnosis", surfaces: ["mesial"] };
      await expect(recordConsultation(viewer, { ...walkIn, teeth: JSON.stringify([tooth]) })).resolves.toHaveProperty("id");
      const saved = await db.consultation.findMany({
        where: { clinicId, concern }, include: { teeth: { select: { tooth: true, details: true, diagnosis: true, surfaces: true } } },
      });
      expect(saved).toHaveLength(2);
      expect(saved.map((record) => record.appointmentId)).toEqual(expect.arrayContaining([appointment.id, null]));
      expect(saved.find((record) => record.appointmentId === null)).toMatchObject({ specialtyData, teeth: [tooth] });
    } finally {
      await db.consultation.deleteMany({ where: { clinicId, concern } });
      await db.appointment.deleteMany({ where: { id: appointmentId, clinicId } });
      await revokeSession(session.token);
    }
  });

  it("links a treatment plan only to consultations for the same patient and clinic", async () => {
    const bright = await account("bright-smile", "dentist");
    const cedar = await account("cedar-smile", "dentist");
    const viewer = (await readSession(bright.token))!;
    const otherViewer = (await readSession(cedar.token))!;
    const marker = `Fictional plan test ${crypto.randomUUID()}`;
    try {
      const patients = await db.patient.findMany({ where: { clinicId: viewer.clinic.id, archivedAt: null }, take: 2 });
      const foreignPatient = await db.patient.findFirstOrThrow({ where: { clinicId: otherViewer.clinic.id, archivedAt: null } });
      const consultation = await db.consultation.create({
        data: {
          clinicId: viewer.clinic.id, patientId: patients[0].id,
          authorId: viewer.id, concern: marker, findings: "Fictional test findings",
        },
      });
      const foreign = await db.consultation.create({
        data: {
          clinicId: otherViewer.clinic.id, patientId: foreignPatient.id,
          authorId: otherViewer.id, concern: marker, findings: "Fictional test findings",
        },
      });
      const fields = {
        patientId: patients[0].id, consultationId: consultation.id, title: marker,
        treatment: "Fictional plan text", followUp: "",
      };
      await expect(createTreatmentPlan({ ...viewer, roles: ["ADMIN"] }, fields)).resolves.toHaveProperty("error");
      await expect(createTreatmentPlan(viewer, { ...fields, patientId: patients[1].id })).resolves.toHaveProperty("error");
      await expect(createTreatmentPlan(viewer, { ...fields, consultationId: foreign.id })).resolves.toHaveProperty("error");
      await expect(db.treatmentPlan.create({
        data: { ...fields, clinicId: viewer.clinic.id, authorId: viewer.id, patientId: patients[1].id },
      })).rejects.toMatchObject({ code: "P2003" });
      await expect(createTreatmentPlan(viewer, fields)).resolves.toHaveProperty("id");
      const toothPlan = { ...fields, consultationId: "", treatment: "" };
      for (const teeth of [
        "[]",
        '[{"tooth":"19","details":"Invalid tooth"}]',
        '[{"tooth":"11","details":"  "}]',
        '[{"tooth":"11","details":"First note"},{"tooth":"11","details":"Duplicate"}]',
      ]) {
        await expect(createTreatmentPlan(viewer, { ...toothPlan, teeth })).resolves.toHaveProperty("error");
      }
      const specialtyData = { specialty: "endodontics", fields: { "pulpal-diagnosis": "Fictional planning note" }, options: ["endo-referral"] };
      const endodonticPlan = { ...toothPlan, specialtyData: JSON.stringify(specialtyData) };
      await expect(createTreatmentPlan(viewer, {
        ...endodonticPlan, specialtyData: JSON.stringify({ ...specialtyData, options: ["clear-aligners"] }),
      })).resolves.toHaveProperty("error");
      await expect(createTreatmentPlan(viewer, {
        ...endodonticPlan, specialtyData: JSON.stringify({ ...specialtyData, fields: { "pulp-testing": "Wrong form" } }),
      })).resolves.toHaveProperty("error");
      await expect(createTreatmentPlan(viewer, {
        ...endodonticPlan, teeth: '[{"tooth":"11","details":"","procedure":"endo-referral"}]',
      })).resolves.toHaveProperty("error");
      const details = [
        { tooth: "11", details: "", procedure: "root-canal" },
        { tooth: "52", details: "", diagnosis: "Fictional diagnosis", suggestedTreatment: "Primary tooth plan", surfaces: ["biting"] },
      ];
      await expect(createTreatmentPlan(viewer, { ...endodonticPlan, teeth: JSON.stringify(details) })).resolves.toHaveProperty("id");
      const saved = await db.treatmentPlan.findMany({
        where: { clinicId: viewer.clinic.id, title: marker },
        include: { teeth: { select: { tooth: true, details: true, procedure: true, diagnosis: true, suggestedTreatment: true, surfaces: true }, orderBy: { tooth: "asc" } } },
      });
      expect(saved).toHaveLength(2);
      expect(saved.find((plan) => plan.consultationId === consultation.id)?.teeth).toEqual([]);
      expect(saved.find((plan) => plan.consultationId === null)).toMatchObject({
        specialtyData, teeth: [details[0], { ...details[1], procedure: null }],
      });
      const standalone = saved.find((plan) => plan.consultationId === null)!;
      const update = { id: standalone.id, tooth: "11", expected: "PLANNED" };
      await expect(advanceTreatment(otherViewer, update)).resolves.toHaveProperty("error");
      await expect(advanceTreatment({ ...viewer, roles: ["RECEPTIONIST"] }, update)).resolves.toHaveProperty("error");
      await expect(advanceTreatment(viewer, { id: standalone.id, expected: "PLANNED" })).resolves.toHaveProperty("error");
      await expect(advanceTreatment(viewer, update)).resolves.toHaveProperty("id", standalone.id);
      await expect(advanceTreatment(viewer, update)).resolves.toHaveProperty("error");
      await expect(advanceTreatment(viewer, { ...update, expected: "IN_PROGRESS" })).resolves.toHaveProperty("id", standalone.id);
      const progress = await db.treatmentPlanTooth.findMany({
        where: { planId: standalone.id }, select: { tooth: true, status: true }, orderBy: { tooth: "asc" },
      });
      expect(progress).toEqual([{ tooth: "11", status: "DONE" }, { tooth: "52", status: "PLANNED" }]);
      const general = saved.find((plan) => plan.consultationId === consultation.id)!;
      await expect(advanceTreatment(viewer, { id: general.id, expected: "PLANNED" })).resolves.toHaveProperty("id", general.id);
      await expect(db.treatmentPlan.findUnique({ where: { id: general.id }, select: { status: true } }))
        .resolves.toEqual({ status: "IN_PROGRESS" });
    } finally {
      await db.treatmentPlan.deleteMany({ where: { clinicId: viewer.clinic.id, title: marker } });
      await db.consultation.deleteMany({ where: { clinicId: { in: [viewer.clinic.id, otherViewer.clinic.id] }, concern: marker } });
      await Promise.all([revokeSession(bright.token), revokeSession(cedar.token)]);
    }
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
