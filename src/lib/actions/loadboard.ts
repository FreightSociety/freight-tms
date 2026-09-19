"use server";

import { db } from "@/lib/db";
import { loadBoardPosts } from "@/lib/db/schema";
import { requireUser, canWrite } from "@/lib/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function toggleBoardPost(postId: string, value: boolean) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db
    .update(loadBoardPosts)
    .set({
      post: value,
      postedAt: value ? new Date().toISOString() : null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(loadBoardPosts.id, postId));
  revalidatePath("/loadboard");
  revalidatePath("/loadboard-public");
}

export async function setBoardStatus(postId: string, status: "OPEN" | "COVERED") {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db
    .update(loadBoardPosts)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(loadBoardPosts.id, postId));
  revalidatePath("/loadboard");
  revalidatePath("/loadboard-public");
}

export async function setPostedRate(postId: string, rate: number) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  await db
    .update(loadBoardPosts)
    .set({ postedRate: rate, updatedAt: new Date().toISOString() })
    .where(eq(loadBoardPosts.id, postId));
  revalidatePath("/loadboard");
  revalidatePath("/loadboard-public");
}

export async function createBoardPostForLoad(loadId: string) {
  const user = await requireUser();
  if (!canWrite(user.role)) throw new Error("Forbidden");
  const idVal = `lbp_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
  await db.insert(loadBoardPosts).values({
    id: idVal,
    loadId,
    post: false,
    status: "OPEN",
  });
  revalidatePath("/loadboard");
  revalidatePath("/loads");
}
