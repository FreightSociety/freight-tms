"use server";

import { db } from "@/lib/db";
import { loadBoardPostings } from "@/lib/db/schema";
import { requireUser, canWrite } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const PostingSchema = z.object({
  board: z.enum(["DAT", "CENTRAL_DISPATCH"]),
  externalRef: z.string().optional(),
  status: z.enum(["POSTED", "COVERED", "EXPIRED", "REMOVED"]),
  postedRate: z.string().optional(),
  equipment: z.string().optional(),
  postedAt: z.string().optional(),
  notes: z.string().optional(),
});

export type LoadBoardPostingFormState = { error: string | null; fieldErrors?: Record<string, string> };

export async function addLoadBoardPosting(
  loadId: string,
  _prev: LoadBoardPostingFormState,
  formData: FormData
): Promise<LoadBoardPostingFormState> {
  const user = await requireUser();
  if (!canWrite(user.role)) return { error: "You do not have permission to add load board postings." };

  const raw = Object.fromEntries(formData.entries());
  const parsed = PostingSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { error: "Please fix the errors below.", fieldErrors };
  }
  const data = parsed.data;

  await db.insert(loadBoardPostings).values({
    id: newId("lbpost"),
    loadId,
    board: data.board,
    externalRef: data.externalRef || null,
    status: data.status,
    postedRate: data.postedRate ? Number(data.postedRate) : null,
    equipment: data.equipment || null,
    postedAt: data.postedAt ? new Date(data.postedAt).toISOString() : null,
    notes: data.notes || null,
    createdById: user.id,
  });

  revalidatePath(`/loads/${loadId}`);
  revalidatePath("/loadboard-activity");
  return { error: null };
}

export async function updateLoadBoardPostingStatus(
  postingId: string,
  status: "POSTED" | "COVERED" | "EXPIRED" | "REMOVED"
) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");

  const rows = await db.select().from(loadBoardPostings).where(eq(loadBoardPostings.id, postingId)).limit(1);
  const posting = rows[0];

  await db
    .update(loadBoardPostings)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(loadBoardPostings.id, postingId));

  if (posting) revalidatePath(`/loads/${posting.loadId}`);
  revalidatePath("/loadboard-activity");
}

export async function deleteLoadBoardPosting(postingId: string) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");

  const rows = await db.select().from(loadBoardPostings).where(eq(loadBoardPostings.id, postingId)).limit(1);
  const posting = rows[0];

  await db.delete(loadBoardPostings).where(eq(loadBoardPostings.id, postingId));

  if (posting) revalidatePath(`/loads/${posting.loadId}`);
  revalidatePath("/loadboard-activity");
}
