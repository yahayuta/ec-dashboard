import { describe, expect, it } from "vitest";
import { createBigQuerySource, dailySql, mapDailyRow, tableRef, type QueryClient } from "@/lib/data/bigquery";
import { withCache } from "@/lib/data/cache";

const config = { projectId: "demo-project", dataset: "marts", location: "asia-northeast1" };

describe("BigQuery source", () => {
  it("rejects identifiers that could change the SQL", () => {
    expect(tableRef("demo-project", "marts", "fct_orders")).toBe("`demo-project.marts.fct_orders`");
    expect(() => tableRef("demo", "marts`; drop table x; --", "t")).toThrow(/dataset/);
    expect(() => tableRef("demo project", "marts", "t")).toThrow(/project/);
  });

  it("passes the lookback window as a query parameter", async () => {
    const calls: unknown[] = [];
    const client = {
      query: async (options: unknown) => {
        calls.push(options);
        return [[
          {
            ordered_on: "2025-12-31",
            channel: "own_store",
            orders: 3,
            completed_orders: 2,
            cancelled_orders: 1,
            returned_orders: 0,
            net_revenue: { value: "12345" },
            gross_margin: 6000,
          },
        ]];
      },
    } as unknown as QueryClient;
    const rows = await createBigQuerySource({ ...config, lookbackDays: 400 }, client).dailyChannelSales();
    expect(rows).toEqual([
      { date: "2025-12-31", channel: "own_store", orders: 3, completedOrders: 2, cancelledOrders: 1, returnedOrders: 0, netRevenue: 12345, grossMargin: 6000 },
    ]);
    expect(calls[0]).toMatchObject({ params: { lookback_days: 400 }, location: "asia-northeast1" });
    expect(dailySql(config)).toContain("@lookback_days");
  });

  it("fails loudly on values that are not numbers", () => {
    expect(() => mapDailyRow({ ordered_on: "2025-01-01", channel: "a", orders: "x" })).toThrow(/number/);
  });
});

describe("withCache", () => {
  it("reuses results within the TTL and drops failures", async () => {
    let t = 0;
    let calls = 0;
    let fail = true;
    const source = withCache(
      {
        name: "bigquery",
        dailyChannelSales: async () => {
          calls++;
          if (fail) throw new Error("boom");
          return [];
        },
        rfmCells: async () => [],
      },
      1_000,
      () => t,
    );
    await expect(source.dailyChannelSales()).rejects.toThrow("boom");
    fail = false;
    await source.dailyChannelSales(); // the failure was not cached
    await source.dailyChannelSales(); // cached
    expect(calls).toBe(2);
    t = 1_000;
    await source.dailyChannelSales(); // expired
    expect(calls).toBe(3);
  });
});
