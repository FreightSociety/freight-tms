"use server";

import { db } from "@/lib/db";
import { tracking } from "@/lib/db/schema";
import { requireUser, canWrite } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function stampTrackingEvent(
  trackingId: string,
  field: "bookedAt" | "pickedUpAt" | "inTransitAt" | "outForDeliveryAt" | "deliveredAt"
) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db
    .update(tracking)
    .set({ [field]: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(tracking.id, trackingId));
  revalidatePath("/tracking");
}

export async function clearTrackingEvent(
  trackingId: string,
  field: "bookedAt" | "pickedUpAt" | "inTransitAt" | "outForDeliveryAt" | "deliveredAt"
) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db
    .update(tracking)
    .set({ [field]: null, updatedAt: new Date().toISOString() })
    .where(eq(tracking.id, trackingId));
  revalidatePath("/tracking");
}

export async function toggleTrackingFlag(
  trackingId: string,
  flag: "hide" | "notify" | "ready" | "podOnFile",
  value: boolean
) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db
    .update(tracking)
    .set({ [flag]: value, updatedAt: new Date().toISOString() })
    .where(eq(tracking.id, trackingId));
  revalidatePath("/tracking");
}

export async function updateTrackingDetails(trackingId: string, formData: FormData) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");

  const currentLocation = String(formData.get("currentLocation") || "");
  const eta = String(formData.get("eta") || "");
  const publicNote = String(formData.get("publicNote") || "");
  const deliveryZip = String(formData.get("deliveryZip") || "");

  await db
    .update(tracking)
    .set({
      currentLocation: currentLocation || null,
      eta: eta ? new Date(eta).toISOString() : null,
      publicNote: publicNote || null,
      deliveryZip,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(tracking.id, trackingId));

  revalidatePath("/tracking");
}

export async function markNotified(trackingId: string) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db
    .update(tracking)
    .set({ lastNotified: new Date().toISOString(), updatedAt: new Date().toISOString() })
    .where(eq(tracking.id, trackingId));
  revalidatePath("/tracking");
}
