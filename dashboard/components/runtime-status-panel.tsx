import type { RuntimeStatus } from "@/lib/types";

type RuntimeStatusPanelProps = {
  runtime: RuntimeStatus | null;
};

export function RuntimeStatusPanel({ runtime }: RuntimeStatusPanelProps) {
  return (
    <section className="section-block surface">
      <div className="section-bar">
        <div className="section-heading">
          <span className="section-tag">Ready</span>
          <h2>Deploy</h2>
        </div>
        <span className="mini-note">{runtime ? (runtime.hostTelemetry ? "Host mode" : "Fallback") : "Loading"}</span>
      </div>

      {runtime ? (
        <div className="runtime-status">
          <div className="runtime-checks">
            {runtime.checks.map((check) => (
              <article key={check.id} className="runtime-check" data-ok={check.ok}>
                <div className="runtime-check__top">
                  <strong>{check.label}</strong>
                  <span className="signal" data-tone={check.ok ? "good" : "warning"}>
                    {check.ok ? "Ready" : "Needs work"}
                  </span>
                </div>
                <span className="table-note">{check.detail}</span>
              </article>
            ))}
          </div>

          <div className="runtime-meta">
            <div className="detail-pair">
              <span>Env file</span>
              <strong className="mono">{runtime.dashboardEnvPath}</strong>
            </div>
            <div className="detail-pair">
              <span>WOL targets</span>
              <strong>{runtime.wolTargetCount}</strong>
            </div>
          </div>

          {runtime.warnings.length > 0 ? (
            <div className="warning-stack">
              {runtime.warnings.slice(0, 4).map((warning) => (
                <div key={warning} className="feedback-banner" data-tone="danger">
                  {warning}
                </div>
              ))}
            </div>
          ) : (
            <div className="feedback-banner" data-tone="good">
              Pi deployment checks look clean.
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">Runtime checks are loading.</div>
      )}
    </section>
  );
}
