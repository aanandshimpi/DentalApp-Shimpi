"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Card } from "./ui/card";

const statuses = { SEEN: "Seen", IN_VISIT: "In Visit", WAITING: "Waiting", SCHEDULED: "Scheduled" };

export type ScheduleRow = {
  id: string; time: string; patient: string; reason?: string; doctor: string;
  doctorId: string; status: keyof typeof statuses;
};

export function Schedule({ rows, doctors, clinical }: {
  rows: ScheduleRow[]; doctors: { id: string; name: string }[]; clinical: boolean;
}) {
  const [doctor, setDoctor] = useState("");
  const [query, setQuery] = useState("");
  const visible = rows.filter((row) => (!doctor || row.doctorId === doctor)
    && row.patient.toLowerCase().includes(query.trim().toLowerCase()));
  return <Card className="schedule">
    <div className="panel-heading schedule-heading">
      <h2>Today’s Schedule</h2>
      <div className="schedule-tools">
        <label className="schedule-search"><Search size={15} /><input aria-label="Search scheduled patients" placeholder="Search patients" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <select aria-label="Filter by doctor" value={doctor} onChange={(event) => setDoctor(event.target.value)}>
          <option value="">All doctors</option>
          {doctors.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </select>
      </div>
    </div>
    <div className="table-scroll" role="region" aria-label="Schedule table" tabIndex={0}>
      <table>
        <thead><tr><th>Time</th><th>Patient</th>{clinical && <th>Reason / Treatment</th>}<th>Doctor</th><th>Status</th></tr></thead>
        <tbody>{visible.map((row) => <tr key={row.id}>
          <td>{row.time}</td><td className="patient">{row.patient}</td>{clinical && <td>{row.reason}</td>}
          <td>{row.doctor}</td><td><span className={`status ${row.status.toLowerCase()}`}>{statuses[row.status]}</span></td>
        </tr>)}
        {!visible.length && <tr><td className="empty" colSpan={clinical ? 5 : 4}>No appointments match.</td></tr>}</tbody>
      </table>
    </div>
  </Card>;
}
