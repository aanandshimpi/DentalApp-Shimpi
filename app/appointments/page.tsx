import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, CalendarPlus, List } from "lucide-react";
import { Schedule } from "@/components/schedule";
import { Button, buttonVariants } from "@/components/ui/button";
import { appointmentDate, appointmentDayBounds, clinicToday } from "@/lib/appointments";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { AppointmentCalendar } from "./appointment-calendar";

export default async function AppointmentsPage({ searchParams }: {
  searchParams: Promise<{ date?: string | string[]; change?: string | string[]; view?: string | string[] }>;
}) {
  const viewer = await requireViewer();
  if (!can(viewer.roles, "appointment.manage")) notFound();
  const { date, change, view } = await searchParams;
  const today = clinicToday(viewer.clinic.timezone);
  const day = appointmentDate.safeParse(date).data ?? today;
  const calendar = view === "calendar";
  const { start, end } = await appointmentDayBounds(day, viewer.clinic.timezone);
  const clinical = can(viewer.roles, "clinical.read");
  const appointments = await db.appointment.findMany({
    where: { clinicId: viewer.clinic.id, startsAt: { gte: start, lt: end } },
    orderBy: [{ startsAt: "asc" }, { id: "asc" }],
    select: {
      id: true, doctorId: true, status: true, revision: true, startsAt: true, endsAt: true, reason: clinical,
      patient: { select: { id: true, name: true } }, chair: { select: { name: true } },
      doctor: { select: { user: { select: { name: true } } } },
    },
  });
  const clock = new Intl.DateTimeFormat("en-IN", {
    hour: "numeric", minute: "2-digit", timeZone: viewer.clinic.timezone,
  });

  const scheduleDate = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", dateStyle: "full" })
    .format(new Date(`${day}T00:00:00Z`));
  return <>
    <nav className="appointment-view-tabs" aria-label="Appointment view">
      <Link href={{ pathname: "/appointments", query: { date: day } }} aria-current={calendar ? undefined : "page"}>
        <List size={16} /> Schedule
      </Link>
      <Link href={{ pathname: "/appointments", query: { date: day, view: "calendar" } }} aria-current={calendar ? "page" : undefined}>
        <CalendarDays size={16} /> Calendar
      </Link>
    </nav>
    <div className="appointment-toolbar">
      <form className="appointment-date" action="/appointments">
        {calendar && <input type="hidden" name="view" value="calendar" />}
        <label>Schedule date <input type="date" name="date" defaultValue={day} key={day} required /></label>
        <Button variant="outline">View schedule</Button>
      </form>
      <Link className={buttonVariants()} href={{ pathname: "/appointments/new", query: { date: day, view: calendar ? "calendar" : undefined } }}>
        <CalendarPlus size={16} /> New Appointment
      </Link>
    </div>
    {change === "rescheduled" && <p className="appointment-notice" role="status">Appointment rescheduled.</p>}
    {change === "cancelled" && <p className="appointment-notice" role="status">Appointment cancelled.</p>}
    {calendar && <AppointmentCalendar day={day} today={today} clinicId={viewer.clinic.id} timezone={viewer.clinic.timezone} />}
    <Schedule title={calendar ? scheduleDate : "Daily schedule"} showChair manage calendar={calendar} consult={clinical && can(viewer.roles, "encounter.create")} clinical={clinical}
      doctors={[...new Map(appointments.map(({ doctorId, doctor }) => [
        doctorId, { id: doctorId, name: doctor.user.name },
      ])).values()].sort((first, second) => first.name.localeCompare(second.name))}
      rows={appointments.map((item) => ({
        id: item.id, time: clock.formatRange(item.startsAt, item.endsAt),
        patient: item.patient.name, patientId: can(viewer.roles, "patient.read") ? item.patient.id : undefined, doctor: item.doctor.user.name, doctorId: item.doctorId,
        status: item.status, revision: item.revision, reason: item.reason, chair: item.chair?.name,
      }))} />
  </>;
}
