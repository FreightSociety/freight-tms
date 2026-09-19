import { requireRole } from "@/lib/session";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { CompanyForm } from "../CompanyForm";
import { createCompany } from "@/lib/actions/companies";

export default async function NewCompanyPage() {
  await requireRole(["ADMIN", "BROKER"]);
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Company</h1>
      </div>
      <Card>
        <CardHeader title="Company Details" />
        <CardBody>
          <CompanyForm action={createCompany} />
        </CardBody>
      </Card>
    </div>
  );
}
