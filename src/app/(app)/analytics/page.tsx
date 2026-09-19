import { requireUser } from "@/lib/session";
import {
  getBreakdownByCustomer,
  getBreakdownByCarrier,
  getBreakdownByAgent,
} from "@/lib/data/analytics";
import { Card, CardHeader } from "@/components/ui/Card";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

export default async function AnalyticsPage() {
  await requireUser();
  const [byCustomer, byCarrier, byAgent] = await Promise.all([
    getBreakdownByCustomer(),
    getBreakdownByCarrier(),
    getBreakdownByAgent(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500">Performance breakdowns computed live from the brokering log.</p>
      </div>

      <Card>
        <CardHeader title="By Customer" />
        {byCustomer.length === 0 ? (
          <EmptyState title="No data yet" message="Breakdown appears once loads are logged." />
        ) : (
          <Table>
            <THead>
              <Th>Customer</Th>
              <Th className="text-right">Loads</Th>
              <Th className="text-right">Revenue</Th>
              <Th className="text-right">Profit</Th>
              <Th className="text-right">Margin</Th>
            </THead>
            <tbody>
              {byCustomer.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium text-slate-900">{c.name}</Td>
                  <Td className="text-right">{c.loads}</Td>
                  <Td className="text-right">{formatCurrency(c.revenue)}</Td>
                  <Td className="text-right text-emerald-700">{formatCurrency(c.profit)}</Td>
                  <Td className="text-right">{formatPercent(c.margin)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="By Carrier" />
        {byCarrier.length === 0 ? (
          <EmptyState title="No data yet" message="Breakdown appears once loads are logged." />
        ) : (
          <Table>
            <THead>
              <Th>Carrier</Th>
              <Th className="text-right">Loads</Th>
              <Th className="text-right">Revenue Hauled</Th>
              <Th className="text-right">Cost Paid</Th>
              <Th className="text-right">Profit</Th>
              <Th className="text-right">Margin</Th>
            </THead>
            <tbody>
              {byCarrier.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-medium text-slate-900">{c.name}</Td>
                  <Td className="text-right">{c.loads}</Td>
                  <Td className="text-right">{formatCurrency(c.revenue)}</Td>
                  <Td className="text-right">{formatCurrency(c.cost)}</Td>
                  <Td className="text-right text-emerald-700">{formatCurrency(c.profit)}</Td>
                  <Td className="text-right">{formatPercent(c.margin)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="By Agent" />
        {byAgent.length === 0 ? (
          <EmptyState title="No data yet" message="Breakdown appears once loads are logged." />
        ) : (
          <Table>
            <THead>
              <Th>Agent</Th>
              <Th className="text-right">Loads</Th>
              <Th className="text-right">Revenue</Th>
              <Th className="text-right">Profit</Th>
              <Th className="text-right">Margin</Th>
            </THead>
            <tbody>
              {byAgent.map((a) => (
                <Tr key={a.id}>
                  <Td className="font-medium text-slate-900">{a.name}</Td>
                  <Td className="text-right">{a.loads}</Td>
                  <Td className="text-right">{formatCurrency(a.revenue)}</Td>
                  <Td className="text-right text-emerald-700">{formatCurrency(a.profit)}</Td>
                  <Td className="text-right">{formatPercent(a.margin)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
