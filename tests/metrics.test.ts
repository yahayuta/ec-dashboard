import { describe, expect, it } from "vitest";
import { byChannel, bySegment, change, filterRows, latestDate, revenueSeries, rfmGrid, summarize } from "@/lib/metrics";
import type { DailyChannelSales, RfmCell } from "@/lib/types";

const row = (date: string, channel: string, netRevenue: number, extra: Partial<DailyChannelSales> = {}): DailyChannelSales => ({
  date,
  channel,
  orders: 2,
  completedOrders: 2,
  cancelledOrders: 0,
  returnedOrders: 0,
  netRevenue,
  grossMargin: netRevenue / 2,
  ...extra,
});

describe("summarize", () => {
  it("derives AOV, margin rate and loss rate from the totals", () => {
    const s = summarize([
      row("2025-01-01", "a", 10_000),
      row("2025-01-02", "b", 20_000, { orders: 4, completedOrders: 2, cancelledOrders: 1, returnedOrders: 1, grossMargin: 5_000 }),
    ]);
    expect(s.orders).toBe(6);
    expect(s.netRevenue).toBe(30_000);
    expect(s.averageOrderValue).toBe(7_500); // 30,000 / 4 completed orders
    expect(s.marginRate).toBeCloseTo(10_000 / 30_000);
    expect(s.lossRate).toBeCloseTo(2 / 6);
  });

  it("returns null ratios instead of dividing by zero", () => {
    const s = summarize([]);
    expect(s.averageOrderValue).toBeNull();
    expect(s.marginRate).toBeNull();
    expect(s.lossRate).toBeNull();
  });
});

describe("change", () => {
  it("is relative to the previous value", () => {
    expect(change(120, 100)).toBeCloseTo(0.2);
    expect(change(80, 100)).toBeCloseTo(-0.2);
    expect(change(5, 0)).toBeNull();
    expect(change(null, 1)).toBeNull();
  });
});

describe("filters and channels", () => {
  const rows = [row("2025-01-01", "a", 1), row("2025-01-05", "b", 2), row("2025-01-10", "a", 3)];

  it("filters by inclusive date range and channel", () => {
    expect(filterRows(rows, { start: "2025-01-01", end: "2025-01-05" })).toHaveLength(2);
    expect(filterRows(rows, { start: "2025-01-01", end: "2025-01-10" }, "a").map((r) => r.netRevenue)).toEqual([1, 3]);
  });

  it("finds the latest date", () => {
    expect(latestDate(rows)).toBe("2025-01-10");
    expect(latestDate([])).toBeNull();
  });

  it("ranks channels by revenue with shares that add up to 100%", () => {
    const c = byChannel(rows);
    expect(c.map((x) => x.channel)).toEqual(["a", "b"]);
    expect(c.reduce((n, x) => n + (x.revenueShare ?? 0), 0)).toBeCloseTo(1);
  });
});

describe("revenueSeries", () => {
  it("uses daily buckets for short ranges", () => {
    const ts = revenueSeries([row("2025-01-01", "a", 5), row("2025-01-03", "a", 7)], { start: "2025-01-01", end: "2025-01-03" }, ["a"]);
    expect(ts.binDays).toBe(1);
    expect(ts.buckets).toEqual(["2025-01-01", "2025-01-02", "2025-01-03"]);
    expect(ts.series[0]?.values).toEqual([5, 0, 7]);
  });

  it("uses weekly buckets counted back from the end, keeping every row once", () => {
    const range = { start: "2025-01-01", end: "2025-03-31" }; // 90 days -> 13 buckets
    const rows = [row("2025-01-01", "a", 1), row("2025-03-25", "a", 10), row("2025-03-31", "a", 100), row("2025-03-31", "b", 1_000)];
    const ts = revenueSeries(rows, range, ["a", "b"]);
    expect(ts.binDays).toBe(7);
    expect(ts.buckets).toHaveLength(13);
    expect(ts.buckets[0]).toBe("2025-01-01"); // first bucket is clipped to the range start
    expect(ts.buckets.at(-1)).toBe("2025-03-25"); // last bucket is a full week ending on Mar 31
    expect(ts.series[0]?.values.at(-1)).toBe(110);
    expect(ts.series[0]?.values[0]).toBe(1);
    const total = ts.series.flatMap((s) => s.values).reduce((a, b) => a + b, 0);
    expect(total).toBe(1_111);
  });
});

describe("RFM", () => {
  const cells: RfmCell[] = [
    { rScore: 5, fScore: 5, segment: "champions", customers: 10, monetary: 1_000_000, avgRecencyDays: 3 },
    { rScore: 1, fScore: 1, segment: "hibernating", customers: 30, monetary: 300_000, avgRecencyDays: 200 },
  ];

  it("summarizes every segment, including empty ones", () => {
    const s = bySegment(cells);
    expect(s.map((x) => x.segment)).toEqual(["champions", "loyal", "new_or_promising", "at_risk", "hibernating"]);
    const champions = s[0]!;
    expect(champions.customerShare).toBeCloseTo(0.25);
    expect(champions.revenuePerCustomer).toBe(100_000);
    expect(s[1]?.revenuePerCustomer).toBeNull();
  });

  it("places cells on a 5 x 5 grid", () => {
    const g = rfmGrid(cells);
    expect(g[4]?.[4]?.customers).toBe(10);
    expect(g[0]?.[0]?.segment).toBe("hibernating");
    expect(g[2]?.[2]).toBeNull();
  });
});

describe("formatting", async () => {
  const { formatChange, formatPointChange, channelLabel } = await import("@/lib/format");
  it("shows relative changes and rate differences differently", () => {
    expect(formatChange(0.123)).toBe("+12.3%");
    expect(formatChange(-0.05)).toBe("−5.0%");
    expect(formatPointChange(0.012)).toBe("+1.2 pt");
    expect(formatPointChange(0.0001)).toBe("±0.0 pt");
    expect(formatPointChange(null)).toBe("no baseline");
  });
  it("labels channels", () => {
    expect(channelLabel("marketplace_b")).toBe("Marketplace B");
    expect(channelLabel("own_store")).toBe("Own store");
  });
});
