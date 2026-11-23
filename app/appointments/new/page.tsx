import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { appointmentDate, appointmentResources, clinicToday } from "@/lib/appointments";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { AppointmentForm } from "../appointment-form";

export default async function NewAppointmentPage({ searchParams }: {
  searchParams: Promise<{ date?: string | string[]; view?: string | string[] }>;
}) {
  const viewer = await requireViewer();
  if (!can(viewer.roles, "appointment.manage")) notFound();
  const { date, view } = await searchParams;
  const day = appointmentDate.safeParse(date).data ?? clinicToday(viewer.clinic.timezone);
  const clinicId = viewer.clinic.id;
  const [patients, { doctors, chairs }] = await Promise.all([
    db.patient.findMany({
      where: { clinicId, archivedAt: null },
      select: { id: true, name: true, number: true }, orderBy: [{ name: "asc" }, { number: "asc" }],
    }),
    appointmentResources(clinicId),
  ]);

  return <Card className="panel patient-registration">
    <div className="panel-heading"><h2>Schedule an appointment</h2></div>
    {patients.length && doctors.length ? <AppointmentForm calendar={view === "calendar"} day={day} timezone={viewer.clinic.timezone}
      patients={patients.map(({ id, name, number }) => ({ id, name: `${name} (${number})` }))}
      doctors={doctors} chairs={chairs} />
      : <div className="empty">
        <p>{patients.length ? "An active doctor is required to book an appointment." : "Register a patient before booking an appointment."}</p>
        <Link href={patients.length ? "/appointments" : "/patients"}>{patients.length ? "Back to appointments" : "Open patient directory"}</Link>
      </div>}
  </Card>;
}
