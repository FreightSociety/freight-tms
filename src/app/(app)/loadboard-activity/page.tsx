import { requireUser } from "@/lib/session";
import { getLoadBoardPostings } from "@/lib/data/queries";
import { Card } from "@/components/ui/Card";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils/format";

const boardLabel: Record<string, string> = {
  DAT: "DAT",
  CENTRAL_DISPATCH: "CentralDispatch",
};

const statusColor: Record<string, "green" | "amber" | "red" | "slate" | "blue"> = {
  POSTED: "blue",
  COVERED: "green",
  EXPIRED: "amber",
  REMOVED: "slate",
};

export default async function LoadBoardActivityPage() {
  await requireUser();
  const postings = await getLoadBoardPostings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Load Board Activity</h1>
        <p className="text-sm text-slate-500">
          DAT and CentralDispatch have no public API, so this reflects manual entries and the
          latest sync — ask Claude to run a sync from your browser session to refresh it.
        </p>
      </div>

      <Card>
        {postings.length === 0 ? (
          <EmptyState
            title="No postings yet"
            message="Add a posting from a load's detail page, or run a sync from a browser-automation session."
          />
        ) : (
          <Table>
            <THead>
              <Th>Load #</Th>
              <Th>Board</Th>
              <Th>Status</Th>
              <Th className="text-right">Rate</Th>
              <Th>Equipment</Th>
              <Th>Posted At</Th>
              <Th>Last Synced</Th>
              <Th>Notes</Th>
            </THead>
            <tbody>
              {postings.map((p) => (
                <Tr key={p.id}>
                  <Td className="font-medium text-slate-900">{p.load?.loadNumber ?? "—"}</Td>
                  <Td>
                    <Badge color="slate">{boardLabel[p.board] ?? p.board}</Badge>
                  </Td>
                  <Td>
                    <Badge color={statusColor[p.status] ?? "slate"}>{p.status}</Badge>
                  </Td>
                  <Td className="text-right">{p.postedRate ? formatCurrency(p.postedRate) : "—"}</Td>
                  <Td>{p.equipment || "—"}</Td>
                  <Td>{formatDate(p.postedAt)}</Td>
                  <Td>{formatDateTime(p.lastSyncedAt)}</Td>
                  <Td className="max-w-xs truncate">{p.notes || "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
