export type LineChartSeries = {
  label: string;
  values: number[];
  stroke: string;
  fill: string;
};

type LineChartProps = {
  series: LineChartSeries[];
  ariaLabel: string;
  compact?: boolean;
  gridLines?: number;
  height?: number;
  maxValue?: number;
};

function toPath(values: number[], width: number, height: number, max: number) {
  if (values.length === 0) {
    return "";
  }

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function toFill(values: number[], width: number, height: number, max: number) {
  const line = toPath(values, width, height, max);
  if (!line) {
    return "";
  }

  return `${line} L ${width} ${height} L 0 ${height} Z`;
}

export function LineChart({
  series,
  ariaLabel,
  compact = false,
  gridLines = 4,
  height = 160,
  maxValue,
}: LineChartProps) {
  const width = 320;
  const max = maxValue ?? Math.max(1, ...series.flatMap((item) => item.values));

  return (
    <svg
      className="line-chart"
      data-compact={compact}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
    >
      {Array.from({ length: gridLines }, (_, index) => (index + 1) / gridLines).map((ratio) => (
        <line
          key={ratio}
          className="grid-line"
          x1="0"
          y1={(height * ratio).toFixed(2)}
          x2={String(width)}
          y2={(height * ratio).toFixed(2)}
        />
      ))}
      {series.map((item) => (
        <path key={`${item.label}-fill`} d={toFill(item.values, width, height, max)} fill={item.fill} className="series-fill" />
      ))}
      {series.map((item) => (
        <path key={item.label} d={toPath(item.values, width, height, max)} stroke={item.stroke} className="series-line" />
      ))}
    </svg>
  );
}
