"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { registerPatient } from "./actions";

export function PatientForm() {
  const [error, action, pending] = useActionState(registerPatient, "");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");

  return <form action={action} className="login-form patient-form">
    <label>Patient name<input name="name" required maxLength={100} value={name}
      onChange={(event) => setName(event.target.value)} /></label>
    <label>Patient number<input name="number" required maxLength={32} value={number}
      onChange={(event) => setNumber(event.target.value)} /></label>
    <label>Phone (optional)<input name="phone" type="tel" maxLength={30} value={phone}
      onChange={(event) => setPhone(event.target.value)} /></label>
    {error && <p className="login-error" role="alert">{error}</p>}
    <div className="patient-form-actions">
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save patient"}</Button>
      <Link href="/patients" className={buttonVariants({ variant: "outline" })}>Cancel</Link>
    </div>
  </form>;
}
