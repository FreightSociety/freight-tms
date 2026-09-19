import { requireRole } from "@/lib/session";
import { getCarrierById, getVettingHistory } from "@/lib/data/queries";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Field, Input, Select, Textarea, Button } from "@/components/ui/Form";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { updateCarrier } from "@/lib/actions/carriers";
import { FmcsaLookupAction } from "../../FmcsaLookupAction";
import { Carrier411LookupAction } from "../../Carrier411LookupAction";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils/format";
import { toInputDate } from "@/lib/utils/format";

const authorityColor: Record<string, "green" | "amber" | "red"> = {
  ACTIVE: "green",
  INACTIVE: "amber",
  REVOKED: "red",
};

export default async function EditCarrierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "BROKER"]);
  const { id } = await params;
  const carrier = await getCarrierById(id);
  if (!carrier) notFound();
  const carrierId = carrier.id;
  const vettingHistory = await getVettingHistory(carrierId);

  async function boundAction(formData: FormData) {
    "use server";
    await updateCarrier(carrierId, { error: null }, formData);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{carrier.company?.name ?? "Carrier"}</h1>
        <p className="text-sm text-slate-500">Compliance & vetting record</p>
      </div>

      <Card>
        <CardHeader title="Carrier Vetting" subtitle="Run authority/safety checks against FMCSA SAFER and/or Carrier411." />
        <CardBody className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              {carrier.fmcsaLastChecked
                ? `FMCSA — last checked ${formatDateTime(carrier.fmcsaLastChecked)}`
                : "FMCSA — never checked"}
            </p>
            <FmcsaLookupAction carrierId={carrier.id} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              {carrier.carrier411LastChecked
                ? `Carrier411 — last checked ${formatDateTime(carrier.carrier411LastChecked)}`
                : "Carrier411 — never checked"}
            </p>
            <Carrier411LookupAction carrierId={carrier.id} />
            {carrier.carrier411Raw && <SmsScoreBadges rawJson={carrier.carrier411Raw} />}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Vetting History" subtitle="Every FMCSA / Carrier411 check ever run for this carrier." />
        {vettingHistory.length === 0 ? (
          <EmptyState title="No checks yet" message="Run an FMCSA or Carrier411 lookup above to start building a history." />
        ) : (
          <Table>
            <THead>
              <Th>Date</Th>
              <Th>Source</Th>
              <Th>Legal Name</Th>
              <Th>Authority Status</Th>
              <Th>Safety Rating</Th>
            </THead>
            <tbody>
              {vettingHistory.map((v) => (
                <Tr key={v.id}>
                  <Td>{formatDateTime(v.checkedAt)}</Td>
                  <Td>
                    <Badge color={v.source === "CARRIER411" ? "purple" : "blue"}>{v.source}</Badge>
                  </Td>
                  <Td>{v.legalName || "—"}</Td>
                  <Td>
                    {v.authorityStatus ? (
                      <Badge color={authorityColor[v.authorityStatus]}>{v.authorityStatus}</Badge>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>{v.safetyRating ? v.safetyRating.replace("_", " ") : "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <CardHeader title="Compliance Details" />
        <CardBody>
          <form action={boundAction} className="space-y-6">
            <CarrierFormFields carrier={carrier} />
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

function CarrierFormFields({
  carrier,
}: {
  carrier: NonNullable<Awaited<ReturnType<typeof getCarrierById>>>;
}) {
  return (
    <>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="MC #">
          <Input name="mcNumber" defaultValue={carrier.mcNumber ?? ""} />
        </Field>
        <Field label="DOT #">
          <Input name="dotNumber" defaultValue={carrier.dotNumber ?? ""} />
        </Field>
        <Field label="Insurance Company">
          <Input name="insuranceCompany" defaultValue={carrier.insuranceCompany ?? ""} />
        </Field>
        <Field label="Policy #">
          <Input name="policyNumber" defaultValue={carrier.policyNumber ?? ""} />
        </Field>
        <Field label="Insurance Expiry">
          <Input type="date" name="insuranceExpiry" defaultValue={toInputDate(carrier.insuranceExpiry)} />
        </Field>
        <Field label="Authority Status" required>
          <Select name="authorityStatus" required defaultValue={carrier.authorityStatus}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="REVOKED">Revoked</option>
          </Select>
        </Field>
        <Field label="Safety Rating" required>
          <Select name="safetyRating" required defaultValue={carrier.safetyRating}>
            <option value="SATISFACTORY">Satisfactory</option>
            <option value="CONDITIONAL">Conditional</option>
            <option value="UNSATISFACTORY">Unsatisfactory</option>
            <option value="NOT_RATED">Not Rated</option>
          </Select>
        </Field>
        <Field label="Equipment Type(s)">
          <Input name="equipmentTypes" placeholder="Reefer, Dry Van" defaultValue={carrier.equipmentTypes ?? ""} />
        </Field>
      </section>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="preferred" defaultChecked={carrier.preferred} className="rounded border-slate-300" />
          Preferred carrier
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="watchlist" defaultChecked={carrier.watchlist} className="rounded border-slate-300" />
          On watchlist
        </label>
      </div>

      <Field label="Notes">
        <Textarea name="notes" rows={3} defaultValue={carrier.notes ?? ""} />
      </Field>

      <Button type="submit">Save Changes</Button>
    </>
  );
}

function SmsScoreBadges({ rawJson }: { rawJson: string }) {
  let smsScores: Record<string, string | number> = {};
  try {
    const parsed = JSON.parse(rawJson) as { sms?: Record<string, string | number> };
    smsScores = parsed.sms ?? {};
  } catch {
    return null;
  }

  const entries = Object.entries(smsScores).filter(([, v]) => v !== null && v !== "");
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {entries.map(([label, value]) => (
        <Badge key={label} color="slate">
          {label.replace(/([A-Z])/g, " $1").trim()}: {String(value)}
        </Badge>
      ))}
    </div>
  );
}
