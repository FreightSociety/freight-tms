import { requireUser, canWrite } from "@/lib/session";
import { getCompanyById, getCompanyLoadStats, getCarrierByCompanyId } from "@/lib/data/queries";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardBody, KpiCard } from "@/components/ui/Card";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LinkButton, Button } from "@/components/ui/Form";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { grossProfit } from "@/lib/utils/compute";
import { deleteCompany } from "@/lib/actions/companies";
import Link from "next/link";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) notFound();

  const [stats, carrierRecord] = await Promise.all([
    getCompanyLoadStats(id),
    getCarrierByCompanyId(id),
  ]);

  const writable = canWrite(user.role);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          <p className="text-sm text-slate-500">
            {company.type} · {[company.city, company.state].filter(Boolean).join(", ") || "No location on file"}
          </p>
        </div>
        {writable && (
          <div className="flex gap-2">
            <LinkButton href={`/crm/${company.id}/edit`} variant="secondary">
              Edit
            </LinkButton>
            <form action={deleteCompany.bind(null, company.id)}>
              <Button type="submit" variant="danger">
                Delete
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total Loads" value={String(stats.totalLoads)} />
        <KpiCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} />
        <KpiCard label="Total Cost Paid" value={formatCurrency(stats.totalCost)} />
        <KpiCard label="Total Profit" value={formatCurrency(stats.totalProfit)} accent="green" />
      </div>

      <Card>
        <CardHeader title="Company Info" />
        <CardBody className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Detail label="Contact">{company.contactName || "—"}</Detail>
          <Detail label="Phone">{company.phone || "—"}</Detail>
          <Detail label="Email">{company.email || "—"}</Detail>
          <Detail label="MC #">{company.mcNumber || "—"}</Detail>
          <Detail label="DOT #">{company.dotNumber || "—"}</Detail>
          <Detail label="Lead Source">{company.leadSource || "—"}</Detail>
          <Detail label="Status">
            <Badge color={company.status === "ACTIVE" ? "green" : "slate"}>{company.status}</Badge>
          </Detail>
          <Detail label="Date Added">{formatDate(company.dateAdded)}</Detail>
          <Detail label="Last Load">{formatDate(company.lastLoadDate)}</Detail>
          {company.notes && (
            <div className="col-span-full">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-1 text-slate-700">{company.notes}</p>
            </div>
          )}
        </CardBody>
      </Card>

      {company.type === "CARRIER" && (
        <Card>
          <CardHeader
            title="Compliance"
            subtitle={carrierRecord ? "See full detail on the Carriers page." : "No compliance record yet."}
            action={<LinkButton href="/carriers" variant="secondary">View in Carriers →</LinkButton>}
          />
        </Card>
      )}

      <Card>
        <CardHeader title="Load History" />
        {stats.loads.length === 0 ? (
          <EmptyState title="No loads yet" message="Loads tied to this company will show up here." />
        ) : (
          <Table>
            <THead>
              <Th>Load #</Th>
              <Th>Date</Th>
              <Th>Lane</Th>
              <Th className="text-right">Rate</Th>
              <Th className="text-right">Profit</Th>
            </THead>
            <tbody>
              {stats.loads.map((l) => (
                <Tr key={l.id}>
                  <Td className="font-medium text-slate-900">
                    <Link href={`/loads/${l.id}`} className="hover:underline">
                      {l.loadNumber}
                    </Link>
                  </Td>
                  <Td>{formatDate(l.date)}</Td>
                  <Td>
                    {l.originCity}, {l.originState} → {l.destCity}, {l.destState}
                  </Td>
                  <Td className="text-right">{formatCurrency(l.customerRate)}</Td>
                  <Td className="text-right text-emerald-700">{formatCurrency(grossProfit(l))}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-slate-700">{children}</p>
    </div>
  );
}
