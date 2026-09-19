import { requireUser } from "@/lib/session";
import { KpiCard, Card, CardHeader, CardBody } from "@/components/ui/Card";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/utils/format";
import {
  getFinancialsByYear,
  getBreakdownByCustomer,
  getBreakdownByCarrier,
  getBreakdownByAgent,
} from "@/lib/data/analytics";
import {
  RevenueTrendChart,
  TopCustomersChart,
  TopCarriersChart,
  ProfitByAgentChart,
} from "./DashboardCharts";

export default async function DashboardPage() {
  const user = await requireUser();
  const year = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth();

  const [financials, byCustomer, byCarrier, byAgent] = await Promise.all([
    getFinancialsByYear(year),
    getBreakdownByCustomer(),
    getBreakdownByCarrier(),
    getBreakdownByAgent(),
  ]);

  const thisMonth = financials.monthly[currentMonthIdx];
  const ytdMargin = financials.ytd.revenue ? financials.ytd.profit / financials.ytd.revenue : 0;

  const trendData = financials.monthly.map((m) => ({
    month: m.month,
    revenue: m.revenue,
    profit: m.profit,
  }));

  const topCustomers = byCustomer.slice(0, 5).map((c) => ({ name: c.name, revenue: c.revenue }));
  const topCarriers = byCarrier
    .slice()
    .sort((a, b) => b.loads - a.loads)
    .slice(0, 5)
    .map((c) => ({ name: c.name, loads: c.loads }));
  const agentProfit = byAgent
    .filter((a) => user.role === "ADMIN" || a.id === user.id)
    .map((a) => ({ name: a.name, profit: a.profit }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome back, {user.name.split(" ")[0]}. Here&apos;s how Freight Society is doing in {year}.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue (This Month)" value={formatCurrency(thisMonth.revenue)} sub={`${thisMonth.loads} loads`} />
        <KpiCard
          label="Profit (This Month)"
          value={formatCurrency(thisMonth.profit)}
          accent="green"
          sub={thisMonth.revenue ? formatPercent(thisMonth.profit / thisMonth.revenue) + " margin" : undefined}
        />
        <KpiCard label="YTD Revenue" value={formatCurrency(financials.ytd.revenue)} sub={`${financials.ytd.loads} loads YTD`} />
        <KpiCard label="YTD Profit" value={formatCurrency(financials.ytd.profit)} accent="green" sub={`${formatPercent(ytdMargin)} avg margin`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue & Profit Trend" subtitle={`Monthly, ${year}`} />
          <CardBody>
            <RevenueTrendChart data={trendData} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Profit by Agent" subtitle={user.role === "ADMIN" ? "All agents, YTD" : "Your YTD profit"} />
          <CardBody>
            {agentProfit.length ? (
              <ProfitByAgentChart data={agentProfit} />
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">No loads yet.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top 5 Customers" subtitle="By revenue" />
          <CardBody>
            {topCustomers.length ? (
              <TopCustomersChart data={topCustomers} />
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">No customer revenue yet.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Top 5 Carriers" subtitle="By load count" />
          <CardBody>
            {topCarriers.length ? (
              <TopCarriersChart data={topCarriers} />
            ) : (
              <p className="py-10 text-center text-sm text-slate-400">No carrier loads yet.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Quick Stats" />
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Total Loads (YTD)" value={formatNumber(financials.ytd.loads)} />
          <Stat label="Avg Margin (YTD)" value={formatPercent(ytdMargin)} />
          <Stat label="Active Customers" value={formatNumber(byCustomer.length)} />
          <Stat label="Active Carriers" value={formatNumber(byCarrier.length)} />
        </CardBody>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
