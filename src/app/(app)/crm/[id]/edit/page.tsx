import { requireRole } from "@/lib/session";
import { getCompanyById } from "@/lib/data/queries";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { CompanyForm } from "../../CompanyForm";
import { updateCompany } from "@/lib/actions/companies";

export default async function EditCompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "BROKER"]);
  const { id } = await params;
  const company = await getCompanyById(id);
  if (!company) notFound();

  const boundAction = updateCompany.bind(null, company.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Edit {company.name}</h1>
      </div>
      <Card>
        <CardHeader title="Company Details" />
        <CardBody>
          <CompanyForm action={boundAction} company={company} />
        </CardBody>
      </Card>
    </div>
  );
}
