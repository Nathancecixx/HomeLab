import type { WolConfigSnapshot, WolTarget } from "@/lib/types";

type WolPanelProps = {
  wolState: WolConfigSnapshot | null;
  busyTargetId: string | null;
  onWake: (target: WolTarget) => void;
};

export function WolPanel({ wolState, busyTargetId, onWake }: WolPanelProps) {
  return (
    <section className="section-block surface">
      <div className="section-bar">
        <div className="section-heading">
          <span className="section-tag">Wake</span>
          <h2>LAN</h2>
        </div>
        <span className="mini-note">{wolState?.targets.length ?? 0} targets</span>
      </div>

      {!wolState ? (
        <div className="empty-state">Wake-on-LAN targets are loading.</div>
      ) : wolState.targets.length === 0 ? (
        <div className="warning-stack">
          <div className="empty-state">No Wake-on-LAN targets are configured in `dashboard/.env`.</div>
          {wolState.errors.map((error) => (
            <div key={error} className="feedback-banner" data-tone="danger">
              {error}
            </div>
          ))}
        </div>
      ) : (
        <div className="wol-list">
          {wolState.targets.map((target) => (
            <article key={target.id} className="wol-card">
              <div className="wol-card__top">
                <div>
                  <div className="service-id">{target.id}</div>
                  <h3>{target.label}</h3>
                </div>

                <button
                  type="button"
                  className="button button--solid button--sm"
                  disabled={busyTargetId === target.id}
                  onClick={() => onWake(target)}
                >
                  {busyTargetId === target.id ? "Waking..." : "Wake"}
                </button>
              </div>

              <div className="detail-grid">
                <div className="detail-pair">
                  <span>MAC</span>
                  <strong className="mono">{target.mac}</strong>
                </div>
                <div className="detail-pair">
                  <span>IP</span>
                  <strong>{target.ip ?? "n/a"}</strong>
                </div>
                <div className="detail-pair">
                  <span>Broadcast</span>
                  <strong>{target.broadcast}</strong>
                </div>
                <div className="detail-pair">
                  <span>Port</span>
                  <strong>{target.port}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
