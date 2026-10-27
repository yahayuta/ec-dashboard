import { formatShortDate, formatYenCompact } from "@/lib/format";

export interface ChartSeries {
  label: string;
  values: number[];
  /** CSS color, e.g. "var(--series-1)" */
  color: string;
}

interface Props {
  title: string;
  buckets: string[];
  series: ChartSeries[];
}

const W = 720;
const H = 260;
const PAD = { top: 16, right: 16, bottom: 28, left: 56 };

/** Rounds the axis maximum up to 1, 2 or 5 x 10^n. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const exp = 10 ** Math.floor(Math.log10(value));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

export function LineChart({ title, buckets, series }: Props) {
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (buckets.length <= 1 ? innerW / 2 : (i / (buckets.length - 1)) * innerW);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.max(1, Math.ceil(buckets.length / 6));

  return (
    <figure className="chart">
      <figcaption className="chart-title">{title}</figcaption>
      <ul className="legend" aria-hidden="true">
        {series.map((s) => (
          <li key={s.label}>
            <span className="swatch" style={{ background: s.color }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="chart-scroll">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="axis" x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle">
              {formatYenCompact(t)}
            </text>
          </g>
        ))}
        {buckets.map((b, i) =>
          i % labelEvery === 0 || i === buckets.length - 1 ? (
            <text
              key={b}
              className="axis"
              x={x(i)}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === buckets.length - 1 ? "end" : "middle"}
            >
              {formatShortDate(b)}
            </text>
          ) : null,
        )}
        {series.map((s) => (
          <polyline
            key={s.label}
            fill="none"
            stroke={s.color}
            strokeWidth={2}
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
          >
            <title>{s.label}</title>
          </polyline>
        ))}
      </svg>
      </div>
    </figure>
  );
}
