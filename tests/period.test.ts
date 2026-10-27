import { describe, expect, it } from "vitest";
import { addDays, daysBetween, parsePeriod, resolvePeriod } from "@/lib/period";

describe("period", () => {
  it("falls back to the default period for unknown values", () => {
    expect(parsePeriod(undefined)).toBe("90d");
    expect(parsePeriod("7d")).toBe("90d");
    expect(parsePeriod("toString")).toBe("90d");
    expect(parsePeriod(["30d", "365d"])).toBe("30d");
  });

  it("ends on the latest date and compares with the same number of days before", () => {
    const r = resolvePeriod("2025-12-31", "30d");
    expect(r.current).toEqual({ start: "2025-12-02", end: "2025-12-31" });
    expect(r.previous).toEqual({ start: "2025-11-02", end: "2025-12-01" });
    expect(daysBetween(r.current.start, r.current.end) + 1).toBe(30);
    expect(daysBetween(r.previous.start, r.previous.end) + 1).toBe(30);
  });

  it("handles month and leap-year boundaries in UTC", () => {
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2025-03-01", -1)).toBe("2025-02-28");
    expect(() => addDays("2025-13-01", 1)).toThrow();
  });
});
