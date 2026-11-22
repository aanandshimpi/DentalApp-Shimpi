import { db } from "../lib/db";
import { hashPassword } from "../lib/password";
import type { AppointmentStatus, Role } from "../generated/prisma/enums";

const demoPassword = "FictionalClinic2026!";
const date = "2026-11-22";
const day = new Date(`${date}T00:00:00Z`);
const staff: [string, string, Role[]][] = [
  ["dentist", "Dr. Ira Vardhan", ["DENTIST", "ADMIN"]],
  ["dentist2", "Dr. Kabir Joshi", ["DENTIST"]],
  ["reception", "Tara Sanyal", ["RECEPTIONIST"]],
  ["assistant", "Aman Kohli", ["ASSISTANT"]],
  ["admin", "Neha Bedi", ["ADMIN"]],
];
const visits: [string, string, string, AppointmentStatus, number, number][] = [
  ["Aarav Sen", "09:00", "Root canal review", "SEEN", 0, 0],
  ["Meera Iyer", "09:30", "Consultation", "IN_VISIT", 0, 0],
  ["Vihaan Rao", "09:45", "Implant assessment", "IN_VISIT", 1, 1],
  ["Sana Desai", "10:15", "Crown fitting", "WAITING", 1, 1],
  ["Rohan Gill", "11:00", "Routine exam", "SCHEDULED", 0, 2],
  ["Diya Menon", "11:30", "Follow-up", "SCHEDULED", 1, 1],
];

async function seed() {
  if (process.env.DEMO_SEED !== "1") throw new Error("Set DEMO_SEED=1 for a dedicated local demo database.");
  const passwordHash = await hashPassword(demoPassword);
  await db.$transaction(async (tx) => {
    for (const [index, slug, name] of [
      [1, "bright-smile", "Bright Smile Dental Clinic"],
      [2, "cedar-smile", "Cedar Smile Dental Studio"],
    ] as const) {
      const clinic = await tx.clinic.upsert({ where: { slug }, update: { name }, create: { slug, name } });
      const clinicId = clinic.id;
      const doctors: string[] = [];
      for (const [account, staffName, roles] of staff) {
        const email = `${account}@${slug}.example`;
        const user = await tx.user.upsert({
          where: { clinicId_email: { clinicId, email } },
          create: { clinicId, email, name: staffName, passwordHash }, update: { name: staffName, passwordHash },
        });
        await tx.userRole.createMany({ data: roles.map((role) => ({ clinicId, userId: user.id, role })), skipDuplicates: true });
        if (roles.includes("DENTIST")) {
          const doctor = await tx.doctor.upsert({
            where: { clinicId_userId: { clinicId, userId: user.id } },
            create: { clinicId, userId: user.id }, update: {},
          });
          doctors.push(doctor.id);
        }
      }

      const chairs = [];
      for (const name of ["Chair 1", "Chair 2", "Chair 3"]) {
        chairs.push(await tx.chair.upsert({
          where: { clinicId_name: { clinicId, name } }, create: { clinicId, name }, update: {},
        }));
      }
      for (const [position, [patientName, time, reason, status, doctor, chair]] of visits.entries()) {
        if (index === 2 && position > 0) break;
        const name = index === 1 ? patientName : "Kiran Pinto";
        const number = `P-${1045 + position}`;
        const patient = await tx.patient.upsert({
          where: { clinicId_number: { clinicId, number } }, create: { clinicId, name, number }, update: { name },
        });
        const startsAt = new Date(`${date}T${time}:00+05:30`);
        const id = `2d7da65d-f574-41fa-a87b-${String(index * 100 + position).padStart(12, "0")}`;
        const appointment = {
          clinicId, patientId: patient.id, doctorId: doctors[doctor], chairId: chairs[chair].id,
          startsAt, endsAt: new Date(startsAt.getTime() + 30 * 60_000), status, reason,
        };
        await tx.appointment.upsert({ where: { id }, create: { id, ...appointment }, update: appointment });
      }
      const snapshot = {
        day, diagnostic: index === 1 ? 8 : 1, inTreatment: index === 1 ? 7 : 0, awaitingLab: 6,
        completed: 10, collections: index === 1 ? "64500.00" : "1800.50", invoiceCount: index === 1 ? 12 : 1,
        followUps: 4, incompleteRecords: 2, outstanding: 3,
      };
      await tx.dashboardSnapshot.upsert({ where: { clinicId }, create: { clinicId, ...snapshot }, update: snapshot });
    }
  });
}

seed().then(() => console.log("Seeded Bright Smile and Cedar Smile fictional clinics.")).catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
