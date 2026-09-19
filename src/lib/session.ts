import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { AppRole } from "@/lib/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session.user;
}

export async function requireRole(roles: AppRole[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect("/dashboard");
  }
  return user;
}

export function canWrite(role: AppRole): boolean {
  return role === "ADMIN" || role === "BROKER";
}

export function isAdmin(role: AppRole): boolean {
  return role === "ADMIN";
}
