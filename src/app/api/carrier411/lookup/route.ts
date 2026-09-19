import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { lookupCarrier411 } from "@/lib/carrier411";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const dot = request.nextUrl.searchParams.get("dot");
  const mc = request.nextUrl.searchParams.get("mc");
  const identifier = dot || mc;

  if (!identifier) {
    return NextResponse.json({ ok: false, error: "Provide a dot or mc query param." }, { status: 400 });
  }

  const result = await lookupCarrier411(identifier);
  return NextResponse.json(result);
}
