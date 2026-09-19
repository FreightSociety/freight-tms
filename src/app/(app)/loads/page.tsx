import { requireUser, canWrite } from "@/lib/session";
import { getAllLoads } from "@/lib/data/queries";
import { Card } from "@/components/ui/Card";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Form";
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils/format";
import { grossProfit, profitMargin } from "@/lib/utils/compute";
import Link from "next/link";

const paymentColor: Record<string, "green" | "amber" | "red"> = {
  PAID: "green",
  PENDING: "amber",
  OVERDUE: "red",
};

export default async function LoadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const q = (params.q ?? "").toLowerCase().trim();

  const allLoads = await getAllLoads();
  const filtered = q
    ? allLoads.filter((l) =>
        [
          l.loadNumber,
          l.customer?.name,
          l.carrier?.name,
          l.agent?.name,
          l.originCity,
          l.destCity,
          l.commodity,
        ]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q))
      )
    : allLoads;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Loads</h1>
          <p className="text-sm text-slate-500">The master brokering log — every load you&apos;ve booked.</p>
        </div>
        {canWrite(user.role) && <LinkButton href="/loads/new">+ New Load</LinkButton>}
      </div>

      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <form className="flex-1">
            <input
              type="text"
              name="q"
              defaultValue={params.q}
              placeholder="Search load #, customer, carrier, agent, lane…"
              className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            />
          </form>
          <span className="text-sm text-slate-500">{filtered.length} loads</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="No loads found"
            message={
              q
                ? "No loads match your search. Try a different term."
                : "Create your first load to start building the brokering log."
            }
          />
        ) : (
          <Table>
            <THead>
              <Th>Load #</Th>
              <Th>Date</Th>
              <Th>Customer</Th>
              <Th>Carrier</Th>
              <Th>Agent</Th>
              <Th>Lane</Th>
              <Th className="text-right">Rate</Th>
              <Th className="text-right">Profit</Th>
              <Th className="text-right">Margin</Th>
              <Th>Payment</Th>
            </THead>
            <tbody>
              {filtered.map((l) => (
                <Tr key={l.id}>
                  <Td className="font-medium text-slate-900">
                    <Link href={`/loads/${l.id}`} className="hover:underline">
                      {l.loadNumber}
                    </Link>
                  </Td>
                  <Td>{formatDate(l.date)}</Td>
                  <Td>{l.customer?.name ?? "—"}</Td>
                  <Td>{l.carrier?.name ?? "—"}</Td>
                  <Td>{l.agent?.name ?? "—"}</Td>
                  <Td>
                    {l.originCity}, {l.originState} → {l.destCity}, {l.destState}
                  </Td>
                  <Td className="text-right">{formatCurrency(l.customerRate)}</Td>
                  <Td className="text-right font-medium text-emerald-700">
                    {formatCurrency(grossProfit(l))}
                  </Td>
                  <Td className="text-right">{formatPercent(profitMargin(l))}</Td>
                  <Td>
                    <Badge color={paymentColor[l.paymentStatus] ?? "slate"}>{l.paymentStatus}</Badge>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
