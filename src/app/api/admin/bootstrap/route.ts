import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { seedDatabase } from "@/lib/db/seed-data";
import fs from "fs";
import path from "path";

// Postgres SQLSTATE codes for "already exists" — safe to ignore so this
// route can be called more than once (e.g. a retry after a partial failure).
const ALREADY_EXISTS_CODES = new Set(["42710", "42P07"]); // duplicate_object, duplicate_table

type StatementResult = {
  index: number;
  preview: string;
  outcome: "ran" | "skipped_already_exists" | "error";
  error?: string;
};

function loadMigrationStatements(): string[] {
  const drizzleDir = path.join(process.cwd(), "drizzle");
  let files: string[] = [];
  try {
    files = fs
      .readdirSync(drizzleDir)
      .filter((f) => f.endsWith(".sql"))
      .sort(); // migration files are numerically prefixed (0000_, 0001_, ...)
  } catch {
    return [];
  }

  const statements: string[] = [];
  for (const file of files) {
    const contents = fs.readFileSync(path.join(drizzleDir, file), "utf-8");
    const parts = contents
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
    statements.push(...parts);
  }
  return statements;
}

function isAlreadyExistsError(err: unknown): boolean {
  const code = (err as { code?: string } | undefined)?.code;
  if (code && ALREADY_EXISTS_CODES.has(code)) return true;
  const message = err instanceof Error ? err.message : String(err);
  return /already exists/i.test(message);
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET;
  const providedSecret = request.headers.get("x-bootstrap-secret");

  if (!expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_BOOTSTRAP_SECRET is not set on the server." },
      { status: 401 }
    );
  }
  if (!providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid x-bootstrap-secret header." },
      { status: 401 }
    );
  }

  // --- Step 1: run the generated migration SQL (idempotent) ---
  const statements = loadMigrationStatements();
  const migrationResults: StatementResult[] = [];

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.slice(0, 80).replace(/\s+/g, " ");
    try {
      await db.execute(sql.raw(statement));
      migrationResults.push({ index: i, preview, outcome: "ran" });
    } catch (err) {
      if (isAlreadyExistsError(err)) {
        migrationResults.push({ index: i, preview, outcome: "skipped_already_exists" });
      } else {
        migrationResults.push({
          index: i,
          preview,
          outcome: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  const migrationSummary = {
    totalStatements: statements.length,
    ran: migrationResults.filter((r) => r.outcome === "ran").length,
    skippedAlreadyExisting: migrationResults.filter((r) => r.outcome === "skipped_already_exists")
      .length,
    errors: migrationResults.filter((r) => r.outcome === "error"),
  };

  if (statements.length === 0) {
    migrationSummary.errors.push({
      index: -1,
      preview: "",
      outcome: "error",
      error:
        "No migration SQL files found under drizzle/. Run `npx drizzle-kit generate` locally and commit the drizzle/ folder.",
    });
  }

  // --- Step 2: idempotent seed ---
  let seedSummary: { status: string; credentials?: unknown } = { status: "skipped_due_to_migration_errors" };
  const hasHardMigrationErrors = migrationSummary.errors.some((e) => e.index !== -1) || statements.length === 0;

  if (!hasHardMigrationErrors) {
    try {
      const result = await seedDatabase(db);
      seedSummary =
        result.status === "already_seeded"
          ? { status: "already_seeded" }
          : { status: "seeded", credentials: result.credentials };
    } catch (err) {
      seedSummary = {
        status: "error",
        credentials: undefined,
      };
      return NextResponse.json(
        {
          ok: false,
          migration: migrationSummary,
          seed: { status: "error", error: err instanceof Error ? err.message : String(err) },
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    ok: true,
    migration: migrationSummary,
    seed: seedSummary,
    note:
      "Bootstrap complete. For a real production rollout, delete this route (or rotate ADMIN_BOOTSTRAP_SECRET) now that migration/seeding has run.",
  });
}
