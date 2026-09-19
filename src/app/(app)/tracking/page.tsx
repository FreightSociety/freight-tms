import { requireRole } from "@/lib/session";
import { getAllTracking } from "@/lib/data/queries";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/Table";
import { TrackingRow } from "./TrackingRow";

export default async function TrackingPage() {
  await requireRole(["ADMIN", "BROKER"]);
  const entries = await getAllTracking();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tracking</h1>
        <p className="text-sm text-slate-500">
          Manage customer-facing load status. Nothing financial appears on the public tracking page.
        </p>
      </div>

      <Card>
        {entries.length === 0 ? (
          <EmptyState
            title="No tracking entries"
            message="Create a tracking entry from a load's detail page or when creating a new load."
          />
        ) : (
          <div>
            {entries.map((t) => (
              <TrackingRow key={t.id} t={t} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
