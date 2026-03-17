"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AdminModuleRow } from "@/components/admin-module-row";
import { CommandBar } from "@/components/command-bar";
import { EnvEditorPane } from "@/components/env-editor-pane";
import { RuntimeStatusPanel } from "@/components/runtime-status-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import { WolPanel } from "@/components/wol-panel";
import type {
  AdminAction,
  AdminActionResult,
  EnvFileSnapshot,
  RuntimeStatus,
  ServiceSnapshot,
  WolConfigSnapshot,
  WolTarget,
  WolWakeResult,
} from "@/lib/types";

type ServicesResponse = {
  services: ServiceSnapshot[];
  runtime: RuntimeStatus;
  error?: string;
};

type ActivityRecord = {
  kind: "service" | "wol";
  title: string;
  timestamp: string;
  fields: Array<{ label: string; value: string }>;
  output?: string;
  error?: string;
};

function parseErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
}

export function AdminConsole() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceSnapshot[]>([]);
  const [runtime, setRuntime] = useState<RuntimeStatus | null>(null);
  const [wolState, setWolState] = useState<WolConfigSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [busyWolId, setBusyWolId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackTone, setFeedbackTone] = useState<"good" | "danger" | undefined>(undefined);
  const [activity, setActivity] = useState<ActivityRecord | null>(null);
  const [editorServiceId, setEditorServiceId] = useState<string | null>(null);
  const [envSnapshot, setEnvSnapshot] = useState<EnvFileSnapshot | null>(null);
  const [editorText, setEditorText] = useState("");
  const [savingEnv, setSavingEnv] = useState(false);
  const [browserHost] = useState(() =>
    typeof window === "undefined" ? "localhost" : window.location.hostname
  );

  const selectedService = services.find((service) => service.id === editorServiceId) ?? null;
  const dirty = envSnapshot ? envSnapshot.text !== editorText : false;

  const loadServices = useCallback(async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/services", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as ServicesResponse;
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Unable to load services."));
      }

      setServices(payload.services ?? []);
      setRuntime(payload.runtime ?? null);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to load services.");
      setFeedbackTone("danger");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWolTargets = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/wol", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as WolConfigSnapshot & { error?: string };
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Unable to load Wake-on-LAN targets."));
      }

      setWolState(payload);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to load Wake-on-LAN targets.");
      setFeedbackTone("danger");
    }
  }, []);

  useEffect(() => {
    void loadServices();
    void loadWolTargets();
  }, [loadServices, loadWolTargets]);

  async function openEnvEditor(serviceId: string) {
    if (dirty && serviceId !== editorServiceId) {
      const shouldDiscard = window.confirm("Discard unsaved changes in the current env editor?");
      if (!shouldDiscard) {
        return;
      }
    }

    setBusyAction(`env:${serviceId}`);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/services/${serviceId}/env`, { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as EnvFileSnapshot & { error?: string };
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Unable to load env file."));
      }

      setEditorServiceId(serviceId);
      setEnvSnapshot(payload);
      setEditorText(payload.text);
      setFeedback(`Loaded ${payload.path}`);
      setFeedbackTone(undefined);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to load env file.");
      setFeedbackTone("danger");
    } finally {
      setBusyAction(null);
    }
  }

  async function saveEnv() {
    if (!editorServiceId) {
      return;
    }

    setSavingEnv(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/services/${editorServiceId}/env`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editorText }),
      });
      const payload = (await response.json().catch(() => ({}))) as { snapshot?: EnvFileSnapshot; error?: string };
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Unable to save env file."));
      }

      if (payload.snapshot) {
        setEnvSnapshot(payload.snapshot);
        setEditorText(payload.snapshot.text);
      }
      setFeedback("Environment file saved.");
      setFeedbackTone("good");
      await loadServices();
      await loadWolTargets();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to save env file.");
      setFeedbackTone("danger");
    } finally {
      setSavingEnv(false);
    }
  }

  async function runAction(serviceId: string, action: AdminAction) {
    setBusyAction(`${serviceId}:${action}`);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/services/${serviceId}/${action}`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as AdminActionResult & { error?: string };
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Service action failed."));
      }

      setActivity({
        kind: "service",
        title: `${payload.action} ${serviceId}`,
        timestamp: payload.executedAt,
        fields: [
          { label: "Service", value: payload.serviceId },
          { label: "Action", value: payload.action },
          { label: "Exit", value: String(payload.exitCode ?? "n/a") },
        ],
        output: [payload.stdout, payload.stderr].filter(Boolean).join("\n"),
      });
      setFeedback(`${payload.action} completed for ${serviceId}.`);
      setFeedbackTone(payload.ok ? "good" : "danger");
      await loadServices();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Service action failed.");
      setFeedbackTone("danger");
    } finally {
      setBusyAction(null);
    }
  }

  async function wakeLanTarget(target: WolTarget) {
    setBusyWolId(target.id);
    setFeedback(null);

    try {
      const response = await fetch(`/api/admin/wol/${target.id}/wake`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as WolWakeResult & { error?: string };
      if (!response.ok) {
        throw new Error(parseErrorMessage(payload, "Wake-on-LAN failed."));
      }

      setActivity({
        kind: "wol",
        title: `Wake ${payload.label}`,
        timestamp: payload.executedAt,
        fields: [
          { label: "Target", value: payload.label },
          { label: "Broadcast", value: payload.sentTo },
          { label: "Port", value: String(payload.port) },
        ],
        output: payload.error,
      });
      setFeedback(`Wake packet sent to ${payload.label}.`);
      setFeedbackTone(payload.ok ? "good" : "danger");
      await loadWolTargets();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Wake-on-LAN failed.");
      setFeedbackTone("danger");
    } finally {
      setBusyWolId(null);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="shell">
      <div className="page">
        <CommandBar
          mark="AD"
          title="Admin"
          status={{ label: dirty ? "Dirty" : "Ready", tone: dirty ? "warning" : "good" }}
          items={[
            { label: "Modules", value: String(services.length) },
            { label: "Live", value: String(services.filter((service) => service.running).length), tone: "good" },
            { label: "Wake", value: String(wolState?.targets.length ?? 0), tone: wolState?.targets.length ? "accent" : "warning" },
            { label: "Feed", value: loading ? "Loading" : "Ready", tone: loading ? "warning" : "accent" },
          ]}
          actions={
            <>
              <ThemeToggle />
              <Link className="button button--ghost" href="/">
                Dashboard
              </Link>
              <button type="button" className="button button--ghost" onClick={logout}>
                Sign out
              </button>
            </>
          }
        />

        <main className="admin-layout">
          <section className="section-block surface">
            <div className="section-bar">
              <div className="section-heading">
                <span className="section-tag">Ops</span>
                <h2>Modules</h2>
              </div>

              <div className="inline-cluster">
                <button
                  type="button"
                  className="button button--ghost button--sm"
                  onClick={() => void Promise.all([loadServices(), loadWolTargets()])}
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
            </div>

            {services.length === 0 && !loading ? (
              <div className="empty-state">No modules discovered.</div>
            ) : (
              <div className="module-list">
                {services.map((service) => (
                  <AdminModuleRow
                    key={service.id}
                    service={service}
                    browserHost={browserHost}
                    busyAction={busyAction}
                    onAction={(serviceId, action) => void runAction(serviceId, action)}
                    onOpenEnv={(serviceId) => void openEnvEditor(serviceId)}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="admin-side">
            <RuntimeStatusPanel runtime={runtime} />

            <WolPanel
              wolState={wolState}
              busyTargetId={busyWolId}
              onWake={(target) => void wakeLanTarget(target)}
            />

            <EnvEditorPane
              selectedService={selectedService}
              envSnapshot={envSnapshot}
              editorText={editorText}
              dirty={dirty}
              saving={savingEnv}
              onChange={setEditorText}
              onSave={() => void saveEnv()}
              onRevert={() => setEditorText(envSnapshot?.text ?? "")}
            />

            <section className="section-block surface activity-panel">
              <div className="section-bar">
                <div className="section-heading">
                  <span className="section-tag">Log</span>
                  <h2>Activity</h2>
                </div>
                <span className="signal" data-tone={feedbackTone ?? "accent"}>
                  {feedbackTone === "danger" ? "Issue" : feedback ? "Updated" : "Idle"}
                </span>
              </div>

              {feedback ? <div className="feedback-banner" data-tone={feedbackTone ?? "accent"}>{feedback}</div> : null}

              {activity ? (
                <div className="activity-stack">
                  <div className="detail-grid">
                    <div className="detail-pair">
                      <span>Kind</span>
                      <strong>{activity.kind}</strong>
                    </div>
                    <div className="detail-pair">
                      <span>When</span>
                      <strong>{new Date(activity.timestamp).toLocaleString()}</strong>
                    </div>
                    {activity.fields.map((field) => (
                      <div key={`${field.label}-${field.value}`} className="detail-pair">
                        <span>{field.label}</span>
                        <strong>{field.value}</strong>
                      </div>
                    ))}
                    <div className="detail-pair">
                      <span>Summary</span>
                      <strong>{activity.title}</strong>
                    </div>
                  </div>

                  {activity.output ? (
                    <div className="editor-field">
                      <label htmlFor="action-output">Output</label>
                      <textarea
                        id="action-output"
                        readOnly
                        value={activity.output}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="empty-state">No recent admin activity.</div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
