import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { can, modulePermissions, roleLabels } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";

export default async function PatientsLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  if (!can(viewer.roles, "patient.read")) notFound();

  const modules = modulePermissions
    .filter(([permission]) => can(viewer.roles, permission))
    .map(([, label]) => label);

  return <Workspace section="Patients" clinic={viewer.clinic.name} name={viewer.name}
    role={viewer.roles.map((role) => roleLabels[role]).join(", ")} modules={modules}>
    {children}
  </Workspace>;
}
