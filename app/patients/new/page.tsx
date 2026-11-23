import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { can } from "@/lib/permissions";
import { requireViewer } from "@/lib/viewer";
import { PatientForm } from "./patient-form";

export default async function NewPatientPage() {
  const viewer = await requireViewer();
  if (!can(viewer.roles, "patient.write")) notFound();

  return <Card className="panel patient-registration">
    <div className="panel-heading"><h2>Register a patient</h2></div>
    <PatientForm />
  </Card>;
}
