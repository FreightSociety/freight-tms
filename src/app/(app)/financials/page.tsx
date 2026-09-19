import { requireRole } from "@/lib/session";
import { getFinancialsByYear } from "@/lib/data/analytics";
import { Card, CardHeader, CardBody, KpiCard } from "@/components/ui/Card";
import { Table, THead, Th, Td, Tr } from "@/components/ui/Table";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import { RevenueTrendChart } from "../dashboard/DashboardCharts";

export default async function FinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const params = await searchParams;
  const year = params.year ? parseInt(params.year, 10) : new Date().getFullYear();
  const data = await getFinancialsByYear(year);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const ytdMargin = data.ytd.revenue ? data.ytd.profit / data.ytd.revenue : 0;
  const isCurrentYear = year === new Date().getFullYear();
  const thisMonth = isCurrentYear ? data.monthly[new Date().getMonth()] : null;
  const trendData = data.monthly.map((m) => ({ month: m.month, revenue: m.revenue, profit: m.profit }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Overview</h1>
          <p className="text-sm text-slate-500">Company-wide revenue, cost, and profit.</p>
        </div>
        <form className="flex items-center gap-2 text-sm">
          <label htmlFor="year" className="text-slate-500">
            Year:
          </label>
          <select id="year" name="year" defaultValue={year} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
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

      {thisMonth && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <KpiCard label="Revenue (This Month)" value={formatCurrency(thisMonth.revenue)} sub={`${thisMonth.loads} loads`} />
          <KpiCard
            label="Profit (This Month)"
            value={formatCurrency(thisMonth.profit)}
            accent="green"
            sub={thisMonth.revenue ? formatPercent(thisMonth.profit / thisMonth.revenue) + " margin" : undefined}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="YTD Revenue" value={formatCurrency(data.ytd.revenue)} />
        <KpiCard label="YTD Cost" value={formatCurrency(data.ytd.cost)} />
        <KpiCard label="YTD Profit" value={formatCurrency(data.ytd.profit)} accent="green" />
        <KpiCard label="YTD Margin" value={formatPercent(ytdMargin)} />
      </div>

      <Card>
        <CardHeader title="Revenue & Profit Trend" subtitle={`Monthly, ${year}`} />
        <CardBody>
          <RevenueTrendChart data={trendData} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="By Month" />
        <Table>
          <THead>
            <Th>Month</Th>
            <Th className="text-right">Loads</Th>
            <Th className="text-right">Revenue</Th>
            <Th className="text-right">Cost</Th>
            <Th className="text-right">Profit</Th>
            <Th className="text-right">Margin</Th>
          </THead>
          <tbody>
            {data.monthly.map((m) => (
              <Tr key={m.month}>
                <Td className="font-medium text-slate-900">{m.month}</Td>
                <Td className="text-right">{m.loads}</Td>
                <Td className="text-right">{formatCurrency(m.revenue)}</Td>
                <Td className="text-right">{formatCurrency(m.cost)}</Td>
                <Td className="text-right text-emerald-700">{formatCurrency(m.profit)}</Td>
                <Td className="text-right">{m.revenue ? formatPercent(m.profit / m.revenue) : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>

      <Card>
        <CardHeader title="By Quarter" />
        <Table>
          <THead>
            <Th>Quarter</Th>
            <Th className="text-right">Loads</Th>
            <Th className="text-right">Revenue</Th>
            <Th className="text-right">Cost</Th>
            <Th className="text-right">Profit</Th>
            <Th className="text-right">Margin</Th>
          </THead>
          <tbody>
            {data.quarters.map((q) => (
              <Tr key={q.quarter}>
                <Td className="font-medium text-slate-900">{q.quarter}</Td>
                <Td className="text-right">{q.loads}</Td>
                <Td className="text-right">{formatCurrency(q.revenue)}</Td>
                <Td className="text-right">{formatCurrency(q.cost)}</Td>
                <Td className="text-right text-emerald-700">{formatCurrency(q.profit)}</Td>
                <Td className="text-right">{q.revenue ? formatPercent(q.profit / q.revenue) : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
