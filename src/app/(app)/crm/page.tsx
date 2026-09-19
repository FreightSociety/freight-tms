import { requireUser, canWrite } from "@/lib/session";
import { getAllCompanies } from "@/lib/data/queries";
import { Card } from "@/components/ui/Card";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Form";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";

const typeColor: Record<string, "blue" | "green" | "amber"> = {
  CUSTOMER: "blue",
  CARRIER: "green",
  LEAD: "amber",
};

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const all = await getAllCompanies();

  let filtered = all;
  if (params.type) filtered = filtered.filter((c) => c.type === params.type);
  if (params.status) filtered = filtered.filter((c) => c.status === params.status);
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.contactName ?? "").toLowerCase().includes(q)
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM</h1>
          <p className="text-sm text-slate-500">Customers, carriers, and leads.</p>
        </div>
        {canWrite(user.role) && <LinkButton href="/crm/new">+ New Company</LinkButton>}
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4">
          <form className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              name="q"
              defaultValue={params.q}
              placeholder="Search name or contact…"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
            <select
              name="type"
              defaultValue={params.type ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="">All Types</option>
              <option value="CUSTOMER">Customer</option>
              <option value="CARRIER">Carrier</option>
              <option value="LEAD">Lead</option>
            </select>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="PROSPECT">Prospect</option>
            </select>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Filter
            </button>
          </form>
          <span className="ml-auto text-sm text-slate-500">{filtered.length} companies</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No companies found" message="Add your first customer, carrier, or lead." />
        ) : (
          <Table>
            <THead>
              <Th>Name</Th>
              <Th>Type</Th>
              <Th>Contact</Th>
              <Th>City / State</Th>
              <Th>Status</Th>
              <Th>Last Load</Th>
            </THead>
            <tbody>
              {filtered.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium text-slate-900">
                    <Link href={`/crm/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                  </Td>
                  <Td>
                    <Badge color={typeColor[c.type]}>{c.type}</Badge>
                  </Td>
                  <Td>{c.contactName || "—"}</Td>
                  <Td>{[c.city, c.state].filter(Boolean).join(", ") || "—"}</Td>
                  <Td>
                    <Badge color={c.status === "ACTIVE" ? "green" : c.status === "PROSPECT" ? "amber" : "slate"}>
                      {c.status}
                    </Badge>
                  </Td>
                  <Td>{formatDate(c.lastLoadDate)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
