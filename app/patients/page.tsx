import Link from "next/link";
import { notFound } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";

const pageSize = 25;

export default async function PatientsPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const viewer = await requireViewer();
  if (!can(viewer.roles, "patient.read")) notFound();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const where = {
    clinicId: viewer.clinic.id,
    archivedAt: null,
    ...(query && { OR: [
      { name: { contains: query, mode: "insensitive" as const } },
      { number: { contains: query, mode: "insensitive" as const } },
      { phone: { contains: query } },
    ] }),
  };
  const count = await db.patient.count({ where });
  const lastPage = Math.max(1, Math.ceil(count / pageSize));
  const page = Number.isSafeInteger(requestedPage) ? Math.min(lastPage, Math.max(1, requestedPage)) : 1;
  const patients = await db.patient.findMany({
    where,
    select: { id: true, number: true, name: true, phone: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: pageSize,
    skip: (page - 1) * pageSize,
  });

  return <Card className="panel patient-panel">
    <div className="panel-heading">
      <h2>Patient directory</h2>
      {can(viewer.roles, "patient.write") && <Link className={buttonVariants()} href="/patients/new">
        <UserPlus size={16} /> New Patient
      </Link>}
    </div>
    <form className="patient-search" action="/patients">
      <input aria-label="Search patients" name="q" defaultValue={query} maxLength={100}
        placeholder="Search name, number or phone" />
      <button className={buttonVariants({ variant: "outline" })}>Search</button>
      {query && <Link href="/patients">Clear</Link>}
    </form>
    {patients.length ? <div className="patient-table">
      <table>
        <thead><tr><th>Patient name</th><th>Patient number</th><th>Phone</th></tr></thead>
        <tbody>{patients.map((patient) => <tr key={patient.id}>
          <td><Link className="appointment-manage" href={`/patients/${patient.id}`}>{patient.name}</Link></td>
          <td>{patient.number}</td><td>{patient.phone || "—"}</td>
        </tr>)}</tbody>
      </table>
    </div> : <p className="empty">{query ? "No patients match your search." : "No patients registered yet."}</p>}
    {lastPage > 1 && <nav className="patient-pagination" aria-label="Patient pages">
      {page > 1 && <Link href={{ pathname: "/patients", query: { q: query, page: page - 1 } }}>Previous</Link>}
      <span>Page {page} of {lastPage}</span>
      {page < lastPage && <Link href={{ pathname: "/patients", query: { q: query, page: page + 1 } }}>Next</Link>}
    </nav>}
  </Card>;
}
