import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Workspace } from "@/components/workspace";
import { canReadConsultations } from "@/lib/consultations";
import { can, modulePermissions, roleLabels } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";

export default async function ConsultationsLayout({ children }: { children: ReactNode }) {
  const viewer = await requireViewer();
  if (!canReadConsultations(viewer)) notFound();

  return <Workspace section="Consultations" clinic={viewer.clinic.name} name={viewer.name}
    role={viewer.roles.map((role) => roleLabels[role]).join(", ")}
    modules={modulePermissions.filter(([permission]) => can(viewer.roles, permission)).map(([, label]) => label)}>
    {children}
  </Workspace>;
}
