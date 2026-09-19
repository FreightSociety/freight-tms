import type { LoadRow, TrackingRow } from "@/lib/db/schema";

/** Gross profit = customer rate - carrier cost. */
export function grossProfit(load: Pick<LoadRow, "customerRate" | "carrierCost">): number {
  return (load.customerRate ?? 0) - (load.carrierCost ?? 0);
}

/** Profit margin = gross profit / customer rate. */
export function profitMargin(load: Pick<LoadRow, "customerRate" | "carrierCost">): number {
  if (!load.customerRate) return 0;
  return grossProfit(load) / load.customerRate;
}

/** Revenue per loaded mile = customer rate / loaded miles. */
export function revPerMile(load: Pick<LoadRow, "customerRate" | "loadedMiles">): number {
  if (!load.loadedMiles) return 0;
  return load.customerRate / load.loadedMiles;
}

export type InsuranceAlert = "OK" | "EXPIRING_SOON" | "EXPIRED" | "UNKNOWN";

export function daysUntilExpiry(expiry: string | Date | null | undefined): number | null {
  if (!expiry) return null;
  const d = typeof expiry === "string" ? new Date(expiry) : expiry;
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((d.getTime() - now.getTime()) / msPerDay);
}

export function insuranceAlert(expiry: string | Date | null | undefined): InsuranceAlert {
  const days = daysUntilExpiry(expiry);
  if (days === null) return "UNKNOWN";
  if (days < 0) return "EXPIRED";
  if (days <= 30) return "EXPIRING_SOON";
  return "OK";
}

export const insuranceAlertLabel: Record<InsuranceAlert, string> = {
  OK: "OK",
  EXPIRING_SOON: "Expiring Soon",
  EXPIRED: "EXPIRED",
  UNKNOWN: "Unknown",
};

export type TrackingStage =
  | "BOOKED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "PENDING";

export const trackingStageOrder: TrackingStage[] = [
  "BOOKED",
  "PICKED_UP",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const trackingStageLabel: Record<TrackingStage, string> = {
  PENDING: "Pending",
  BOOKED: "Booked",
  PICKED_UP: "Picked Up",
  IN_TRANSIT: "In Transit",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

export function trackingStage(
  t: Pick<
    TrackingRow,
    "bookedAt" | "pickedUpAt" | "inTransitAt" | "outForDeliveryAt" | "deliveredAt"
  >
): TrackingStage {
  if (t.deliveredAt) return "DELIVERED";
  if (t.outForDeliveryAt) return "OUT_FOR_DELIVERY";
  if (t.inTransitAt) return "IN_TRANSIT";
  if (t.pickedUpAt) return "PICKED_UP";
  if (t.bookedAt) return "BOOKED";
  return "PENDING";
}

export function isLiveOnBoard(post: { post: boolean; status: string }): boolean {
  return post.post === true && post.status === "OPEN";
}

export function quoteAgeDays(receivedAt: string | Date): number {
  const d = typeof receivedAt === "string" ? new Date(receivedAt) : receivedAt;
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((now.getTime() - d.getTime()) / msPerDay);
}

export function isStaleQuote(status: string, receivedAt: string | Date): boolean {
  return status === "NEW" && quoteAgeDays(receivedAt) > 2;
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
export { MONTH_NAMES };

export function nextLoadNumber(lastNumber: string | null | undefined): string {
  if (!lastNumber) return "FS-1001";
  const match = lastNumber.match(/(\d+)$/);
  if (!match) return "FS-1001";
  const next = parseInt(match[1], 10) + 1;
  return `FS-${next}`;
}
