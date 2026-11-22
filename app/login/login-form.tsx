"use client";

import { useActionState, useState } from "react";
import { signIn } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function LoginForm({ demo }: { demo: boolean }) {
  const [error, action, pending] = useActionState(signIn, "");
  const [clinic, setClinic] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return <form action={action} className="login-form">
    <label>Clinic code<input name="clinic" required autoComplete="organization" value={clinic} onChange={(event) => setClinic(event.target.value)} /></label>
    <label>Email<input name="email" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Password<input name="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {error && <p role="alert" className="login-error">{error}</p>}
    <Button type="submit" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    {demo && <Button type="button" variant="outline" onClick={() => {
      setClinic("bright-smile");
      setEmail("dentist@bright-smile.example");
      setPassword("FictionalClinic2026!");
    }}>Fill dentist demo credentials</Button>}
  </form>;
}
