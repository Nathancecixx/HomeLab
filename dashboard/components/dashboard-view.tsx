"use client";

import { startTransition, useEffect, useEffectEvent, useState } from "react";
import Link from "next/link";

import { CommandBar } from "@/components/command-bar";
import { DenseDataTable } from "@/components/data-table";
import { MetricTile } from "@/components/metric-tile";
import { ServicesBoard } from "@/components/services-board";
import { TelemetryPanel } from "@/components/telemetry-panel";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ContainerSnapshot, DashboardSnapshot, DiskSnapshot } from "@/lib/types";
import {
  formatBitsPerSecond,
  formatBytes,
  formatClock,
  formatDuration,
  formatPercent,
  formatSignedNumber,
  getSeriesDelta,
  levelLabel,
  toneForHealth,
  toneForUsage,
} from "@/lib/view-model";

type DashboardViewProps = {
  initialSnapshot: DashboardSnapshot;
};

export function DashboardView({ initialSnapshot }: DashboardViewProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [connectionState, setConnectionState] = useState<"live" | "reconnecting">("live");
  const [browserHost] = useState(() =>
    typeof window === "undefined" ? initialSnapshot.meta.hostname : window.location.hostname
  );

  const applySnapshot = useEffectEvent((nextSnapshot: DashboardSnapshot) => {
    startTransition(() => {
      setSnapshot(nextSnapshot);
      setConnectionState("live");
    });
  });

  useEffect(() => {
    const eventSource = new EventSource("/api/stream");
    eventSource.onmessage = (event) => {
      try {
        applySnapshot(JSON.parse(event.data) as DashboardSnapshot);
      } catch {
        setConnectionState("reconnecting");
      }
    };
    eventSource.onerror = () => {
      setConnectionState("reconnecting");
    };
    return () => {
      eventSource.close();
    };
  }, []);

  const runningServices = snapshot.services.filter((service) => service.running).length;
  const envReadyCount = snapshot.services.filter((service) => service.hasEnv).length;
  const primaryNetwork =
    snapshot.network.interfaces.find((item) => item.name === snapshot.network.primaryInterface) ??
    snapshot.network.interfaces[0];
  const highSignalNotes = snapshot.overview.notes.slice(0, 2);
  const fullestDisk = snapshot.storage.disks.reduce<DiskSnapshot | null>((fullest, disk) => {
    if (!fullest || disk.usagePct > fullest.usagePct) {
      return disk;
    }

    return fullest;
  }, null);

  return (
    <div className="shell">
      <div className="page">
        <CommandBar
          mark="BR"
          title="BigRedPi"
          status={{
            label: levelLabel(snapshot.overview.level),
            tone: toneForHealth(snapshot.overview.level),
          }}
          items={[
            { label: "Feed", value: connectionState === "live" ? "Live" : "Syncing", tone: connectionState === "live" ? "good" : "warning" },
            { label: "Fast", value: formatClock(snapshot.meta.lastFastRefreshAt) },
            { label: "Slow", value: formatClock(snapshot.meta.lastSlowRefreshAt) },
            { label: "Host", value: snapshot.meta.hostname },
          ]}
          actions={
            <>
              <ThemeToggle />
              <Link className="button button--ghost" href="/admin">
                Admin
              </Link>
            </>
          }
        />

        <main className="dashboard-stack">
          <section className="kpi-strip">
            <MetricTile
              label="CPU"
              value={formatPercent(snapshot.cpu.load)}
              note={`${formatSignedNumber(getSeriesDelta(snapshot.history.cpuLoad))} pts`}
              tone={toneForHealth(snapshot.overview.level)}
              progress={snapshot.cpu.load}
              maxValue={100}
              chartLabel="CPU sparkline"
              series={[
                {
                  label: "CPU",
                  values: snapshot.history.cpuLoad,
                  stroke: "var(--tone-accent)",
                  fill: "rgba(69, 194, 255, 0.18)",
                },
              ]}
              details={[
                { label: "Temp", value: snapshot.cpu.temp ? `${snapshot.cpu.temp.toFixed(1)} C` : "n/a" },
                { label: "Cores", value: String(snapshot.cpu.cores) },
              ]}
            />

            <MetricTile
              label="Memory"
              value={snapshot.memory.usedLabel}
              note={`${formatPercent(snapshot.memory.usedPct)}`}
              tone={snapshot.memory.usedPct >= 85 ? "warning" : "good"}
              progress={snapshot.memory.usedPct}
              maxValue={100}
              chartLabel="Memory sparkline"
              series={[
                {
                  label: "Memory",
                  values: snapshot.history.memoryUsedPct,
                  stroke: "var(--tone-info)",
                  fill: "rgba(102, 118, 255, 0.16)",
                },
              ]}
              details={[
                { label: "Free", value: snapshot.memory.freeLabel },
                { label: "Total", value: snapshot.memory.totalLabel },
              ]}
            />

            <MetricTile
              label="Storage"
              value={fullestDisk ? formatPercent(fullestDisk.usagePct) : "n/a"}
              note={fullestDisk?.mount ?? "No disks"}
              tone={fullestDisk ? toneForUsage(fullestDisk.usagePct) : "neutral"}
              progress={fullestDisk?.usagePct}
              details={[
                { label: "Used", value: fullestDisk?.usedLabel ?? "n/a" },
                { label: "Free", value: fullestDisk?.freeLabel ?? "n/a" },
              ]}
            />

            <MetricTile
              label="Uptime"
              value={formatDuration(snapshot.uptime.uptimeSec)}
              note={snapshot.meta.kernel}
              tone="accent"
              details={[
                { label: "Boot", value: formatClock(snapshot.uptime.boot) },
                { label: "TZ", value: snapshot.meta.timeZone },
              ]}
            />

            <MetricTile
              label="Ops"
              value={`${runningServices}/${snapshot.services.length}`}
              note={`${snapshot.docker.running}/${snapshot.docker.count} containers`}
              tone={snapshot.meta.dockerError ? "warning" : runningServices === snapshot.services.length ? "good" : "warning"}
              details={[
                { label: ".env", value: `${envReadyCount}/${snapshot.services.length}` },
                { label: "Docker", value: snapshot.meta.dockerError ? "Degraded" : "Ready" },
              ]}
            />
          </section>

          <section className="body-grid">
            <ServicesBoard services={snapshot.services} hostname={browserHost} />

            <div className="body-sidebar">
              <section className="section-block surface">
                <div className="section-bar">
                  <div className="section-heading">
                    <span className="section-tag">Host</span>
                    <h2>System</h2>
                  </div>
                  <span className="signal" data-tone={toneForHealth(snapshot.overview.level)}>
                    {snapshot.meta.platform}
                  </span>
                </div>

                <div className="detail-grid">
                  <div className="detail-pair">
                    <span>Host</span>
                    <strong>{snapshot.meta.hostname}</strong>
                  </div>
                  <div className="detail-pair">
                    <span>Kernel</span>
                    <strong>{snapshot.meta.kernel}</strong>
                  </div>
                  <div className="detail-pair">
                    <span>Node</span>
                    <strong>{snapshot.meta.node}</strong>
                  </div>
                  <div className="detail-pair">
                    <span>Clock</span>
                    <strong>{formatClock(snapshot.meta.now)}</strong>
                  </div>
                  <div className="detail-pair">
                    <span>Mode</span>
                    <strong>{snapshot.meta.hostTelemetry ? "Host" : "Fallback"}</strong>
                  </div>
                </div>

                <div className="chip-row">
                  {highSignalNotes.map((note) => (
                    <span key={note} className="chip">
                      {note}
                    </span>
                  ))}
                  {snapshot.overview.notes.length > highSignalNotes.length ? (
                    <span className="mini-note">+{snapshot.overview.notes.length - highSignalNotes.length} more</span>
                  ) : null}
                </div>
              </section>

              <section className="section-block surface">
                <div className="section-bar">
                  <div className="section-heading">
                    <span className="section-tag">Net</span>
                    <h2>{primaryNetwork?.name ?? "Offline"}</h2>
                  </div>
                  <span className="signal" data-tone={connectionState === "live" ? "good" : "warning"}>
                    {connectionState === "live" ? "Live" : "Syncing"}
                  </span>
                </div>

                {primaryNetwork ? (
                  <div className="detail-grid">
                    <div className="detail-pair">
                      <span>IPv4</span>
                      <strong>{primaryNetwork.ip4 || "No address"}</strong>
                    </div>
                    <div className="detail-pair">
                      <span>MAC</span>
                      <strong className="mono">{primaryNetwork.mac || "n/a"}</strong>
                    </div>
                    <div className="detail-pair">
                      <span>Down</span>
                      <strong>{formatBitsPerSecond(snapshot.network.currentDownloadBps)}</strong>
                    </div>
                    <div className="detail-pair">
                      <span>Up</span>
                      <strong>{formatBitsPerSecond(snapshot.network.currentUploadBps)}</strong>
                    </div>
                    <div className="detail-pair">
                      <span>Rx</span>
                      <strong>{formatBytes(snapshot.network.totalRxBytes)}</strong>
                    </div>
                    <div className="detail-pair">
                      <span>Tx</span>
                      <strong>{formatBytes(snapshot.network.totalTxBytes)}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">No active network interface.</div>
                )}
              </section>
            </div>
          </section>

          <TelemetryPanel snapshot={snapshot} />

          <section className="inventory-grid">
            <DenseDataTable
              label="Disk"
              title="Storage"
              meta={<span className="mini-note">{snapshot.storage.totalCount} mounts</span>}
              rows={snapshot.storage.disks}
              getRowKey={(disk) => disk.mount}
              getRowTone={(disk) => toneForUsage(disk.usagePct)}
              columns={[
                {
                  key: "mount",
                  label: "Mount",
                  render: (disk: DiskSnapshot) => (
                    <div>
                      <strong>{disk.mount}</strong>
                      <div className="table-note mono">{disk.sizeLabel}</div>
                    </div>
                  ),
                },
                {
                  key: "used",
                  label: "Used",
                  render: (disk: DiskSnapshot) => disk.usedLabel,
                },
                {
                  key: "free",
                  label: "Free",
                  render: (disk: DiskSnapshot) => disk.freeLabel,
                },
                {
                  key: "usage",
                  label: "Usage",
                  render: (disk: DiskSnapshot) => (
                    <div className="usage-cell">
                      <strong>{formatPercent(disk.usagePct)}</strong>
                      <div className="meter meter--compact" aria-hidden="true">
                        <span style={{ width: `${Math.max(0, Math.min(disk.usagePct, 100))}%` }} />
                      </div>
                    </div>
                  ),
                },
              ]}
            />

            <DenseDataTable
              label="Docker"
              title="Containers"
              meta={
                <span className="mini-note">
                  {snapshot.docker.running}/{snapshot.docker.count} running
                </span>
              }
              rows={snapshot.docker.containers}
              getRowKey={(container) => container.name}
              getRowTone={(container) => (container.up ? "good" : "danger")}
              emptyState={snapshot.meta.dockerError ?? "No containers detected."}
              columns={[
                {
                  key: "name",
                  label: "Name",
                  render: (container: ContainerSnapshot) => <strong>{container.name}</strong>,
                },
                {
                  key: "image",
                  label: "Image",
                  className: "cell-truncate",
                  render: (container: ContainerSnapshot) => (
                    <span className="table-note cell-truncate">{container.image}</span>
                  ),
                },
                {
                  key: "status",
                  label: "State",
                  render: (container: ContainerSnapshot) => (
                    <span className="signal" data-tone={container.up ? "good" : "danger"}>
                      {container.status}
                    </span>
                  ),
                },
                {
                  key: "ports",
                  label: "Ports",
                  className: "cell-truncate",
                  render: (container: ContainerSnapshot) => (
                    <span className="table-note cell-truncate">{container.ports || "None"}</span>
                  ),
                },
              ]}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
