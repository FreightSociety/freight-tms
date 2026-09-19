import { requireUser } from "@/lib/session";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role={user.role} name={user.name} email={user.email} />
      <main className="min-w-0 flex-1 overflow-x-hidden px-8 py-8">{children}</main>
    </div>
  );
}
