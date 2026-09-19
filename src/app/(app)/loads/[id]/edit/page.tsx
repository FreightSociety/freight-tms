import { requireRole } from "@/lib/session";
import { getLoadById } from "@/lib/data/queries";
import { getCompaniesByType, getAllUsers } from "@/lib/data/queries";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { LoadForm } from "../../LoadForm";
import { updateLoad } from "@/lib/actions/loads";

export default async function EditLoadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "BROKER"]);
  const { id } = await params;
  const load = await getLoadById(id);
  if (!load) notFound();

  const [customers, carriers, agents] = await Promise.all([
    getCompaniesByType("CUSTOMER"),
    getCompaniesByType("CARRIER"),
    getAllUsers(),
  ]);

  const boundAction = updateLoad.bind(null, load.id);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit {load.loadNumber}</h1>
      </div>
      <Card>
        <CardHeader title="Load Details" />
        <CardBody>
          <LoadForm
            action={boundAction}
            customers={customers}
            carriers={carriers}
            agents={agents}
            load={load}
          />
        </CardBody>
      </Card>
    </div>
  );
}
