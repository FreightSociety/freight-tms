import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loads, loadBoardPostings } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

type SyncPosting = {
  loadNumber: string;
  externalRef?: string;
  status?: string;
  postedRate?: number;
  equipment?: string;
  postedAt?: string;
  raw?: unknown;
};

const VALID_STATUSES = new Set(["POSTED", "COVERED", "EXPIRED", "REMOVED"]);
const VALID_BOARDS = new Set(["DAT", "CENTRAL_DISPATCH"]);

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.LOADBOARD_SYNC_SECRET;
  const providedSecret = request.headers.get("x-loadboard-sync-secret");

  if (!expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "LOADBOARD_SYNC_SECRET is not set on the server." },
      { status: 401 }
    );
  }
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid x-loadboard-sync-secret header." },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as { board?: string; postings?: SyncPosting[] };
    const board = body.board;
    const postings = Array.isArray(body.postings) ? body.postings : [];

    if (!board || !VALID_BOARDS.has(board)) {
      return NextResponse.json(
        { ok: false, error: "board must be one of DAT, CENTRAL_DISPATCH." },
        { status: 400 }
      );
    }

    let matched = 0;
    let updated = 0;
    let inserted = 0;
    const skipped: string[] = [];
    const now = new Date().toISOString();

    for (const posting of postings) {
      if (!posting.loadNumber) continue;

      const loadRows = await db
        .select()
        .from(loads)
        .where(eq(loads.loadNumber, posting.loadNumber.trim()))
        .limit(1);
      const load = loadRows[0];

      if (!load) {
        skipped.push(posting.loadNumber);
        continue;
      }

      matched++;

      const status = posting.status && VALID_STATUSES.has(posting.status) ? posting.status : "POSTED";

      const existingRows = await db
        .select()
        .from(loadBoardPostings)
        .where(and(eq(loadBoardPostings.loadId, load.id), eq(loadBoardPostings.board, board as "DAT" | "CENTRAL_DISPATCH")))
        .limit(1);
      const existing = existingRows[0];

      if (existing) {
        await db
          .update(loadBoardPostings)
          .set({
            externalRef: posting.externalRef ?? existing.externalRef,
            status: status as "POSTED" | "COVERED" | "EXPIRED" | "REMOVED",
            postedRate: posting.postedRate ?? existing.postedRate,
            equipment: posting.equipment ?? existing.equipment,
            postedAt: posting.postedAt ? new Date(posting.postedAt).toISOString() : existing.postedAt,
            raw: posting.raw !== undefined ? JSON.stringify(posting.raw) : existing.raw,
            lastSyncedAt: now,
            updatedAt: now,
          })
          .where(eq(loadBoardPostings.id, existing.id));
        updated++;
      } else {
        await db.insert(loadBoardPostings).values({
          id: newId("lbpost"),
          loadId: load.id,
          board: board as "DAT" | "CENTRAL_DISPATCH",
          externalRef: posting.externalRef ?? null,
          status: status as "POSTED" | "COVERED" | "EXPIRED" | "REMOVED",
          postedRate: posting.postedRate ?? null,
          equipment: posting.equipment ?? null,
          postedAt: posting.postedAt ? new Date(posting.postedAt).toISOString() : null,
          raw: posting.raw !== undefined ? JSON.stringify(posting.raw) : null,
          lastSyncedAt: now,
        });
        inserted++;
      }
    }

    return NextResponse.json({ ok: true, matched, updated, inserted, skipped });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
