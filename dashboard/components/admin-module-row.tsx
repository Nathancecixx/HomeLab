import type { AdminAction, ServiceSnapshot } from "@/lib/types";
import { buildAppHref, getServiceIssueLabel, serviceLabel, toneForService } from "@/lib/view-model";

type AdminModuleRowProps = {
  service: ServiceSnapshot;
  browserHost: string;
  busyAction: string | null;
  onAction: (serviceId: string, action: AdminAction) => void;
  onOpenEnv: (serviceId: string) => void;
};

export function AdminModuleRow({
  service,
  browserHost,
  busyAction,
  onAction,
  onOpenEnv,
}: AdminModuleRowProps) {
  const href = buildAppHref(service, browserHost);
  const tone = toneForService(service.health);
  const issueLabel = getServiceIssueLabel(service);

  return (
    <article className="module-row" data-tone={tone}>
      <div className="module-row__main">
        <div className="module-row__identity">
          <div className="service-id">{service.id}</div>
          <h3>{service.label}</h3>
        </div>

        <div className="module-row__facts">
          <span className="signal" data-tone={tone}>
            {serviceLabel(service.health)}
          </span>
          <span className="mini-note">
            {service.runningServices.length}/{Math.max(service.definedServices.length, service.runningServices.length)} compose
          </span>
          <span className="mini-note">{service.hasEnv ? ".env ready" : ".env missing"}</span>
          {href ? (
            <a className="button button--ghost button--sm" href={href} target="_blank" rel="noreferrer">
              {service.app?.label}
            </a>
          ) : (
            <span className="mini-note">No UI</span>
          )}
        </div>
      </div>

      <div className="module-row__actions">
        {(["start", "stop", "restart"] as AdminAction[]).map((action) => (
          <button
            key={action}
            type="button"
            className="button button--ghost button--sm"
            disabled={busyAction === `${service.id}:${action}`}
            onClick={() => onAction(service.id, action)}
          >
            {busyAction === `${service.id}:${action}` ? `${action}...` : action}
          </button>
        ))}

        <button
          type="button"
          className="button button--solid button--sm"
          disabled={busyAction === `env:${service.id}`}
          onClick={() => onOpenEnv(service.id)}
        >
          {service.hasEnv ? "Edit env" : "Create env"}
        </button>
      </div>

      {issueLabel ? <div className="module-row__note">{issueLabel}</div> : null}
    </article>
  );
}
