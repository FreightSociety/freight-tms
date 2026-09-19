"use server";

import { db } from "@/lib/db";
import { loads, tracking, loadBoardPosts, companies } from "@/lib/db/schema";
import { requireUser, canWrite } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getNextLoadNumber } from "@/lib/data/queries";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const LoadSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  carrierId: z.string().optional(),
  agentId: z.string().min(1, "Agent is required"),
  date: z.string().min(1, "Date is required"),
  originCity: z.string().min(1, "Origin city is required"),
  originState: z.string().min(1, "Origin state is required"),
  destCity: z.string().min(1, "Destination city is required"),
  destState: z.string().min(1, "Destination state is required"),
  destZip: z.string().optional(),
  loadedMiles: z.coerce.number().min(0),
  commodity: z.string().optional(),
  weight: z.coerce.number().min(0),
  customerRate: z.coerce.number().min(0),
  carrierCost: z.coerce.number().min(0),
  customerTerms: z.coerce.number().int().min(0),
  carrierTerms: z.coerce.number().int().min(0),
  invoiceStatus: z.enum(["NOT_INVOICED", "INVOICED", "PAID"]),
  paymentStatus: z.enum(["PENDING", "PAID", "OVERDUE"]),
  equipment: z.string().optional(),
  notes: z.string().optional(),
});

export type LoadFormState = {
  error: string | null;
  fieldErrors?: Record<string, string>;
};

export async function createLoad(
  _prev: LoadFormState,
  formData: FormData
): Promise<LoadFormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) return { error: "You do not have permission to create loads." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = LoadSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const data = parsed.data;

  const loadNumber = String(formData.get("loadNumber") || "") || (await getNextLoadNumber());
  const newId = id("ld");

  await db.insert(loads).values({
    id: newId,
    loadNumber,
    date: new Date(data.date).toISOString(),
    customerId: data.customerId,
    carrierId: data.carrierId || null,
    agentId: data.agentId,
    originCity: data.originCity,
    originState: data.originState,
    destCity: data.destCity,
    destState: data.destState,
    destZip: data.destZip || null,
    loadedMiles: data.loadedMiles,
    commodity: data.commodity || null,
    weight: data.weight,
    customerRate: data.customerRate,
    carrierCost: data.carrierCost,
    customerTerms: data.customerTerms,
    carrierTerms: data.carrierTerms,
    invoiceStatus: data.invoiceStatus,
    paymentStatus: data.paymentStatus,
    equipment: data.equipment || null,
    notes: data.notes || null,
  });

  await db.update(companies).set({ lastLoadDate: new Date().toISOString() }).where(eq(companies.id, data.customerId));
  if (data.carrierId) {
    await db.update(companies).set({ lastLoadDate: new Date().toISOString() }).where(eq(companies.id, data.carrierId));
  }

  const createTracking = formData.get("createTracking") === "on";
  if (createTracking) {
    await db.insert(tracking).values({
      id: id("trk"),
      loadId: newId,
      deliveryZip: data.destZip || "",
      currentLocation: `${data.originCity}, ${data.originState}`,
      hide: false,
      notify: false,
      ready: false,
      podOnFile: false,
    });
  }

  const createBoardPost = formData.get("createBoardPost") === "on";
  if (createBoardPost) {
    await db.insert(loadBoardPosts).values({
      id: id("lbp"),
      loadId: newId,
      post: true,
      status: "OPEN",
      postedAt: new Date().toISOString(),
      postedRate: data.carrierCost,
    });
  }

  revalidatePath("/loads");
  redirect("/loads");
}

export async function updateLoad(
  loadId: string,
  _prev: LoadFormState,
  formData: FormData
): Promise<LoadFormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) return { error: "You do not have permission to edit loads." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = LoadSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const data = parsed.data;

  const invoiceDateRaw = String(formData.get("invoiceDate") || "");

  await db
    .update(loads)
    .set({
      date: new Date(data.date).toISOString(),
      customerId: data.customerId,
      carrierId: data.carrierId || null,
      agentId: data.agentId,
      originCity: data.originCity,
      originState: data.originState,
      destCity: data.destCity,
      destState: data.destState,
      destZip: data.destZip || null,
      loadedMiles: data.loadedMiles,
      commodity: data.commodity || null,
      weight: data.weight,
      customerRate: data.customerRate,
      carrierCost: data.carrierCost,
      customerTerms: data.customerTerms,
      carrierTerms: data.carrierTerms,
      invoiceDate: invoiceDateRaw ? new Date(invoiceDateRaw).toISOString() : null,
      invoiceStatus: data.invoiceStatus,
      paymentStatus: data.paymentStatus,
      equipment: data.equipment || null,
      notes: data.notes || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(loads.id, loadId));

  revalidatePath("/loads");
  revalidatePath(`/loads/${loadId}`);
  redirect(`/loads/${loadId}`);
}

export async function deleteLoad(loadId: string) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db.delete(loads).where(eq(loads.id, loadId));
  revalidatePath("/loads");
  redirect("/loads");
}
