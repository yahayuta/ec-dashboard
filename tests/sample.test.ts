import { describe, expect, it } from "vitest";
import { createSampleSource, decodeDaily } from "@/lib/data/sample";
import { summarize } from "@/lib/metrics";

describe("sample data", () => {
  it("decodes the bundled marts", async () => {
    const source = createSampleSource();
    const rows = await source.dailyChannelSales();
    const cells = await source.rfmCells();
    expect(rows.length).toBeGreaterThan(1_000);
    expect(rows[0]?.date).toBe("2025-01-01");
    expect(new Set(rows.map((r) => r.channel))).toEqual(new Set(["marketplace_a", "marketplace_b", "marketplace_c", "own_store"]));
    expect(cells.reduce((n, c) => n + c.customers, 0)).toBe(800);
  });

  it("keeps the same totals as the mart (completed orders only)", async () => {
    const rows = await createSampleSource().dailyChannelSales();
    const s = summarize(rows);
    expect(s.orders).toBe(5_000);
    expect(s.netRevenue).toBe(40_578_195);
    expect(rows.every((r) => r.completedOrders + r.cancelledOrders + r.returnedOrders === r.orders)).toBe(true);
  });

  it("rejects files with unexpected columns", () => {
    expect(() => decodeDaily({ start_date: "2025-01-01", channels: ["a"], columns: ["day_offset"], rows: [] })).toThrow(/Unexpected columns/);
  });
});
