"use server";

import { db } from "@/lib/db";
import { quotes, loads, companies, tracking } from "@/lib/db/schema";
import { requireUser, canWrite } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getNextLoadNumber } from "@/lib/data/queries";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const PublicQuoteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  pickupLocation: z.string().min(1, "Pickup location is required"),
  deliveryLocation: z.string().min(1, "Delivery location is required"),
  pickupDate: z.string().optional(),
  weight: z.coerce.number().optional(),
  commodity: z.string().optional(),
  equipment: z.string().optional(),
  contactPrefs: z.string().optional(),
  notes: z.string().optional(),
});

export type QuoteFormState = { error: string | null; success?: boolean; fieldErrors?: Record<string, string> };

export async function submitPublicQuote(
  _prev: QuoteFormState,
  formData: FormData
): Promise<QuoteFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = PublicQuoteSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const data = parsed.data;

  await db.insert(quotes).values({
    id: id("qte"),
    status: "NEW",
    name: data.name,
    company: data.company || null,
    email: data.email,
    phone: data.phone || null,
    pickupLocation: data.pickupLocation,
    deliveryLocation: data.deliveryLocation,
    pickupDate: data.pickupDate ? new Date(data.pickupDate).toISOString() : null,
    weight: data.weight || null,
    commodity: data.commodity || null,
    equipment: data.equipment || null,
    contactPrefs: data.contactPrefs || null,
    notes: data.notes || null,
  });

  return { error: null, success: true };
}

export async function updateQuoteStatus(quoteId: string, status: string) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db
    .update(quotes)
    .set({ status: status as never, updatedAt: new Date().toISOString() })
    .where(eq(quotes.id, quoteId));
  revalidatePath("/quotes");
}

export async function setQuotedRate(quoteId: string, rate: number) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db
    .update(quotes)
    .set({
      quotedRate: rate,
      quotedById: user.id,
      status: "QUOTED",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(quotes.id, quoteId));
  revalidatePath("/quotes");
}

export async function bookQuote(quoteId: string) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");

  const rows = await db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1);
  const quote = rows[0];
  if (!quote) throw new Error("Quote not found");

  // Find or create a CUSTOMER company from the quote's contact info
  let customerId: string;
  const existing = quote.company
    ? await db.select().from(companies).where(eq(companies.name, quote.company)).limit(1)
    : [];
  if (existing[0]) {
    customerId = existing[0].id;
  } else {
    customerId = id("cmp");
    await db.insert(companies).values({
      id: customerId,
      name: quote.company || quote.name,
      type: "CUSTOMER",
      contactName: quote.name,
      phone: quote.phone || null,
      email: quote.email || null,
      status: "ACTIVE",
      leadSource: "Quote form",
    });
  }

  const loadNumber = await getNextLoadNumber();
  const newLoadId = id("ld");
  const [pickupCity, pickupState] = splitLocation(quote.pickupLocation);
  const [destCity, destState] = splitLocation(quote.deliveryLocation);

  await db.insert(loads).values({
    id: newLoadId,
    loadNumber,
    date: new Date().toISOString(),
    customerId,
    agentId: user.id,
    originCity: pickupCity,
    originState: pickupState,
    destCity,
    destState,
    weight: quote.weight || 0,
    commodity: quote.commodity || null,
    customerRate: quote.quotedRate || 0,
    carrierCost: 0,
    equipment: quote.equipment || null,
    notes: `Booked from quote #${quote.id}. ${quote.notes ?? ""}`.trim(),
    invoiceStatus: "NOT_INVOICED",
    paymentStatus: "PENDING",
  });

  await db.insert(tracking).values({
    id: id("trk"),
    loadId: newLoadId,
    deliveryZip: "",
    ready: false,
    hide: false,
    notify: false,
    podOnFile: false,
    currentLocation: `${pickupCity}, ${pickupState}`,
  });

  await db
    .update(quotes)
    .set({ status: "BOOKED", bookedLoadId: newLoadId, updatedAt: new Date().toISOString() })
    .where(eq(quotes.id, quoteId));

  revalidatePath("/quotes");
  revalidatePath("/loads");
  redirect(`/loads/${newLoadId}`);
}

function splitLocation(location: string): [string, string] {
  const parts = location.split(",").map((p) => p.trim());
  if (parts.length >= 2) return [parts[0], parts[1]];
  return [location, ""];
}
