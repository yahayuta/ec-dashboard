import { FilterLinks } from "@/components/FilterLinks";
import { KpiCard } from "@/components/KpiCard";
import { LineChart } from "@/components/LineChart";
import { getDataSource } from "@/lib/data";
import { channelLabel, formatChange, formatInt, formatPct, formatShortDate, formatYen } from "@/lib/format";
import {
  byChannel,
  change,
  channelsOf,
  filterRows,
  latestDate,
  revenueSeries,
  summarize,
} from "@/lib/metrics";
import { PERIODS, parsePeriod, resolvePeriod, type PeriodKey } from "@/lib/period";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SalesPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const source = await getDataSource();
  const rows = await source.dailyChannelSales();
  const latest = latestDate(rows);
  if (latest === null) return <p className="card">No sales data yet.</p>;

  const allChannels = channelsOf(rows);
  const channelParam = Array.isArray(params.channel) ? params.channel[0] : params.channel;
  const channel = channelParam && allChannels.includes(channelParam) ? channelParam : undefined;

  const { current, previous } = resolvePeriod(latest, period);
  const now = summarize(filterRows(rows, current, channel));
  const before = summarize(filterRows(rows, previous, channel));
  const hasPrevious = filterRows(rows, previous).length > 0;
  const cmp = (a: number | null, b: number | null) => (hasPrevious ? change(a, b) : null);
  const diff = (a: number | null, b: number | null) => (hasPrevious && a !== null && b !== null ? a - b : null);

  const chartChannels = channel ? [channel] : allChannels;
  const ts = revenueSeries(rows, current, chartChannels);
  const channelRows = byChannel(filterRows(rows, current));
  const prevByChannel = new Map(byChannel(filterRows(rows, previous)).map((c) => [c.channel, c]));

  const periodOptions = (Object.keys(PERIODS) as PeriodKey[]).map((k) => ({ value: k, label: PERIODS[k].label }));
  const channelOptions = [
    { value: undefined, label: "All channels" },
    ...allChannels.map((c) => ({ value: c, label: channelLabel(c) })),
  ];

  return (
    <>
      <div className="page-head">
        <h1>Sales</h1>
        <p className="muted">
          {formatShortDate(current.start)} – {formatShortDate(current.end)}, {current.end.slice(0, 4)} · compared with{" "}
          {formatShortDate(previous.start)} – {formatShortDate(previous.end)} · source: {source.name}
        </p>
      </div>

      <FilterLinks label="Period" param="period" current={period} options={periodOptions} keep={{ channel }} />
      <FilterLinks label="Channel" param="channel" current={channel} options={channelOptions} keep={{ period }} />

      <section className="kpis" aria-label="Key figures">
        <KpiCard label="Net revenue" value={formatYen(now.netRevenue)} change={cmp(now.netRevenue, before.netRevenue)} hint="Completed orders only" />
        <KpiCard label="Orders" value={formatInt(now.orders)} change={cmp(now.orders, before.orders)} />
        <KpiCard
          label="Average order value"
          value={formatYen(now.averageOrderValue)}
          change={cmp(now.averageOrderValue, before.averageOrderValue)}
        />
        <KpiCard
          label="Gross margin rate"
          value={formatPct(now.marginRate)}
          change={diff(now.marginRate, before.marginRate)}
          changeKind="points"
        />
        <KpiCard
          label="Cancelled or returned"
          value={formatPct(now.lossRate)}
          change={diff(now.lossRate, before.lossRate)}
          changeKind="points"
          lowerIsBetter
          hint="Share of all orders"
        />
      </section>

      <section className="card">
        <LineChart
          title={`Net revenue per ${ts.binDays === 1 ? "day" : "week"}`}
          buckets={ts.buckets}
          series={ts.series.map((s) => ({
            label: channelLabel(s.channel),
            values: s.values,
            color: `var(--series-${allChannels.indexOf(s.channel) + 1})`,
          }))}
        />
      </section>

      <section className="card">
        <h2>Channels</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Channel</th>
                <th scope="col" className="num">Net revenue</th>
                <th scope="col" className="num">vs previous</th>
                <th scope="col" className="num">Share</th>
                <th scope="col" className="num">Orders</th>
                <th scope="col" className="num">AOV</th>
                <th scope="col" className="num">Margin rate</th>
                <th scope="col" className="num">Cancelled / returned</th>
              </tr>
            </thead>
            <tbody>
              {channelRows.map((c) => (
                <tr key={c.channel} className={channel && channel !== c.channel ? "dim" : undefined}>
                  <th scope="row">
                    <span className="swatch" style={{ background: `var(--series-${allChannels.indexOf(c.channel) + 1})` }} />
                    {channelLabel(c.channel)}
                  </th>
                  <td className="num">{formatYen(c.netRevenue)}</td>
                  <td className="num">{formatChange(cmp(c.netRevenue, prevByChannel.get(c.channel)?.netRevenue ?? null))}</td>
                  <td className="num">{formatPct(c.revenueShare)}</td>
                  <td className="num">{formatInt(c.orders)}</td>
                  <td className="num">{formatYen(c.averageOrderValue)}</td>
                  <td className="num">{formatPct(c.marginRate)}</td>
                  <td className="num">{formatPct(c.lossRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
