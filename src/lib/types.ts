/** One row of marts.mart_daily_channel_sales (day x channel). */
export interface DailyChannelSales {
  /** ISO date, e.g. "2025-03-31" */
  date: string;
  channel: string;
  orders: number;
  completedOrders: number;
  cancelledOrders: number;
  returnedOrders: number;
  /** Merchandise revenue of completed orders (JPY). */
  netRevenue: number;
  /** Gross margin of completed orders (JPY). */
  grossMargin: number;
}

export const SEGMENTS = ["champions", "loyal", "new_or_promising", "at_risk", "hibernating"] as const;
export type Segment = (typeof SEGMENTS)[number];

/** marts.mart_customer_rfm aggregated per R score x F score. */
export interface RfmCell {
  rScore: number;
  fScore: number;
  segment: Segment;
  customers: number;
  /** Lifetime revenue of the customers in the cell (JPY). */
  monetary: number;
  avgRecencyDays: number;
}

/** Where the dashboard reads the marts from. */
export interface DataSource {
  readonly name: "sample" | "bigquery";
  dailyChannelSales(): Promise<DailyChannelSales[]>;
  rfmCells(): Promise<RfmCell[]>;
}

export function isSegment(value: string): value is Segment {
  return (SEGMENTS as readonly string[]).includes(value);
}
