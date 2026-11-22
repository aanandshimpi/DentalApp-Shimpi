import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getViewer } from "@/lib/viewer";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getViewer()) redirect("/dashboard");
  return <main className="login-layout">
    <section className="login-card">
      <Brand />
      <h1>Sign in</h1>
      <p>Access your clinic workspace.</p>
      <LoginForm demo={process.env.DEMO_SEED === "1"} />
    </section>
  </main>;
}
