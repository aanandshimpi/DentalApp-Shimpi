import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { can, modulePermissions, roleLabels } from "@/lib/permissions";
import { canManageTreatmentPlans } from "@/lib/treatment-plans";
import { requireViewer } from "@/lib/viewer";

export default async function TreatmentPlansLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  if (!canManageTreatmentPlans(viewer)) notFound();

  return <Workspace section="Treatment Plans" clinic={viewer.clinic.name} name={viewer.name}
    role={viewer.roles.map((role) => roleLabels[role]).join(", ")}
    modules={modulePermissions.filter(([permission]) => can(viewer.roles, permission)).map(([, label]) => label)}>
    {children}
  </Workspace>;
}
