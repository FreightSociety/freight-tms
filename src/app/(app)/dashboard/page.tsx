import { requireUser } from "@/lib/session";
import { KpiCard, Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Form";
import { formatDate, formatNumber, formatCurrency } from "@/lib/utils/format";
import { insuranceAlert, insuranceAlertLabel, daysUntilExpiry, trackingStageLabel } from "@/lib/utils/compute";
import {
  getDashboardOperationsSnapshot,
  getUpcomingPickupsAndDeliveries,
  getOpenQuotesCount,
  getAllCarriers,
  getLoadBoardPostingStatusCounts,
  getRecentOpenQuotes,
} from "@/lib/data/queries";
import Link from "next/link";

const alertColor: Record<string, "green" | "amber" | "red" | "slate"> = {
  OK: "green",
  EXPIRING_SOON: "amber",
  EXPIRED: "red",
  UNKNOWN: "slate",
};

const postingStatusColor: Record<string, "green" | "amber" | "red" | "slate" | "blue"> = {
  POSTED: "blue",
  COVERED: "green",
  EXPIRED: "amber",
  REMOVED: "slate",
};

const quoteStatusColor: Record<string, "green" | "amber" | "red" | "slate" | "blue"> = {
  NEW: "blue",
  QUOTED: "amber",
};

export default async function DashboardPage() {
  const user = await requireUser();

  const [snapshot, upcoming, openQuotes, carriers, loadBoardStats, recentQuotes] = await Promise.all([
    getDashboardOperationsSnapshot(),
    getUpcomingPickupsAndDeliveries(8),
    getOpenQuotesCount(),
    getAllCarriers(),
    getLoadBoardPostingStatusCounts(),
    getRecentOpenQuotes(5),
  ]);

  const complianceAlerts = carriers
    .map((c) => ({ carrier: c, alert: insuranceAlert(c.insuranceExpiry), days: daysUntilExpiry(c.insuranceExpiry) }))
    .filter((c) => c.alert === "EXPIRING_SOON" || c.alert === "EXPIRED")
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
    .slice(0, 5);

  const statusOrder = ["PENDING", "BOOKED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome back, {user.name.split(" ")[0]}. Here&apos;s what&apos;s moving right now.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active Loads" value={formatNumber(snapshot.activeLoads)} sub="Not yet delivered" />
        <KpiCard label="Picked Up This Week" value={formatNumber(snapshot.pickedUpThisWeek)} accent="blue" />
        <KpiCard label="Upcoming Pickups (7 days)" value={formatNumber(snapshot.upcomingPickups7d)} accent="amber" />
        <KpiCard label="Open Quotes" value={formatNumber(openQuotes)} accent="green" sub="New / Quoted" />
      </div>

      <Card>
        <CardHeader title="Loads by Status" subtitle="Current tracking stage across all loads" />
        <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {statusOrder.map((s) => (
            <div key={s}>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{trackingStageLabel[s]}</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(snapshot.byStatus[s])}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Upcoming Pickups & Deliveries" subtitle="Next up, soonest first" />
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing upcoming" message="No pickups or deliveries scheduled in the near term." />
          ) : (
            <Table>
              <THead>
                <Th>Load #</Th>
                <Th>Lane</Th>
                <Th>Customer</Th>
                <Th>Carrier</Th>
                <Th>Next</Th>
              </THead>
              <tbody>
                {upcoming.map(({ load, nextDate, kind }) => (
                  <Tr key={load.id}>
                    <Td className="font-medium text-slate-900">
                      <Link href={`/loads/${load.id}`} className="hover:underline">
                        {load.loadNumber}
                      </Link>
                    </Td>
                    <Td>
                      {load.originCity}, {load.originState} → {load.destCity}, {load.destState}
                    </Td>
                    <Td>{load.customer?.name ?? "—"}</Td>
                    <Td>{load.carrier?.name ?? "Unassigned"}</Td>
                    <Td>
                      <Badge color={kind === "pickup" ? "amber" : "blue"}>
                        {kind === "pickup" ? "Pickup" : "Delivery"} {formatDate(nextDate.toISOString())}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Carrier Compliance Alerts"
            subtitle="Insurance expiring soon or expired"
            action={<LinkButton href="/carriers" variant="secondary">View Carriers →</LinkButton>}
          />
          {complianceAlerts.length === 0 ? (
            <EmptyState title="All clear" message="No carriers with expiring or expired insurance." />
          ) : (
            <Table>
              <THead>
                <Th>Carrier</Th>
                <Th>Expiry</Th>
                <Th>Alert</Th>
              </THead>
              <tbody>
                {complianceAlerts.map(({ carrier, alert }) => (
                  <Tr key={carrier.id}>
                    <Td className="font-medium text-slate-900">
                      <Link href={`/carriers/${carrier.id}/edit`} className="hover:underline">
                        {carrier.company?.name ?? "Unknown"}
                      </Link>
                    </Td>
                    <Td>{formatDate(carrier.insuranceExpiry)}</Td>
                    <Td>
                      <Badge color={alertColor[alert]}>{insuranceAlertLabel[alert]}</Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Load Board Activity"
            subtitle="Postings by status, across all boards"
            action={<LinkButton href="/loadboard-activity" variant="secondary">View Activity →</LinkButton>}
          />
          <CardBody className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Posted</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(loadBoardStats.counts.POSTED)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Covered</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(loadBoardStats.counts.COVERED)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Expired</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(loadBoardStats.counts.EXPIRED)}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Removed</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{formatNumber(loadBoardStats.counts.REMOVED)}</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Quotes" subtitle="Newest first, New / Quoted" action={<LinkButton href="/quotes" variant="secondary">View Quotes →</LinkButton>} />
          {recentQuotes.length === 0 ? (
            <EmptyState title="No open quotes" message="New quote requests will show up here." />
          ) : (
            <Table>
              <THead>
                <Th>From</Th>
                <Th>Lane</Th>
                <Th>Status</Th>
                <Th className="text-right">Rate</Th>
              </THead>
              <tbody>
                {recentQuotes.map((q) => (
                  <Tr key={q.id}>
                    <Td className="font-medium text-slate-900">{q.name}</Td>
                    <Td>
                      {q.pickupLocation} → {q.deliveryLocation}
                    </Td>
                    <Td>
                      <Badge color={quoteStatusColor[q.status] ?? "slate"}>{q.status}</Badge>
                    </Td>
                    <Td className="text-right">{q.quotedRate ? formatCurrency(q.quotedRate) : "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
