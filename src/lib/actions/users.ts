"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { requireRole } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const UserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  role: z.enum(["ADMIN", "BROKER", "VIEWER"]),
  commissionRate: z.coerce.number().min(0).max(1),
  password: z.string().optional(),
});

export type UserFormState = { error: string | null; fieldErrors?: Record<string, string> };

export async function createUser(
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireRole(["ADMIN"]);

  const raw = Object.fromEntries(formData.entries());
  const parsed = UserSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const data = parsed.data;
  if (!data.password || data.password.length < 8) {
    return { error: "Password must be at least 8 characters.", fieldErrors: { password: "Required, 8+ chars" } };
  }

  const existing = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  if (existing[0]) {
    return { error: "A user with that email already exists.", fieldErrors: { email: "Already in use" } };
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  await db.insert(users).values({
    id: id("usr"),
    name: data.name,
    email: data.email.toLowerCase().trim(),
    passwordHash,
    role: data.role,
    commissionRate: data.commissionRate,
    active: true,
  });

  revalidatePath("/admin/users");
  return { error: null };
}

export async function updateUser(
  userId: string,
  _prev: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  await requireRole(["ADMIN"]);

  const raw = Object.fromEntries(formData.entries());
  const parsed = UserSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const data = parsed.data;

  const updates: Record<string, unknown> = {
    name: data.name,
    email: data.email.toLowerCase().trim(),
    role: data.role,
    commissionRate: data.commissionRate,
  };

  if (data.password && data.password.length >= 8) {
    updates.passwordHash = await bcrypt.hash(data.password, 10);
  }

  await db.update(users).set(updates).where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { error: null };
}

export async function toggleUserActive(userId: string, active: boolean) {
  await requireRole(["ADMIN"]);
  await db.update(users).set({ active }).where(eq(users.id, userId));
  revalidatePath("/admin/users");
}
