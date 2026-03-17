"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";

type ApiError = {
  error?: string;
};

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = (await response.json().catch(() => ({}))) as ApiError;
      if (!response.ok) {
        throw new Error(payload.error || "Unable to sign in.");
      }

      router.push("/admin");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shell">
      <div className="page auth-page">
        <header className="auth-topbar">
          <Link className="auth-brand" href="/">
            <span className="command-mark" aria-hidden="true">
              AD
            </span>
            <span className="auth-brand__copy">
              <span className="section-tag">Secure</span>
              <strong>Admin</strong>
            </span>
          </Link>

          <div className="command-actions">
            <ThemeToggle />
            <Link className="button button--ghost" href="/">
              Dashboard
            </Link>
          </div>
        </header>

        <section className="auth-layout">
          <article className="surface auth-card">
            <div className="auth-card__head">
              <span className="section-tag">Sign in</span>
              <h1>Admin</h1>
              <span className="mini-note">/admin</span>
            </div>

            <form onSubmit={onSubmit} className="auth-form">
              <div className="editor-field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter admin password"
                />
              </div>

              <div className="button-row">
                <button type="submit" className="button button--solid" disabled={loading}>
                  {loading ? "Signing in..." : "Sign in"}
                </button>
                <Link className="button button--ghost" href="/">
                  Cancel
                </Link>
              </div>
            </form>

            {feedback ? (
              <div className="feedback-banner" data-tone="danger">
                {feedback}
              </div>
            ) : null}
          </article>
        </section>
      </div>
    </div>
  );
}
