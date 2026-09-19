"use server";

import { db } from "@/lib/db";
import { companies, carriers } from "@/lib/db/schema";
import { requireUser, canWrite } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const CompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  type: z.enum(["CUSTOMER", "CARRIER", "LEAD"]),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  mcNumber: z.string().optional(),
  dotNumber: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "PROSPECT"]),
  leadSource: z.string().optional(),
  notes: z.string().optional(),
});

export type CompanyFormState = { error: string | null; fieldErrors?: Record<string, string> };

export async function createCompany(
  _prev: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) return { error: "You do not have permission to create companies." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = CompanySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const data = parsed.data;
  const newId = id("cmp");

  await db.insert(companies).values({
    id: newId,
    name: data.name,
    type: data.type,
    contactName: data.contactName || null,
    phone: data.phone || null,
    email: data.email || null,
    city: data.city || null,
    state: data.state || null,
    mcNumber: data.mcNumber || null,
    dotNumber: data.dotNumber || null,
    status: data.status,
    leadSource: data.leadSource || null,
    notes: data.notes || null,
  });

  if (data.type === "CARRIER") {
    const createCarrierRecord = formData.get("createCarrierRecord") === "on";
    if (createCarrierRecord) {
      await db.insert(carriers).values({
        id: id("car"),
        companyId: newId,
        mcNumber: data.mcNumber || null,
        dotNumber: data.dotNumber || null,
        authorityStatus: "ACTIVE",
        safetyRating: "NOT_RATED",
        preferred: false,
        watchlist: false,
      });
    }
  }

  revalidatePath("/crm");
  redirect("/crm");
}

export async function updateCompany(
  companyId: string,
  _prev: CompanyFormState,
  formData: FormData
): Promise<CompanyFormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) return { error: "You do not have permission to edit companies." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = CompanySchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const data = parsed.data;

  await db
    .update(companies)
    .set({
      name: data.name,
      type: data.type,
      contactName: data.contactName || null,
      phone: data.phone || null,
      email: data.email || null,
      city: data.city || null,
      state: data.state || null,
      mcNumber: data.mcNumber || null,
      dotNumber: data.dotNumber || null,
      status: data.status,
      leadSource: data.leadSource || null,
      notes: data.notes || null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(companies.id, companyId));

  revalidatePath("/crm");
  revalidatePath(`/crm/${companyId}`);
  redirect(`/crm/${companyId}`);
}

export async function deleteCompany(companyId: string) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db.delete(companies).where(eq(companies.id, companyId));
  revalidatePath("/crm");
  redirect("/crm");
}
