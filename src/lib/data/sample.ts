import dailyFile from "../../../data/sample/daily_channel_sales.json";
import rfmFile from "../../../data/sample/customer_rfm_cells.json";
import { addDays } from "../period";
import { isSegment, type DailyChannelSales, type DataSource, type RfmCell } from "../types";

const EXPECTED_COLUMNS = [
  "day_offset",
  "channel_index",
  "orders",
  "completed_orders",
  "cancelled_orders",
  "returned_orders",
  "net_revenue",
  "gross_margin",
] as const;

interface DailyFile {
  start_date: string;
  channels: string[];
  columns: string[];
  rows: number[][];
}

interface RfmFile {
  rows: {
    r_score: number;
    f_score: number;
    segment: string;
    customers: number;
    monetary: number;
    avg_recency_days: number;
  }[];
}

/** Decode the compact sample format written by scripts/export_sample.py. */
export function decodeDaily(file: DailyFile): DailyChannelSales[] {
  if (file.columns.join() !== EXPECTED_COLUMNS.join()) {
    throw new Error(`Unexpected columns in daily_channel_sales.json: ${file.columns.join()}`);
  }
  return file.rows.map((row, i) => {
    if (row.length !== EXPECTED_COLUMNS.length) throw new Error(`Row ${i} has ${row.length} values`);
    const [offset, channelIndex, orders, completed, cancelled, returned, revenue, margin] = row as [
      number, number, number, number, number, number, number, number,
    ];
    const channel = file.channels[channelIndex];
    if (channel === undefined) throw new Error(`Row ${i} has unknown channel index ${channelIndex}`);
    return {
      date: addDays(file.start_date, offset),
      channel,
      orders,
      completedOrders: completed,
      cancelledOrders: cancelled,
      returnedOrders: returned,
      netRevenue: revenue,
      grossMargin: margin,
    };
  });
}

export function decodeRfm(file: RfmFile): RfmCell[] {
  return file.rows.map((r) => {
    if (!isSegment(r.segment)) throw new Error(`Unknown segment: ${r.segment}`);
    return {
      rScore: r.r_score,
      fScore: r.f_score,
      segment: r.segment,
      customers: r.customers,
      monetary: r.monetary,
      avgRecencyDays: r.avg_recency_days,
    };
  });
}

/** Bundled synthetic data exported from ec-analytics-platform. No cloud account needed. */
export function createSampleSource(): DataSource {
  const daily = decodeDaily(dailyFile as DailyFile);
  const rfm = decodeRfm(rfmFile as RfmFile);
  return {
    name: "sample",
    dailyChannelSales: async () => daily,
    rfmCells: async () => rfm,
  };
}
