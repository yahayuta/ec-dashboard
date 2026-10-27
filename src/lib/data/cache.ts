import type { DataSource } from "../types";

/**
 * Keeps query results in memory for a while. The marts are rebuilt by a
 * batch job, so re-reading BigQuery on every page view only adds cost.
 */
export function withCache(source: DataSource, ttlMs: number, now: () => number = Date.now): DataSource {
  const memo = <T>(load: () => Promise<T>) => {
    let value: { at: number; data: Promise<T> } | null = null;
    return () => {
      if (value === null || now() - value.at >= ttlMs) {
        const data = load();
        const entry = { at: now(), data };
        value = entry;
        data.catch(() => {
          if (value === entry) value = null; // do not keep failures
        });
      }
      return value.data;
    };
  };
  return {
    name: source.name,
    dailyChannelSales: memo(() => source.dailyChannelSales()),
    rfmCells: memo(() => source.rfmCells()),
  };
}
