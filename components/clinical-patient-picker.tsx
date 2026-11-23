import Link from "next/link";
import { Button } from "./ui/button";

export function ClinicalPatientPicker({ action, patients }: {
  action: string; patients: { id: string; name: string; number: string }[];
}) {
  if (!patients.length) return <p className="empty">
    Register a patient before continuing. <Link className="appointment-manage" href="/patients">Open patient directory</Link>
  </p>;

  return <form action={action} className="login-form patient-form consultation-fields">
    <label htmlFor="clinical-patient">Patient</label>
    <select id="clinical-patient" name="patient" required defaultValue="">
      <option value="">Select a patient</option>
      {patients.map(({ id, name, number }) => <option key={id} value={id}>{name} ({number})</option>)}
    </select>
    <div><Button type="submit">Continue</Button></div>
  </form>;
}
