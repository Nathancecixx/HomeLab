import { LineChart } from "@/components/line-chart";
import type { DashboardSnapshot } from "@/lib/types";
import {
  formatBitsPerSecond,
  formatBytes,
  formatPercent,
  formatSignedNumber,
  getPeak,
  getSeriesDelta,
} from "@/lib/view-model";

type TelemetryPanelProps = {
  snapshot: DashboardSnapshot;
};

export function TelemetryPanel({ snapshot }: TelemetryPanelProps) {
  const cpuPeak = getPeak(snapshot.history.cpuLoad);
  const memoryPeak = getPeak(snapshot.history.memoryUsedPct);
  const netPeak = getPeak([...snapshot.history.uploadBps, ...snapshot.history.downloadBps]);

  return (
    <section className="section-block surface">
      <div className="section-bar">
        <div className="section-heading">
          <span className="section-tag">Trend</span>
          <h2>Telemetry</h2>
        </div>

        <div className="inline-cluster">
          <span className="mini-note">Fast {Math.round(snapshot.meta.fastRefreshMs / 1000)}s</span>
          <span className="mini-note">Slow {Math.round(snapshot.meta.slowRefreshMs / 1000)}s</span>
        </div>
      </div>

      <div className="telemetry-grid">
        <article className="telemetry-card">
          <div className="telemetry-card__head">
            <div>
              <span className="section-tag">CPU</span>
              <strong>{formatPercent(snapshot.cpu.load)}</strong>
            </div>
            <span className="mini-note">
              {formatSignedNumber(getSeriesDelta(snapshot.history.cpuLoad))} pts
            </span>
          </div>

          <div className="telemetry-card__meta">
            <span>Peak {formatPercent(cpuPeak)}</span>
            <span>{snapshot.cpu.temp ? `${snapshot.cpu.temp.toFixed(1)} C` : "Temp n/a"}</span>
          </div>

          <div className="telemetry-card__chart">
            <LineChart
              ariaLabel="CPU trend"
              height={120}
              maxValue={100}
              series={[
                {
                  label: "CPU",
                  values: snapshot.history.cpuLoad,
                  stroke: "var(--tone-accent)",
                  fill: "rgba(69, 194, 255, 0.2)",
                },
              ]}
            />
          </div>
        </article>

        <article className="telemetry-card">
          <div className="telemetry-card__head">
            <div>
              <span className="section-tag">Memory</span>
              <strong>{formatPercent(snapshot.memory.usedPct)}</strong>
            </div>
            <span className="mini-note">
              {formatSignedNumber(getSeriesDelta(snapshot.history.memoryUsedPct))} pts
            </span>
          </div>

          <div className="telemetry-card__meta">
            <span>Peak {formatPercent(memoryPeak)}</span>
            <span>{snapshot.memory.usedLabel}</span>
          </div>

          <div className="telemetry-card__chart">
            <LineChart
              ariaLabel="Memory trend"
              height={120}
              maxValue={100}
              series={[
                {
                  label: "Memory",
                  values: snapshot.history.memoryUsedPct,
                  stroke: "var(--tone-info)",
                  fill: "rgba(102, 118, 255, 0.18)",
                },
              ]}
            />
          </div>
        </article>

        <article className="telemetry-card">
          <div className="telemetry-card__head">
            <div>
              <span className="section-tag">Net</span>
              <strong>{formatBitsPerSecond(snapshot.network.currentDownloadBps)}</strong>
            </div>
            <span className="mini-note">Peak {formatBitsPerSecond(netPeak)}</span>
          </div>

          <div className="telemetry-card__meta">
            <span>Down {formatBitsPerSecond(snapshot.network.currentDownloadBps)}</span>
            <span>Up {formatBitsPerSecond(snapshot.network.currentUploadBps)}</span>
          </div>

          <div className="telemetry-card__chart">
            <LineChart
              ariaLabel="Network throughput trend"
              height={120}
              series={[
                {
                  label: "Download",
                  values: snapshot.history.downloadBps,
                  stroke: "var(--tone-accent)",
                  fill: "rgba(69, 194, 255, 0.14)",
                },
                {
                  label: "Upload",
                  values: snapshot.history.uploadBps,
                  stroke: "var(--tone-warn)",
                  fill: "rgba(255, 183, 77, 0.14)",
                },
              ]}
            />
          </div>

          <div className="telemetry-card__meta telemetry-card__meta--footer">
            <span>Rx {formatBytes(snapshot.network.totalRxBytes)}</span>
            <span>Tx {formatBytes(snapshot.network.totalTxBytes)}</span>
          </div>
        </article>
      </div>
    </section>
  );
}
