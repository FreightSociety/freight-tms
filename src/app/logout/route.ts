import { signOut } from "@/lib/auth";

export async function GET() {
  await signOut({ redirectTo: "/login" });
  return new Response(null, { status: 302, headers: { Location: "/login" } });
}
