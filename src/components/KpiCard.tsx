import { formatChange, formatPointChange } from "@/lib/format";

interface Props {
  label: string;
  value: string;
  /** change vs the previous period: relative for amounts, absolute (rate difference) for rates */
  change: number | null;
  /** "relative" shows +12.3%, "points" shows +1.2 pt (use for rates) */
  changeKind?: "relative" | "points";
  /** true when a decrease is the good direction (e.g. cancellation rate) */
  lowerIsBetter?: boolean;
  hint?: string;
}

export function KpiCard({ label, value, change, changeKind = "relative", lowerIsBetter = false, hint }: Props) {
  // below 0.05% / 0.05 pt the change is shown as ±0.0, so do not color it
  const good = change === null || Math.abs(change) < 0.0005 ? null : change > 0 !== lowerIsBetter;
  const tone = good === null ? "neutral" : good ? "good" : "bad";
  return (
    <div className="card kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className={`kpi-change ${tone}`}>
        {changeKind === "points" ? formatPointChange(change) : formatChange(change)} <span className="muted">vs previous period</span>
      </div>
      {hint ? <div className="kpi-hint muted">{hint}</div> : null}
    </div>
  );
}
