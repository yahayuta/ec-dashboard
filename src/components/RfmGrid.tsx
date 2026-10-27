import { formatInt, formatYen, SEGMENT_INFO } from "@/lib/format";
import type { RfmCell } from "@/lib/types";

interface Props {
  grid: (RfmCell | null)[][];
}

/** R score on the vertical axis (5 = bought most recently), F score on the horizontal axis. */
export function RfmGrid({ grid }: Props) {
  const max = Math.max(1, ...grid.flat().map((c) => c?.customers ?? 0));
  const rows = [5, 4, 3, 2, 1];
  return (
    <div className="rfm">
      <table className="rfm-grid">
        <caption>Customers by recency (R) and frequency (F) score</caption>
        <thead>
          <tr>
            <th scope="col">R \ F</th>
            {[1, 2, 3, 4, 5].map((f) => (
              <th key={f} scope="col">
                F{f}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r}>
              <th scope="row">R{r}</th>
              {[1, 2, 3, 4, 5].map((f) => {
                const c = grid[r - 1]?.[f - 1] ?? null;
                if (!c) return <td key={f} className="empty">–</td>;
                const strength = 0.15 + 0.85 * (c.customers / max);
                return (
                  <td
                    key={f}
                    className={`seg-${c.segment}`}
                    style={{ ["--strength" as string]: strength.toFixed(2) }}
                    title={`${SEGMENT_INFO[c.segment].label}: ${formatInt(c.customers)} customers, ${formatYen(c.monetary)}, avg ${c.avgRecencyDays.toFixed(0)} days since last order`}
                  >
                    <span className="rfm-count">{formatInt(c.customers)}</span>
                    <span className="rfm-seg">{SEGMENT_INFO[c.segment].label}</span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
