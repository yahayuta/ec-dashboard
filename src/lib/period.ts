export const PERIODS = {
  "30d": { days: 30, label: "Last 30 days" },
  "90d": { days: 90, label: "Last 90 days" },
  "365d": { days: 365, label: "Last 365 days" },
} as const;

export type PeriodKey = keyof typeof PERIODS;
export const DEFAULT_PERIOD: PeriodKey = "90d";

export interface DateRange {
  /** inclusive ISO date */
  start: string;
  /** inclusive ISO date */
  end: string;
}

export interface PeriodRanges {
  current: DateRange;
  previous: DateRange;
  days: number;
}

export function parsePeriod(value: string | string[] | undefined): PeriodKey {
  const v = Array.isArray(value) ? value[0] : value;
  return v !== undefined && Object.hasOwn(PERIODS, v) ? (v as PeriodKey) : DEFAULT_PERIOD;
}

const DAY_MS = 86_400_000;

function toTime(iso: string): number {
  const t = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(t)) throw new Error(`Invalid ISO date: ${iso}`);
  return t;
}

export function addDays(iso: string, days: number): string {
  return new Date(toTime(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  return Math.round((toTime(end) - toTime(start)) / DAY_MS);
}

/**
 * The period ends on the latest date in the data, not on today, so the
 * dashboard shows the same numbers every time for the same data
 * (the same rule the RFM mart uses for recency).
 */
export function resolvePeriod(latestDate: string, period: PeriodKey): PeriodRanges {
  const days = PERIODS[period].days;
  const end = latestDate;
  const start = addDays(end, -(days - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));
  return { current: { start, end }, previous: { start: prevStart, end: prevEnd }, days };
}

export function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}
