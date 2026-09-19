import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { lookupCarrier411 } from "@/lib/carrier411";
import { db } from "@/lib/db";
import { carrierVettingChecks } from "@/lib/db/schema";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const dot = request.nextUrl.searchParams.get("dot");
  const mc = request.nextUrl.searchParams.get("mc");
  const carrierId = request.nextUrl.searchParams.get("carrierId");
  const identifier = dot || mc;

  if (!identifier) {
    return NextResponse.json({ ok: false, error: "Provide a dot or mc query param." }, { status: 400 });
  }

  const result = await lookupCarrier411(identifier);

  if (result.ok && carrierId) {
    await db.insert(carrierVettingChecks).values({
      id: newId("cvc"),
      carrierId,
      source: "CARRIER411",
      identifierUsed: identifier,
      legalName: result.data.legalName,
      authorityStatus: result.data.authorityStatus,
      safetyRating: result.data.safetyRating,
      raw: JSON.stringify(result.data.raw),
      checkedById: session.user.id,
    });
  }

  return NextResponse.json(result);
}
