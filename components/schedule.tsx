"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";
import { appointmentStatusLabels, nextAppointmentStatus } from "@/lib/appointment-status";
import { AppointmentStatusAction } from "./appointment-status-action";
import { Card } from "./ui/card";


export type ScheduleRow = {
  id: string; time: string; patient: string; patientId?: string; reason?: string; doctor: string;
  doctorId: string; chair?: string; status: keyof typeof appointmentStatusLabels; revision?: number;
};

export function Schedule({ rows, doctors, clinical, title = "Today’s Schedule", showChair = false, manage = false, consult = false, calendar = false }: {
  rows: ScheduleRow[]; doctors: { id: string; name: string }[]; clinical: boolean; title?: string; showChair?: boolean; manage?: boolean; consult?: boolean; calendar?: boolean;
}) {
  const [doctor, setDoctor] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const visible = rows.filter((row) => (!doctor || row.doctorId === doctor)
    && (!status || row.status === status) && row.patient.toLowerCase().includes(query.trim().toLowerCase()));
  return <Card className="schedule">
    <div className="panel-heading schedule-heading">
      <h2>{title}</h2>
      <div className="schedule-tools">
        <label className="schedule-search"><Search size={15} /><input aria-label="Search scheduled patients" placeholder="Search patients" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select aria-label="Filter by doctor" value={doctor} onChange={(event) => setDoctor(event.target.value)}>
          <option value="">All doctors</option>
          {doctors.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
        {manage && <select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(appointmentStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>}
      </div>
    </div>
    <div className="table-scroll" role="region" aria-label="Schedule table" tabIndex={0}>
      <table>
        <thead><tr><th>Time</th><th>Patient</th>{clinical && <th>Reason / Treatment</th>}<th>Doctor</th>{showChair && <th>Chair</th>}<th>Status</th>{(manage || consult) && <th>Actions</th>}</tr></thead>
        <tbody>{visible.map((row) => {
          const next = nextAppointmentStatus[row.status];
          return <tr key={row.id}>
          <td>{row.time}</td><td className="patient">{row.patientId
            ? <Link className="appointment-manage" href={`/patients/${row.patientId}`}>{row.patient}</Link>
            : row.patient}</td>{clinical && <td>{row.reason}</td>}
          <td>{row.doctor}</td>{showChair && <td>{row.chair ?? "Unassigned"}</td>}<td><span className={`status ${row.status.toLowerCase()}`}>{appointmentStatusLabels[row.status]}</span></td>
          {(manage || consult) && <td><div className="schedule-actions">
            {manage && next && row.revision !== undefined && <AppointmentStatusAction key={row.revision}
              id={row.id} revision={row.revision} action={next.action} patient={row.patient} />}
            {manage && row.status === "SCHEDULED" && <Link className="appointment-manage"
              href={{ pathname: `/appointments/${row.id}`, query: calendar ? { view: "calendar" } : {} }} aria-label={`Manage appointment for ${row.patient} at ${row.time}`}>Manage</Link>}
            {consult && row.status !== "CANCELLED" && <Link className="appointment-manage"
              href={{ pathname: "/consultations/new", query: { appointment: row.id } }}
              aria-label={`Consultation for ${row.patient} at ${row.time}`}>Consultation</Link>}
          </div></td>}
        </tr>; })}
        {!visible.length && <tr><td className="empty" colSpan={4 + Number(clinical) + Number(showChair) + Number(manage || consult)}>No appointments match.</td></tr>}</tbody>
      </table>
    </div>
  </Card>;
}
