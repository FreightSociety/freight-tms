import { requireRole } from "@/lib/session";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { LoadForm } from "../LoadForm";
import { createLoad } from "@/lib/actions/loads";
import { getCompaniesByType, getAllUsers, getNextLoadNumber } from "@/lib/data/queries";

export default async function NewLoadPage() {
  await requireRole(["ADMIN", "BROKER"]);
  const [customers, carriers, agents, nextLoadNumber] = await Promise.all([
    getCompaniesByType("CUSTOMER"),
    getCompaniesByType("CARRIER"),
    getAllUsers(),
    getNextLoadNumber(),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Load</h1>
        <p className="text-sm text-slate-500">Log a new brokered load.</p>
      </div>
      <Card>
        <CardHeader title="Load Details" />
        <CardBody>
          <LoadForm
            action={createLoad}
            customers={customers}
            carriers={carriers}
            agents={agents.filter((a) => a.active)}
            nextLoadNumber={nextLoadNumber}
            showLinkedOptions
          />
        </CardBody>
      </Card>
    </div>
  );
}
