import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { getViewer } from "@/lib/viewer";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  if (await getViewer()) redirect("/dashboard");
  const hostedDemo = process.env.HOSTED_DEMO === "1";
  return <main className="login-layout">
    <section className="login-card">
      <Brand />
      <h1>Sign in</h1>
      <p>{hostedDemo ? "Hosted demo. Use fictional patient information only." : "Access your clinic workspace."}</p>
      <LoginForm demo={!hostedDemo && process.env.DEMO_SEED === "1"} />
    </section>
  </main>;
}
