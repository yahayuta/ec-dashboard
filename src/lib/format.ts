import type { Segment } from "./types";

const yen = new Intl.NumberFormat("en-US", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
const yenCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "JPY",
  notation: "compact",
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export const formatYen = (v: number | null): string => (v === null ? "–" : yen.format(v));
export const formatYenCompact = (v: number): string => yenCompact.format(v);
export const formatInt = (v: number): string => integer.format(v);
export const formatPct = (v: number | null, digits = 1): string =>
  v === null ? "–" : `${(v * 100).toFixed(digits)}%`;

export function formatChange(v: number | null): string {
  if (v === null) return "no baseline";
  const sign = v > 0 ? "+" : v < 0 ? "−" : "±";
  return `${sign}${Math.abs(v * 100).toFixed(1)}%`;
}

/** Difference between two rates, in percentage points. */
export function formatPointChange(v: number | null): string {
  if (v === null) return "no baseline";
  const pt = v * 100;
  const sign = pt > 0.05 ? "+" : pt < -0.05 ? "−" : "±";
  return `${sign}${Math.abs(pt).toFixed(1)} pt`;
}

/** "2025-03-31" -> "Mar 31" */
export function formatShortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function channelLabel(channel: string): string {
  const m = /^marketplace_([a-z])$/.exec(channel);
  if (m?.[1]) return `Marketplace ${m[1].toUpperCase()}`;
  if (channel === "own_store") return "Own store";
  return channel.replace(/_/g, " ");
}

export const SEGMENT_INFO: Record<Segment, { label: string; action: string }> = {
  champions: { label: "Champions", action: "Recent and frequent. Early access, referrals." },
  loyal: { label: "Loyal", action: "Regular buyers. Bundles and loyalty points." },
  new_or_promising: { label: "New / promising", action: "Bought recently, few times. Second-purchase offer." },
  at_risk: { label: "At risk", action: "Used to buy often, not recently. Win-back campaign." },
  hibernating: { label: "Hibernating", action: "Low recency and frequency. Low-cost reminders only." },
};
