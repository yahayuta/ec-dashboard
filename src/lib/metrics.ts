import { addDays, daysBetween, inRange, type DateRange } from "./period";
import { SEGMENTS, type DailyChannelSales, type RfmCell, type Segment } from "./types";

export interface Summary {
  orders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  netRevenue: number;
  grossMargin: number;
  /** net revenue per completed order */
  averageOrderValue: number | null;
  /** gross margin / net revenue */
  marginRate: number | null;
  /** (cancelled + returned) / orders */
  lossRate: number | null;
}

const ratio = (a: number, b: number): number | null => (b === 0 ? null : a / b);

export function summarize(rows: readonly DailyChannelSales[]): Summary {
  const t = rows.reduce(
    (acc, r) => {
      acc.orders += r.orders;
      acc.completedOrders += r.completedOrders;
      acc.cancelledOrders += r.cancelledOrders;
      acc.returnedOrders += r.returnedOrders;
      acc.netRevenue += r.netRevenue;
      acc.grossMargin += r.grossMargin;
      return acc;
    },
    { orders: 0, completedOrders: 0, cancelledOrders: 0, returnedOrders: 0, netRevenue: 0, grossMargin: 0 },
  );
  return {
    ...t,
    averageOrderValue: ratio(t.netRevenue, t.completedOrders),
    marginRate: ratio(t.grossMargin, t.netRevenue),
    lossRate: ratio(t.cancelledOrders + t.returnedOrders, t.orders),
  };
}

/** Relative change from previous to current; null when there is no baseline. */
export function change(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function filterRows(
  rows: readonly DailyChannelSales[],
  range: DateRange,
  channel?: string,
): DailyChannelSales[] {
  return rows.filter((r) => inRange(r.date, range) && (channel === undefined || r.channel === channel));
}

export function latestDate(rows: readonly DailyChannelSales[]): string | null {
  let max: string | null = null;
  for (const r of rows) if (max === null || r.date > max) max = r.date;
  return max;
}

export function channelsOf(rows: readonly DailyChannelSales[]): string[] {
  return [...new Set(rows.map((r) => r.channel))].sort();
}

export interface ChannelSummary extends Summary {
  channel: string;
  /** share of total net revenue in the same rows */
  revenueShare: number | null;
}

export function byChannel(rows: readonly DailyChannelSales[]): ChannelSummary[] {
  const total = summarize(rows).netRevenue;
  return channelsOf(rows)
    .map((channel) => {
      const s = summarize(rows.filter((r) => r.channel === channel));
      return { channel, ...s, revenueShare: ratio(s.netRevenue, total) };
    })
    .sort((a, b) => b.netRevenue - a.netRevenue);
}

export interface TimeSeries {
  /** first day of each bucket */
  buckets: string[];
  binDays: number;
  /** net revenue per channel, aligned with buckets */
  series: { channel: string; values: number[] }[];
}

/**
 * Net revenue per channel in fixed buckets. Short ranges use daily buckets,
 * longer ones weekly buckets counted back from the end of the range so the
 * latest bucket is always a full week.
 */
export function revenueSeries(
  rows: readonly DailyChannelSales[],
  range: DateRange,
  channels: readonly string[],
): TimeSeries {
  const totalDays = daysBetween(range.start, range.end) + 1;
  const binDays = totalDays <= 31 ? 1 : 7;
  const count = Math.ceil(totalDays / binDays);
  // bucket i covers [end - (count - i) * bin + 1, end - (count - 1 - i) * bin]
  const buckets = Array.from({ length: count }, (_, i) => {
    const first = addDays(range.end, -((count - i) * binDays - 1));
    return first < range.start ? range.start : first;
  });
  const series = channels.map((channel) => ({ channel, values: new Array<number>(count).fill(0) }));
  const index = new Map(series.map((s) => [s.channel, s.values]));
  for (const r of rows) {
    if (!inRange(r.date, range)) continue;
    const values = index.get(r.channel);
    if (!values) continue;
    const fromEnd = daysBetween(r.date, range.end);
    const bucket = count - 1 - Math.floor(fromEnd / binDays);
    values[bucket] = (values[bucket] ?? 0) + r.netRevenue;
  }
  return { buckets, binDays, series };
}

export interface SegmentSummary {
  segment: Segment;
  customers: number;
  monetary: number;
  customerShare: number | null;
  revenueShare: number | null;
  revenuePerCustomer: number | null;
}

export function bySegment(cells: readonly RfmCell[]): SegmentSummary[] {
  const totalCustomers = cells.reduce((n, c) => n + c.customers, 0);
  const totalRevenue = cells.reduce((n, c) => n + c.monetary, 0);
  return SEGMENTS.map((segment) => {
    const own = cells.filter((c) => c.segment === segment);
    const customers = own.reduce((n, c) => n + c.customers, 0);
    const monetary = own.reduce((n, c) => n + c.monetary, 0);
    return {
      segment,
      customers,
      monetary,
      customerShare: ratio(customers, totalCustomers),
      revenueShare: ratio(monetary, totalRevenue),
      revenuePerCustomer: ratio(monetary, customers),
    };
  });
}

/** 5 x 5 grid indexed [rScore - 1][fScore - 1]; empty cells are null. */
export function rfmGrid(cells: readonly RfmCell[]): (RfmCell | null)[][] {
  const grid: (RfmCell | null)[][] = Array.from({ length: 5 }, () => new Array<RfmCell | null>(5).fill(null));
  for (const c of cells) {
    const row = grid[c.rScore - 1];
    if (row && c.fScore >= 1 && c.fScore <= 5) {
      const prev = row[c.fScore - 1];
      row[c.fScore - 1] = prev
        ? {
            ...prev,
            customers: prev.customers + c.customers,
            monetary: prev.monetary + c.monetary,
            avgRecencyDays:
              (prev.avgRecencyDays * prev.customers + c.avgRecencyDays * c.customers) / (prev.customers + c.customers),
          }
        : c;
    }
  }
  return grid;
}
