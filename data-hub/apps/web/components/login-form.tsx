"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { clientApiFetch } from "@/lib/client-api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@homelab.local");
  const [password, setPassword] = useState("change-me-admin");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      await clientApiFetch("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace("/");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to sign in.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label className="field">
        <span>Email</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="username" />
      </label>
      <label className="field">
        <span>Password</span>
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
      </label>
      {error ? <div className="feedback feedback--error">{error}</div> : null}
      <button className="button button--solid" type="submit" disabled={pending}>
        {pending ? "Signing In…" : "Enter Data Hub"}
      </button>
    </form>
  );
}
