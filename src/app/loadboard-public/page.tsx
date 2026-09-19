import { PublicHeader, PublicFooter } from "@/components/layout/PublicHeader";
import { getPublicLoadBoard } from "@/lib/data/queries";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { Card } from "@/components/ui/Card";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function PublicLoadBoardPage() {
  const posts = await getPublicLoadBoard();
  const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? "(555) 123-4567";
  const email = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? "dispatch@freightsociety.com";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicHeader />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900">Available Loads</h1>
            <p className="mt-2 text-slate-600">
              Call <span className="font-semibold text-slate-900">{phone}</span> or email{" "}
              <span className="font-semibold text-slate-900">{email}</span> to book any of these loads.
            </p>
          </div>

          <div className="mt-10">
            <Card>
              {posts.length === 0 ? (
                <EmptyState
                  title="No open loads right now"
                  message="Check back soon, or call us directly to ask about upcoming freight."
                />
              ) : (
                <Table>
                  <THead>
                    <Th>Origin</Th>
                    <Th>Destination</Th>
                    <Th>Equipment</Th>
                    <Th className="text-right">Miles</Th>
                    <Th>Pickup Date</Th>
                    <Th className="text-right">Posted Rate</Th>
                    <Th>Notes</Th>
                  </THead>
                  <tbody>
                    {posts.map((p) => (
                      <Tr key={p.id}>
                        <Td>
                          {p.load!.originCity}, {p.load!.originState}
                        </Td>
                        <Td>
                          {p.load!.destCity}, {p.load!.destState}
                        </Td>
                        <Td>{p.load!.equipment || "—"}</Td>
                        <Td className="text-right">{p.load!.loadedMiles.toLocaleString()}</Td>
                        <Td>{formatDate(p.pickupDate)}</Td>
                        <Td className="text-right font-medium text-slate-900">
                          {p.postedRate ? formatCurrency(p.postedRate) : "Call for rate"}
                        </Td>
                        <Td>{p.notes || "—"}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
