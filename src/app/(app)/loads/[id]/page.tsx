import { requireUser, canWrite } from "@/lib/session";
import { getLoadById, getLoadBoardPostingsForLoad } from "@/lib/data/queries";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LinkButton, Button, Field, Input, Select, Textarea } from "@/components/ui/Form";
import { formatCurrency, formatPercent, formatDate, formatDateTime } from "@/lib/utils/format";
import { grossProfit, profitMargin, revPerMile } from "@/lib/utils/compute";
import { deleteLoad } from "@/lib/actions/loads";
import { createBoardPostForLoad } from "@/lib/actions/loadboard";
import { addLoadBoardPosting } from "@/lib/actions/loadboard-postings";
import Link from "next/link";

const postingStatusColor: Record<string, "green" | "amber" | "red" | "slate" | "blue"> = {
  POSTED: "blue",
  COVERED: "green",
  EXPIRED: "amber",
  REMOVED: "slate",
};

export default async function LoadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const load = await getLoadById(id);
  if (!load) notFound();

  const writable = canWrite(user.role);
  const loadId = load.id;
  const postings = await getLoadBoardPostingsForLoad(loadId);

  async function boundAddPosting(formData: FormData) {
    "use server";
    await addLoadBoardPosting(loadId, { error: null }, formData);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{load.loadNumber}</h1>
          <p className="text-sm text-slate-500">
            {load.originCity}, {load.originState} → {load.destCity}, {load.destState} ·{" "}
            {formatDate(load.date)}
          </p>
        </div>
        {writable && (
          <div className="flex gap-2">
            <LinkButton href={`/loads/${load.id}/edit`} variant="secondary">
              Edit
            </LinkButton>
            <form action={deleteLoad.bind(null, load.id)}>
              <Button type="submit" variant="danger">
                Delete
              </Button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MiniStat label="Customer Rate" value={formatCurrency(load.customerRate)} />
        <MiniStat label="Carrier Cost" value={formatCurrency(load.carrierCost)} />
        <MiniStat label="Gross Profit" value={formatCurrency(grossProfit(load))} accent="green" />
        <MiniStat label="Margin" value={formatPercent(profitMargin(load))} />
      </div>

      <Card>
        <CardHeader title="Load Details" />
        <CardBody className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Detail label="Customer">
            {load.customer ? (
              <Link href={`/crm/${load.customer.id}`} className="text-slate-900 hover:underline">
                {load.customer.name}
              </Link>
            ) : (
              "—"
            )}
          </Detail>
          <Detail label="Carrier">
            {load.carrier ? (
              <Link href={`/crm/${load.carrier.id}`} className="text-slate-900 hover:underline">
                {load.carrier.name}
              </Link>
            ) : (
              "Unassigned"
            )}
          </Detail>
          <Detail label="Agent">{load.agent?.name ?? "—"}</Detail>
          <Detail label="Commodity">{load.commodity || "—"}</Detail>
          <Detail label="Weight">{load.weight.toLocaleString()} lbs</Detail>
          <Detail label="Equipment">{load.equipment || "—"}</Detail>
          <Detail label="Loaded Miles">{load.loadedMiles.toLocaleString()}</Detail>
          <Detail label="Rev / Mile">{formatCurrency(revPerMile(load))}</Detail>
          <Detail label="Destination ZIP">{load.destZip || "—"}</Detail>
          <Detail label="Customer Terms">{load.customerTerms} days</Detail>
          <Detail label="Carrier Terms">{load.carrierTerms} days</Detail>
          <Detail label="Invoice Date">{formatDate(load.invoiceDate)}</Detail>
          <Detail label="Invoice Status">
            <Badge color={load.invoiceStatus === "PAID" ? "green" : load.invoiceStatus === "INVOICED" ? "blue" : "slate"}>
              {load.invoiceStatus.replace("_", " ")}
            </Badge>
          </Detail>
          <Detail label="Payment Status">
            <Badge color={load.paymentStatus === "PAID" ? "green" : load.paymentStatus === "OVERDUE" ? "red" : "amber"}>
              {load.paymentStatus}
            </Badge>
          </Detail>
          {load.notes && (
            <div className="col-span-full">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Notes</p>
              <p className="mt-1 text-slate-700">{load.notes}</p>
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Tracking"
          subtitle={load.tracking ? "Customer-facing status entry exists." : "No tracking entry yet."}
          action={<LinkButton href="/tracking" variant="secondary">Manage Tracking →</LinkButton>}
        />
      </Card>

      <Card>
        <CardHeader
          title="Load Board"
          subtitle={load.loadBoardPost ? `Status: ${load.loadBoardPost.status}` : "Not posted to the load board."}
          action={
            writable &&
            (load.loadBoardPost ? (
              <LinkButton href="/loadboard" variant="secondary">Manage Post →</LinkButton>
            ) : (
              <form action={createBoardPostForLoad.bind(null, load.id)}>
                <Button type="submit" variant="secondary">Post to Load Board</Button>
              </form>
            ))
          }
        />
      </Card>

      <Card>
        <CardHeader title="Load Board Postings" subtitle="Manual tracking of DAT / CentralDispatch postings for this load." />
        <CardBody>
          {postings.length === 0 ? (
            <EmptyState title="No postings yet" message="Add a posting below once this load is listed on an external board." />
          ) : (
            <Table>
              <THead>
                <Th>Board</Th>
                <Th>Status</Th>
                <Th>External Ref</Th>
                <Th className="text-right">Rate</Th>
                <Th>Equipment</Th>
                <Th>Last Synced</Th>
                <Th>Notes</Th>
              </THead>
              <tbody>
                {postings.map((p) => (
                  <Tr key={p.id}>
                    <Td>
                      <Badge color="slate">{p.board === "CENTRAL_DISPATCH" ? "CentralDispatch" : "DAT"}</Badge>
                    </Td>
                    <Td>
                      <Badge color={postingStatusColor[p.status] ?? "slate"}>{p.status}</Badge>
                    </Td>
                    <Td>{p.externalRef || "—"}</Td>
                    <Td className="text-right">{p.postedRate ? formatCurrency(p.postedRate) : "—"}</Td>
                    <Td>{p.equipment || "—"}</Td>
                    <Td>{formatDateTime(p.lastSyncedAt)}</Td>
                    <Td className="max-w-xs truncate">{p.notes || "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}

          {writable && (
            <form action={boundAddPosting} className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <Field label="Board" required>
                <Select name="board" required defaultValue="DAT">
                  <option value="DAT">DAT</option>
                  <option value="CENTRAL_DISPATCH">CentralDispatch</option>
                </Select>
              </Field>
              <Field label="External Ref">
                <Input name="externalRef" placeholder="Posting ID on the board" />
              </Field>
              <Field label="Status" required>
                <Select name="status" required defaultValue="POSTED">
                  <option value="POSTED">Posted</option>
                  <option value="COVERED">Covered</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="REMOVED">Removed</option>
                </Select>
              </Field>
              <Field label="Rate">
                <Input type="number" step="0.01" name="postedRate" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <Textarea name="notes" rows={2} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit">Add Posting</Button>
              </div>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "green";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold ${accent === "green" ? "text-emerald-600" : "text-slate-900"}`}>
        {value}
      </p>
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
