import type { ServiceSnapshot } from "@/lib/types";
import { buildAppHref, getServiceIssueLabel, serviceLabel, toneForService } from "@/lib/view-model";

type ServicesBoardProps = {
  services: ServiceSnapshot[];
  hostname: string;
};

export function ServicesBoard({ services, hostname }: ServicesBoardProps) {
  const runningCount = services.filter((service) => service.running).length;
  const appCount = services.filter((service) => service.app).length;

  return (
    <section className="section-block surface">
      <div className="section-bar">
        <div className="section-heading">
          <span className="section-tag">Ops</span>
          <h2>Modules</h2>
        </div>

        <div className="inline-cluster">
          <span className="signal" data-tone={runningCount === services.length ? "good" : "warning"}>
            {runningCount}/{services.length} live
          </span>
          <span className="mini-note">{appCount} UIs</span>
        </div>
      </div>

      <div className="ops-grid">
        {services.map((service) => {
          const href = buildAppHref(service, hostname);
          const issueLabel = getServiceIssueLabel(service);
          return (
            <article key={service.id} className="service-tile" data-tone={toneForService(service.health)}>
              <div className="service-tile__top">
                <div>
                  <div className="service-id">{service.id}</div>
                  <h3>{service.label}</h3>
                </div>
                <span className="signal" data-tone={toneForService(service.health)}>
                  {serviceLabel(service.health)}
                </span>
              </div>

              <div className="service-tile__stats">
                <div className="detail-pair">
                  <span>Compose</span>
                  <strong>
                    {service.runningServices.length}/
                    {Math.max(service.definedServices.length, service.runningServices.length)}
                  </strong>
                </div>
                <div className="detail-pair">
                  <span>.env</span>
                  <strong>{service.hasEnv ? "Ready" : "Missing"}</strong>
                </div>
                <div className="detail-pair">
                  <span>Project</span>
                  <strong className="mono">{service.composeProject}</strong>
                </div>
                <div className="detail-pair">
                  <span>Surface</span>
                  <strong>{service.app?.label ?? "None"}</strong>
                </div>
              </div>

              <div className="service-tile__footer">
                {issueLabel ? (
                  <span className="mini-note" data-tone="danger">
                    {issueLabel}
                  </span>
                ) : null}
                {href ? (
                  <a className="button button--ghost button--sm service-tile__action" href={href} target="_blank" rel="noreferrer">
                    {service.app?.label}
                  </a>
                ) : (
                  <span className="mini-note service-tile__action">No UI</span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
