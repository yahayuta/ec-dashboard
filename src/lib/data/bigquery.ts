import type { BigQuery } from "@google-cloud/bigquery";
import { isSegment, type DailyChannelSales, type DataSource, type RfmCell } from "../types";

export interface BigQueryConfig {
  projectId: string;
  dataset: string;
  location?: string;
  /** How many days back from the latest order to read (covers the longest period and its comparison). */
  lookbackDays?: number;
}

/** Minimal surface of the BigQuery client we use; lets tests pass a fake. */
export type QueryClient = Pick<BigQuery, "query">;

const IDENTIFIER = /^[A-Za-z0-9_-]{1,1024}$/;

/** Table names cannot be query parameters, so validate them before building SQL. */
export function tableRef(projectId: string, dataset: string, table: string): string {
  for (const [name, value] of [["project", projectId], ["dataset", dataset], ["table", table]] as const) {
    if (!IDENTIFIER.test(value)) throw new Error(`Invalid BigQuery ${name} name: ${value}`);
  }
  return `\`${projectId}.${dataset}.${table}\``;
}

export function dailySql(config: BigQueryConfig): string {
  const table = tableRef(config.projectId, config.dataset, "mart_daily_channel_sales");
  return `
    select
      format_date('%Y-%m-%d', ordered_on) as ordered_on,
      channel, orders, completed_orders, cancelled_orders, returned_orders,
      net_revenue, gross_margin
    from ${table}
    where ordered_on > date_sub((select max(ordered_on) from ${table}), interval @lookback_days day)
    order by ordered_on, channel`;
}

export function rfmSql(config: BigQueryConfig): string {
  const table = tableRef(config.projectId, config.dataset, "mart_customer_rfm");
  return `
    select
      r_score, f_score, segment,
      count(*) as customers,
      sum(monetary) as monetary,
      round(avg(recency_days), 1) as avg_recency_days
    from ${table}
    group by r_score, f_score, segment
    order by r_score, f_score, segment`;
}

const num = (v: unknown): number => {
  const n = typeof v === "object" && v !== null && "value" in v ? Number((v as { value: unknown }).value) : Number(v);
  if (!Number.isFinite(n)) throw new Error(`Expected a number, got ${String(v)}`);
  return n;
};

export function mapDailyRow(r: Record<string, unknown>): DailyChannelSales {
  return {
    date: String(r.ordered_on),
    channel: String(r.channel),
    orders: num(r.orders),
    completedOrders: num(r.completed_orders),
    cancelledOrders: num(r.cancelled_orders),
    returnedOrders: num(r.returned_orders),
    netRevenue: num(r.net_revenue),
    grossMargin: num(r.gross_margin),
  };
}

export function mapRfmRow(r: Record<string, unknown>): RfmCell {
  const segment = String(r.segment);
  if (!isSegment(segment)) throw new Error(`Unknown segment: ${segment}`);
  return {
    rScore: num(r.r_score),
    fScore: num(r.f_score),
    segment,
    customers: num(r.customers),
    monetary: num(r.monetary),
    avgRecencyDays: num(r.avg_recency_days),
  };
}

/**
 * Reads the marts dataset that ec-analytics-platform builds in BigQuery.
 * Authentication uses Application Default Credentials; the service account
 * only needs read access to the marts dataset (roles/bigquery.dataViewer on
 * the dataset and roles/bigquery.jobUser on the project).
 */
export function createBigQuerySource(config: BigQueryConfig, client: QueryClient): DataSource {
  const lookbackDays = config.lookbackDays ?? 730;
  const options = { location: config.location };
  return {
    name: "bigquery",
    async dailyChannelSales() {
      const [rows] = await client.query({ query: dailySql(config), params: { lookback_days: lookbackDays }, ...options });
      return (rows as Record<string, unknown>[]).map(mapDailyRow);
    },
    async rfmCells() {
      const [rows] = await client.query({ query: rfmSql(config), ...options });
      return (rows as Record<string, unknown>[]).map(mapRfmRow);
    },
  };
}
