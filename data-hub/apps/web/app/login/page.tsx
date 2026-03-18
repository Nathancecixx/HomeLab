import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { getSessionOrNull } from "@/lib/server-api";

export default async function LoginPage() {
  const session = await getSessionOrNull();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <span className="eyebrow">HomeLab Data Hub</span>
        <h1>Step into your private social layer</h1>
        <p>Sign in with a household account to browse your shared source graph, watchlists, saved media, and agent-ready history.</p>
        <LoginForm />
      </section>
    </main>
  );
}
