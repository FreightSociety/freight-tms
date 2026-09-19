import { requireUser, canWrite } from "@/lib/session";
import { getAllQuotes } from "@/lib/data/queries";
import { Card } from "@/components/ui/Card";
import { Table, THead, Th, EmptyState } from "@/components/ui/Table";
import { QuoteRow } from "./QuoteRow";

export default async function QuotesPage() {
  const user = await requireUser();
  const quotes = await getAllQuotes();
  const writable = canWrite(user.role);

  const sorted = [...quotes].sort((a, b) => {
    if (a.status === "NEW" && b.status !== "NEW") return -1;
    if (b.status === "NEW" && a.status !== "NEW") return 1;
    return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quotes</h1>
        <p className="text-sm text-slate-500">Inbound lane quote requests from the public quote form.</p>
      </div>

      <Card>
        {sorted.length === 0 ? (
          <EmptyState
            title="No quotes yet"
            message="Quotes submitted from the public quote request form will appear here."
          />
        ) : (
          <Table>
            <THead>
              <Th>Received</Th>
              <Th>Age</Th>
              <Th>Name</Th>
              <Th>Company</Th>
              <Th>Lane</Th>
              <Th>Equipment</Th>
              <Th>Status</Th>
              <Th>Quoted Rate</Th>
              <Th>Action</Th>
            </THead>
            <tbody>
              {sorted.map((q) => (
                <QuoteRow key={q.id} quote={q} canWrite={writable} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
