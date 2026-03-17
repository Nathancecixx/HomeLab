import { LineChart, type LineChartSeries } from "@/components/line-chart";
import type { Tone } from "@/lib/view-model";

type MetricDetail = {
  label: string;
  value: string;
};

type MetricTileProps = {
  label: string;
  value: string;
  note?: string;
  tone?: Tone;
  details: MetricDetail[];
  series?: LineChartSeries[];
  chartLabel?: string;
  maxValue?: number;
  progress?: number;
};

export function MetricTile({
  label,
  value,
  note,
  tone = "neutral",
  details,
  series,
  chartLabel,
  maxValue,
  progress,
}: MetricTileProps) {
  return (
    <article className="metric-tile surface" data-tone={tone}>
      <div className="metric-tile__head">
        <span className="section-tag">{label}</span>
        {note ? (
          <span className="mini-note" data-tone={tone}>
            {note}
          </span>
        ) : null}
      </div>

      <strong className="metric-tile__value">{value}</strong>

      {typeof progress === "number" ? (
        <div className="meter" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
        </div>
      ) : null}

      {series ? (
        <div className="metric-tile__spark">
          <LineChart
            ariaLabel={chartLabel ?? `${label} trend`}
            compact
            gridLines={0}
            height={64}
            maxValue={maxValue}
            series={series}
          />
        </div>
      ) : null}

      <div className="metric-tile__details">
        {details.map((detail) => (
          <div key={detail.label} className="detail-pair">
            <span>{detail.label}</span>
            <strong>{detail.value}</strong>
          </div>
        ))}
      </div>
    </article>
  );
}
