import { requireUser, canWrite } from "@/lib/session";
import { getAllCarriers } from "@/lib/data/queries";
import { Card } from "@/components/ui/Card";
import { Table, THead, Th, Td, Tr, EmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Form";
import { formatDate } from "@/lib/utils/format";
import { insuranceAlert, insuranceAlertLabel, daysUntilExpiry } from "@/lib/utils/compute";
import { FmcsaLookupButton } from "./FmcsaLookupButton";
import { Carrier411LookupButton } from "./Carrier411LookupButton";
import { ToggleFlagButton } from "./ToggleFlagButton";
import Link from "next/link";

const alertColor: Record<string, "green" | "amber" | "red" | "slate"> = {
  OK: "green",
  EXPIRING_SOON: "amber",
  EXPIRED: "red",
  UNKNOWN: "slate",
};

const authorityColor: Record<string, "green" | "amber" | "red"> = {
  ACTIVE: "green",
  INACTIVE: "amber",
  REVOKED: "red",
};

export default async function CarriersPage() {
  const user = await requireUser();
  const all = await getAllCarriers();
  const writable = canWrite(user.role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carriers</h1>
          <p className="text-sm text-slate-500">Compliance & vetting for every carrier you dispatch to.</p>
        </div>
        <LinkButton href="/crm/new">+ New Carrier</LinkButton>
      </div>

      <Card>
        {all.length === 0 ? (
          <EmptyState title="No carriers yet" message="Add a carrier company from the CRM page to get started." />
        ) : (
          <Table>
            <THead>
              <Th>Carrier</Th>
              <Th>MC / DOT</Th>
              <Th>Insurance Expiry</Th>
              <Th>Days Left</Th>
              <Th>Alert</Th>
              <Th>Authority</Th>
              <Th>Safety Rating</Th>
              <Th>Flags</Th>
              {writable && <Th>Actions</Th>}
            </THead>
            <tbody>
              {all.map((c) => {
                const alert = insuranceAlert(c.insuranceExpiry);
                const days = daysUntilExpiry(c.insuranceExpiry);
                return (
                  <Tr key={c.id}>
                    <Td className="font-medium text-slate-900">
                      <Link href={`/carriers/${c.id}/edit`} className="hover:underline">
                        {c.company?.name ?? "Unknown"}
                      </Link>
                    </Td>
                    <Td>
                      {c.mcNumber || "—"} / {c.dotNumber || "—"}
                    </Td>
                    <Td>{formatDate(c.insuranceExpiry)}</Td>
                    <Td>{days === null ? "—" : days}</Td>
                    <Td>
                      <Badge color={alertColor[alert]}>{insuranceAlertLabel[alert]}</Badge>
                    </Td>
                    <Td>
                      <Badge color={authorityColor[c.authorityStatus]}>{c.authorityStatus}</Badge>
                    </Td>
                    <Td>{c.safetyRating.replace("_", " ")}</Td>
                    <Td>
                      <div className="flex flex-col gap-1">
                        {writable ? (
                          <>
                            <ToggleFlagButton carrierId={c.id} flag="preferred" value={c.preferred} label="Preferred" />
                            <ToggleFlagButton carrierId={c.id} flag="watchlist" value={c.watchlist} label="Watchlist" />
                          </>
                        ) : (
                          <>
                            {c.preferred && <Badge color="blue">Preferred</Badge>}
                            {c.watchlist && <Badge color="red">Watchlist</Badge>}
                          </>
                        )}
                      </div>
                    </Td>
                    {writable && (
                      <Td>
                        <div className="flex flex-col items-start gap-2">
                          <Link href={`/carriers/${c.id}/edit`} className="text-xs font-medium text-slate-600 hover:underline">
                            Edit
                          </Link>
                          <FmcsaLookupButton dotNumber={c.dotNumber} mcNumber={c.mcNumber} />
                          <Carrier411LookupButton dotNumber={c.dotNumber} mcNumber={c.mcNumber} carrierId={c.id} />
                        </div>
                      </Td>
                    )}
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
