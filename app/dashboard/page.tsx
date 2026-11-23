import Link from "next/link";
import {
  Armchair, Bell, CalendarDays, ClipboardList, ClipboardPlus, IndianRupee, Stethoscope,
  UserPlus, UsersRound, Clock3, type LucideIcon,
} from "lucide-react";
import { Workspace } from "@/components/workspace";
import { Card } from "@/components/ui/card";
import { Schedule } from "@/components/schedule";
import { readDashboard } from "@/lib/dashboard";
import { can, roleLabels, modulePermissions, type Permission } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";

function Metric({ label, value, detail, icon: Icon, tone }: {
  label: string; value: string | number; detail: string; icon: LucideIcon; tone: string;
}) {
  return <Card className="metric">
    <div className={`metric-icon ${tone}`}><Icon size={23} /></div>
    <div><strong>{value}</strong><h2>{label}</h2><small>{detail}</small></div>
  </Card>;
}

const stages = ["Diagnostic / Plan", "In Treatment", "Awaiting Lab", "Completed (this month)"];
const colors = ["#514ac3", "#7094e5", "#b17bc8", "#e6a37a"];
const actions: [Permission, string, LucideIcon, string?][] = [
  ["patient.write", "New Patient", UserPlus, "/patients/new"],
  ["appointment.manage", "New Appointment", CalendarDays, "/appointments/new"],
  ["encounter.create", "New Consultation", Stethoscope, "/consultations/new"],
  ["treatment.manage", "Create Treatment Plan", ClipboardPlus, "/treatment-plans/new"],
];
export default async function DashboardPage() {
  const viewer = await requireViewer();
  const data = await readDashboard(viewer);
  if (!data) return <main className="login-layout"><h1>Dashboard access is unavailable.</h1></main>;

  const { appointments, doctors, chairs, pipeline, finance } = data;
  const waiting = appointments.filter(({ status }) => status === "WAITING").length;
  const seen = new Set(appointments.filter(({ status }) => status === "SEEN").map(({ patient }) => patient.id)).size;
  const date = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(data.day);
  const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: viewer.clinic.timezone });
  const currency = new Intl.NumberFormat("en-IN", { style: "currency", currency: viewer.clinic.currency, maximumFractionDigits: 2, minimumFractionDigits: 0 });
  const total = pipeline?.reduce((sum, count) => sum + count, 0) ?? 0;
  let offset = 0;
  const stops = pipeline?.map((count, index) => {
    const start = offset;
    offset += total ? 100 * count / total : 0;
    return `${colors[index]} ${start}% ${offset}%`;
  });
  const quickActions = actions.filter(([permission]) => can(viewer.roles, permission));

  return <Workspace clinic={viewer.clinic.name} name={viewer.name} role={viewer.roles.map((role) => roleLabels[role]).join(", ")} day={date}
    modules={modulePermissions.filter(([permission]) => can(viewer.roles, permission)).map(([, label]) => label)}>
    <div className="overview-label"><span>Clinic overview</span><span className="demo-tag"><i /> Fictional demo data</span></div>
    <div className="metrics">
      <Metric label="Appointments" value={appointments.length} detail={`${waiting} waiting`} icon={CalendarDays} tone="violet" />
      <Metric label="Patients seen" value={seen} detail="Completed visits" icon={UsersRound} tone="blue" />
      {pipeline && <Metric label="Treatments in progress" value={pipeline[1]} detail="Treatment pipeline" icon={ClipboardList} tone="rose" />}
      {finance && <Metric label="Collections" value={currency.format(finance.collections as `${number}`)} detail={`${finance.invoices} invoices`} icon={IndianRupee} tone="slate" />}
      {!pipeline && !finance && <Metric label="Waiting patients" value={waiting} detail="Scheduled queue" icon={Clock3} tone="violet" />}
    </div>

    <div className="dashboard-grid">
      <Schedule consult={can(viewer.roles, "encounter.create")} clinical={Boolean(pipeline)} doctors={doctors.map((doctor) => ({ id: doctor.id, name: doctor.user.name }))}
        rows={appointments.map(({ id, startsAt, patient, reason, doctor, doctorId, status }) => ({
          id, time: time.format(startsAt), patient: patient.name, patientId: can(viewer.roles, "patient.read") ? patient.id : undefined, reason, doctor: doctor.user.name, doctorId, status,
        }))} />

      <Card className="panel">
        <div className="panel-heading"><h2>Chair / Room Status</h2></div>
        <div className="chair-list">{chairs.map((chair) => {
          const visit = appointments.find(({ chairId, status }) => chairId === chair.id && status === "IN_VISIT");
          return <div className="chair-row" key={chair.id}>
            <span className={`chair-icon ${visit ? "occupied" : ""}`}><Armchair size={20} /></span>
            <div><strong>{chair.name}</strong><small>{visit ? visit.patient.name : "Ready for a visit"}</small></div>
            <span className={`status ${visit ? "in_use" : "seen"}`}>{visit ? "In use" : "Available"}</span>
          </div>;
        })}{!chairs.length && <p className="empty">No chairs configured.</p>}</div>
      </Card>

      {pipeline && <Card className="panel">
        <div className="panel-heading"><h2>Treatment Pipeline</h2></div>
        <div className="pipeline">
          <div className="donut" style={{ background: total ? `conic-gradient(${stops?.join(",")})` : "var(--soft-surface)" }}>
            <div><strong>{total - pipeline[3]}</strong><small>Active plans</small></div>
          </div>
          <ul>{stages.map((stage, index) => <li key={stage}><i style={{ background: colors[index] }} /><span>{stage}</span><strong>{pipeline[index]}</strong></li>)}</ul>
        </div>
      </Card>}

      {quickActions.length > 0 && <Card className="panel">
        <div className="panel-heading quick-heading"><h2>Quick Actions</h2></div>
        <div className="quick-actions">{quickActions.map(([permission, label, Icon, href]) =>
          href
            ? <Link key={label} href={permission === "appointment.manage" ? {
              pathname: href, query: { date: data.day.toISOString().slice(0, 10) },
            } : href}><Icon size={24} /><span>{label}</span></Link>
            : <button key={label} type="button" disabled><Icon size={24} /><span>{label}</span></button>
        )}</div>
      </Card>}

      <Card className="panel" id="alerts">
        <div className="panel-heading"><h2>Clinic Alerts</h2><Bell size={16} /></div>
        <ul className="compact-list">
          <li><span>Upcoming follow-ups</span><strong>{data.followUps}</strong></li>
          {data.incompleteRecords !== null && <li><span>Incomplete records</span><strong>{data.incompleteRecords}</strong></li>}
          {finance && <li><span>Outstanding balances</span><strong>{finance.outstanding}</strong></li>}
        </ul>
      </Card>

      <Card className="panel">
        <div className="panel-heading"><h2>Doctor Workload</h2><Stethoscope size={17} /></div>
        <ul className="compact-list">{doctors.map(({ id, user }) => <li key={id}><span>{user.name}</span><strong>{appointments.filter(({ doctorId }) => doctorId === id).length} visits</strong></li>)}
          {!doctors.length && <li>No active doctors.</li>}
        </ul>
      </Card>
    </div>
  </Workspace>;
}
