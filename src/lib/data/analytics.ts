import { db } from "@/lib/db";
import { loads, companies, users } from "@/lib/db/schema";
import { grossProfit, profitMargin, MONTH_NAMES } from "@/lib/utils/compute";
import { eq } from "drizzle-orm";

export type LoadWithNames = Awaited<ReturnType<typeof getLoadsForAnalytics>>[number];

export async function getLoadsForAnalytics() {
  const rows = await db
    .select({
      id: loads.id,
      date: loads.date,
      customerRate: loads.customerRate,
      carrierCost: loads.carrierCost,
      loadedMiles: loads.loadedMiles,
      customerId: loads.customerId,
      carrierId: loads.carrierId,
      agentId: loads.agentId,
    })
    .from(loads);
  return rows;
}

export async function getFinancialsByYear(year: number) {
  const allLoads = await getLoadsForAnalytics();
  const monthly = MONTH_NAMES.map((m, idx) => {
    const inMonth = allLoads.filter((l) => {
      const d = new Date(l.date);
      return d.getFullYear() === year && d.getMonth() === idx;
    });
    const revenue = inMonth.reduce((s, l) => s + l.customerRate, 0);
    const cost = inMonth.reduce((s, l) => s + l.carrierCost, 0);
    const profit = revenue - cost;
    return { month: m, monthIndex: idx, revenue, cost, profit, loads: inMonth.length };
  });

  const quarters = [0, 1, 2, 3].map((q) => {
    const months = monthly.slice(q * 3, q * 3 + 3);
    return {
      quarter: `Q${q + 1}`,
      revenue: months.reduce((s, m) => s + m.revenue, 0),
      cost: months.reduce((s, m) => s + m.cost, 0),
      profit: months.reduce((s, m) => s + m.profit, 0),
      loads: months.reduce((s, m) => s + m.loads, 0),
    };
  });

  const ytd = {
    revenue: monthly.reduce((s, m) => s + m.revenue, 0),
    cost: monthly.reduce((s, m) => s + m.cost, 0),
    profit: monthly.reduce((s, m) => s + m.profit, 0),
    loads: monthly.reduce((s, m) => s + m.loads, 0),
  };

  return { monthly, quarters, ytd };
}

export async function getAgentPerformance(year: number) {
  const allUsers = await db.select().from(users);
  const allLoads = await getLoadsForAnalytics();

  return allUsers
    .filter((u) => u.role !== "VIEWER")
    .map((agent) => {
      const agentLoads = allLoads.filter((l) => l.agentId === agent.id);
      const monthly = MONTH_NAMES.map((m, idx) => {
        const inMonth = agentLoads.filter((l) => {
          const d = new Date(l.date);
          return d.getFullYear() === year && d.getMonth() === idx;
        });
        return inMonth.reduce((s, l) => s + grossProfit(l), 0);
      });
      const ytdProfit = monthly.reduce((s, m) => s + m, 0);
      const ytdCommission = ytdProfit * agent.commissionRate;
      return {
        agent,
        monthly,
        ytdProfit,
        ytdCommission,
        loadCount: agentLoads.filter((l) => new Date(l.date).getFullYear() === year).length,
      };
    });
}

export async function getBreakdownByCustomer() {
  const allCompanies = await db.select().from(companies).where(eq(companies.type, "CUSTOMER"));
  const allLoads = await getLoadsForAnalytics();
  return allCompanies
    .map((c) => {
      const rows = allLoads.filter((l) => l.customerId === c.id);
      const revenue = rows.reduce((s, l) => s + l.customerRate, 0);
      const profit = rows.reduce((s, l) => s + grossProfit(l), 0);
      return {
        id: c.id,
        name: c.name,
        loads: rows.length,
        revenue,
        profit,
        margin: revenue ? profit / revenue : 0,
      };
    })
    .filter((r) => r.loads > 0)
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getBreakdownByCarrier() {
  const allCompanies = await db.select().from(companies).where(eq(companies.type, "CARRIER"));
  const allLoads = await getLoadsForAnalytics();
  return allCompanies
    .map((c) => {
      const rows = allLoads.filter((l) => l.carrierId === c.id);
      const cost = rows.reduce((s, l) => s + l.carrierCost, 0);
      const profit = rows.reduce((s, l) => s + grossProfit(l), 0);
      const revenue = rows.reduce((s, l) => s + l.customerRate, 0);
      return {
        id: c.id,
        name: c.name,
        loads: rows.length,
        revenue,
        cost,
        profit,
        margin: revenue ? profit / revenue : 0,
      };
    })
    .filter((r) => r.loads > 0)
    .sort((a, b) => b.loads - a.loads);
}

export async function getBreakdownByAgent() {
  const allUsers = await db.select().from(users);
  const allLoads = await getLoadsForAnalytics();
  return allUsers
    .map((u) => {
      const rows = allLoads.filter((l) => l.agentId === u.id);
      const revenue = rows.reduce((s, l) => s + l.customerRate, 0);
      const profit = rows.reduce((s, l) => s + grossProfit(l), 0);
      return {
        id: u.id,
        name: u.name,
        loads: rows.length,
        revenue,
        profit,
        margin: revenue ? profit / revenue : 0,
      };
    })
    .filter((r) => r.loads > 0)
    .sort((a, b) => b.profit - a.profit);
}

export { profitMargin };
