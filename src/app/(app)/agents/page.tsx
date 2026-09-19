import { requireUser } from "@/lib/session";
import { getAgentPerformance } from "@/lib/data/analytics";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { MONTH_NAMES } from "@/lib/utils/compute";

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear();

  const allAgents = await getAgentPerformance(year);
  const visible =
    user.role === "ADMIN" ? allAgents : allAgents.filter((a) => a.agent.id === user.id);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agent Performance</h1>
          <p className="text-sm text-slate-500">
            Monthly gross profit and commission by agent.
            {user.role !== "ADMIN" && " You can only see your own commission figures."}
          </p>
        </div>
        <form className="flex items-center gap-2 text-sm">
          <label htmlFor="year" className="text-slate-500">
            Year:
          </label>
          <select
            id="year"
            name="year"
            defaultValue={year}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-slate-900 px-3 py-1.5 text-white">
            Go
          </button>
        </form>
      </div>

      <Card>
        <CardHeader title={`${year} Commission Tracker`} />
        {visible.length === 0 ? (
          <EmptyState title="No agents found" message="Add agents from the Admin Users page." />
        ) : (
          <Table>
            <THead>
              <Th>Agent</Th>
              <Th>Rate</Th>
              {MONTH_NAMES.map((m) => (
                <Th key={m} className="text-right">
                  {m}
                </Th>
              ))}
              <Th className="text-right">YTD Profit</Th>
              <Th className="text-right">YTD Commission</Th>
            </THead>
            <tbody>
              {visible.map((row) => (
                <Tr key={row.agent.id}>
                  <Td className="font-medium text-slate-900">{row.agent.name}</Td>
                  <Td>{formatPercent(row.agent.commissionRate, 0)}</Td>
                  {row.monthly.map((v, idx) => (
                    <Td key={idx} className="text-right">
                      {v ? formatCurrency(v) : "—"}
                    </Td>
                  ))}
                  <Td className="text-right font-medium">{formatCurrency(row.ytdProfit)}</Td>
                  <Td className="text-right font-semibold text-emerald-700">
                    {formatCurrency(row.ytdCommission)}
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
