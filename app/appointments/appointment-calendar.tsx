import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { appointmentStatusLabels } from "@/lib/appointment-status";
import { appointmentDayBounds } from "@/lib/appointments";
import { db } from "@/lib/db";

const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function calendarLink(date: string) {
  return { pathname: "/appointments", query: { view: "calendar", date } };
}

export async function AppointmentCalendar({ day, today, clinicId, timezone }: {
  day: string; today: string; clinicId: string; timezone: string;
}) {
  const firstDay = `${day.slice(0, 7)}-01`;
  const firstDate = new Date(`${firstDay}T00:00:00Z`);
  const previous = new Date(firstDate);
  previous.setUTCMonth(firstDate.getUTCMonth() - 1);
  const next = new Date(firstDate);
  next.setUTCMonth(firstDate.getUTCMonth() + 1);
  const last = new Date(next);
  last.setUTCDate(0);
  const [{ start }, { end }] = await Promise.all([
    appointmentDayBounds(firstDay, timezone),
    appointmentDayBounds(last.toISOString().slice(0, 10), timezone),
  ]);
  const appointments = await db.appointment.findMany({
    where: { clinicId, startsAt: { gte: start, lt: end } },
    select: { startsAt: true, status: true },
  });
  const dateFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const longDay = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", dateStyle: "full" });
  const month = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", month: "long", year: "numeric" }).format(firstDate);
  const counts = new Map<string, Map<keyof typeof appointmentStatusLabels, number>>();
  const offset = (firstDate.getUTCDay() + 6) % 7;

  for (const { startsAt, status } of appointments) {
    const date = dateFormat.format(startsAt).padStart(10, "0");
    const statuses = counts.get(date) ?? new Map();
    statuses.set(status, (statuses.get(status) ?? 0) + 1);
    counts.set(date, statuses);
  }

  return <Card className="appointment-calendar" aria-label="Monthly appointment calendar">
    <div className="panel-heading">
      <h2>{month}</h2>
      <nav className="calendar-nav" aria-label="Calendar month">
        {previous.getUTCFullYear() >= 1 && <Link className={buttonVariants({ variant: "outline", size: "icon" })}
          href={calendarLink(previous.toISOString().slice(0, 10))} aria-label="Previous month"><ChevronLeft size={17} /></Link>}
        <Link className={buttonVariants({ variant: "outline" })} href={calendarLink(today)}>Today</Link>
        {next.getUTCFullYear() <= 9999 && <Link className={buttonVariants({ variant: "outline", size: "icon" })}
          href={calendarLink(next.toISOString().slice(0, 10))} aria-label="Next month"><ChevronRight size={17} /></Link>}
      </nav>
    </div>
    <div className="calendar-grid">
      {weekdayNames.map((weekday) => <span className="calendar-weekday" key={weekday}>{weekday}</span>)}
      {Array.from({ length: offset }, (_, index) => <span className="calendar-blank" key={`blank-${index}`} aria-hidden="true" />)}
      {Array.from({ length: last.getUTCDate() }, (_, index) => {
        const date = `${day.slice(0, 7)}-${String(index + 1).padStart(2, "0")}`;
        const statuses = counts.get(date);
        const total = statuses ? [...statuses.values()].reduce((sum, count) => sum + count, 0) : 0;
        const description = statuses ? [...statuses].map(([status, count]) => `${appointmentStatusLabels[status]}: ${count}`).join(", ") : "No appointments";
        return <Link className="calendar-day" href={calendarLink(date)} key={date} data-selected={date === day}
          aria-current={date === day ? "date" : undefined} data-today={date === today}
          aria-label={`${longDay.format(new Date(`${date}T00:00:00Z`))}. ${description}`}>
          <span>{index + 1}</span>
          {total > 0 && <span className="calendar-day-count" aria-hidden="true">{total}<small> visits</small></span>}
          {statuses && <span className="calendar-status-dots" aria-hidden="true">
            {Object.keys(appointmentStatusLabels).map((status) => statuses.has(status as keyof typeof appointmentStatusLabels)
              ? <i className={status.toLowerCase()} key={status} /> : null)}
          </span>}
        </Link>;
      })}
    </div>
    <div className="calendar-legend" aria-label="Appointment status colours">
      {Object.entries(appointmentStatusLabels).map(([status, label]) => <span key={status}>
        <i className={status.toLowerCase()} aria-hidden="true" />{label}
      </span>)}
    </div>
  </Card>;
}
