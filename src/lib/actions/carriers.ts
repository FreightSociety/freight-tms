"use server";

import { db } from "@/lib/db";
import { carriers } from "@/lib/db/schema";
import { requireUser, canWrite } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lookupFmcsa } from "@/lib/fmcsa";
import { lookupCarrier411 } from "@/lib/carrier411";

const CarrierSchema = z.object({
  mcNumber: z.string().optional(),
  dotNumber: z.string().optional(),
  insuranceCompany: z.string().optional(),
  policyNumber: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  authorityStatus: z.enum(["ACTIVE", "INACTIVE", "REVOKED"]),
  equipmentTypes: z.string().optional(),
  safetyRating: z.enum(["SATISFACTORY", "CONDITIONAL", "UNSATISFACTORY", "NOT_RATED"]),
  notes: z.string().optional(),
});

export type CarrierFormState = { error: string | null; fieldErrors?: Record<string, string> };

export async function updateCarrier(
  carrierId: string,
  _prev: CarrierFormState,
  formData: FormData
): Promise<CarrierFormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) return { error: "You do not have permission to edit carriers." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = CarrierSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const data = parsed.data;
  const preferred = formData.get("preferred") === "on";
  const watchlist = formData.get("watchlist") === "on";

  await db
    .update(carriers)
    .set({
      mcNumber: data.mcNumber || null,
      dotNumber: data.dotNumber || null,
      insuranceCompany: data.insuranceCompany || null,
      policyNumber: data.policyNumber || null,
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry).toISOString() : null,
      authorityStatus: data.authorityStatus,
      equipmentTypes: data.equipmentTypes || null,
      safetyRating: data.safetyRating,
      preferred,
      watchlist,
      notes: data.notes || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(carriers.id, carrierId));

  revalidatePath("/carriers");
  return { error: null };
}

export async function toggleCarrierFlag(
  carrierId: string,
  flag: "preferred" | "watchlist",
  value: boolean
) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db
    .update(carriers)
    .set({ [flag]: value, updatedAt: new Date().toISOString() })
    .where(eq(carriers.id, carrierId));
  revalidatePath("/carriers");
}

export async function runFmcsaLookup(carrierId: string) {
  const user = await requireUser();
  if (!canWrite(user.role)) return { error: "You do not have permission to run FMCSA lookups." };

  const rows = await db.select().from(carriers).where(eq(carriers.id, carrierId)).limit(1);
  const carrier = rows[0];
  if (!carrier) return { error: "Carrier not found." };

  const identifier = carrier.dotNumber || carrier.mcNumber;
  if (!identifier) return { error: "This carrier has no MC or DOT number on file." };

  const result = await lookupFmcsa(identifier);
  if (!result.ok) return { error: result.error };

  await db
    .update(carriers)
    .set({
      authorityStatus: result.data.authorityStatus,
      safetyRating: result.data.safetyRating,
      mcNumber: result.data.mcNumber || carrier.mcNumber,
      dotNumber: result.data.dotNumber || carrier.dotNumber,
      fmcsaLastChecked: new Date().toISOString(),
      fmcsaRaw: JSON.stringify(result.data.raw),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(carriers.id, carrierId));

  revalidatePath("/carriers");
  return { error: null, data: result.data };
}

export async function runCarrier411Lookup(carrierId: string) {
  const user = await requireUser();
  if (!canWrite(user.role)) return { error: "You do not have permission to run Carrier411 lookups." };

  const rows = await db.select().from(carriers).where(eq(carriers.id, carrierId)).limit(1);
  const carrier = rows[0];
  if (!carrier) return { error: "Carrier not found." };

  const identifier = carrier.dotNumber || carrier.mcNumber;
  if (!identifier) return { error: "This carrier has no MC or DOT number on file." };

  const result = await lookupCarrier411(identifier);
  if (!result.ok) return { error: result.error };

  await db
    .update(carriers)
    .set({
      authorityStatus: result.data.authorityStatus,
      safetyRating: result.data.safetyRating,
      mcNumber: result.data.mcNumber || carrier.mcNumber,
      dotNumber: result.data.dotNumber || carrier.dotNumber,
      carrier411LastChecked: new Date().toISOString(),
      carrier411Raw: JSON.stringify(result.data.raw),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(carriers.id, carrierId));

  revalidatePath("/carriers");
  return { error: null, data: result.data };
}
