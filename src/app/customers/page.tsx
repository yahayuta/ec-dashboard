import { RfmGrid } from "@/components/RfmGrid";
import { getDataSource } from "@/lib/data";
import { formatInt, formatPct, formatYen, SEGMENT_INFO } from "@/lib/format";
import { bySegment, rfmGrid } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const source = await getDataSource();
  const cells = await source.rfmCells();
  const segments = bySegment(cells);
  const total = segments.reduce((n, s) => n + s.customers, 0);
  if (total === 0) return <p className="card">No customer data yet.</p>;

  return (
    <>
      <div className="page-head">
        <h1>Customers</h1>
        <p className="muted">
          RFM segments of {formatInt(total)} customers with at least one completed order. Recency is counted from the
          latest order in the data · source: {source.name}
        </p>
      </div>

      <section className="segments" aria-label="Segments">
        {segments.map((s) => (
          <div key={s.segment} className={`card segment seg-${s.segment}`}>
            <div className="segment-name">{SEGMENT_INFO[s.segment].label}</div>
            <div className="kpi-value">{formatInt(s.customers)}</div>
            <div className="muted">
              {formatPct(s.customerShare)} of customers · {formatPct(s.revenueShare)} of revenue
            </div>
            <div className="muted">{formatYen(s.revenuePerCustomer)} per customer</div>
            <p className="segment-action">{SEGMENT_INFO[s.segment].action}</p>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>R × F matrix</h2>
        <RfmGrid grid={rfmGrid(cells)} />
      </section>
    </>
  );
}
