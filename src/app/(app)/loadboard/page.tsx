import { requireRole } from "@/lib/session";
import { getAllLoadBoardPosts } from "@/lib/data/queries";
import { Card } from "@/components/ui/Card";
import { Table, THead, Th, EmptyState } from "@/components/ui/Table";
import { BoardPostRow } from "./BoardPostRow";

export default async function LoadBoardManagePage() {
  await requireRole(["ADMIN", "BROKER"]);
  const posts = await getAllLoadBoardPosts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Load Board</h1>
        <p className="text-sm text-slate-500">
          Manage which loads are posted publicly. A load only appears at{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/loadboard-public</code> when Post? = Yes and
          Status = Open.
        </p>
      </div>

      <Card>
        {posts.length === 0 ? (
          <EmptyState
            title="No posted loads"
            message="Post a load to the board from its load detail page to see it here."
          />
        ) : (
          <Table>
            <THead>
              <Th>Load #</Th>
              <Th>Lane</Th>
              <Th>Equipment</Th>
              <Th>Miles</Th>
              <Th>Pickup Date</Th>
              <Th>Posted Rate</Th>
              <Th>Status</Th>
              <Th>Post?</Th>
              <Th>Live?</Th>
            </THead>
            <tbody>
              {posts.map((p) => (
                <BoardPostRow key={p.id} post={p} />
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
