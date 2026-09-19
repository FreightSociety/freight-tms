"use client";

import { useActionState, useState } from "react";
import { Field, Input, Select, Textarea, Button } from "@/components/ui/Form";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { CompanyRow, UserRow, LoadRow } from "@/lib/db/schema";
import type { LoadFormState } from "@/lib/actions/loads";

export function LoadForm({
  action,
  customers,
  carriers,
  agents,
  load,
  nextLoadNumber,
  showLinkedOptions = false,
}: {
  action: (prev: LoadFormState, formData: FormData) => Promise<LoadFormState>;
  customers: CompanyRow[];
  carriers: CompanyRow[];
  agents: UserRow[];
  load?: LoadRow;
  nextLoadNumber?: string;
  showLinkedOptions?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [rate, setRate] = useState(load?.customerRate ?? 0);
  const [cost, setCost] = useState(load?.carrierCost ?? 0);
  const [miles, setMiles] = useState(load?.loadedMiles ?? 0);

  const grossProfit = rate - cost;
  const margin = rate ? grossProfit / rate : 0;
  const revPerMile = miles ? rate / miles : 0;

  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Load #">
          <Input value={load?.loadNumber ?? nextLoadNumber ?? "Auto-generated"} disabled />
          {!load && (
            <input type="hidden" name="loadNumber" value={nextLoadNumber ?? ""} />
          )}
        </Field>
        <Field label="Date" required error={err.date}>
          <Input
            type="date"
            name="date"
            required
            defaultValue={
              load ? new Date(load.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
            }
          />
        </Field>
        <Field label="Equipment" error={err.equipment}>
          <Select name="equipment" defaultValue={load?.equipment ?? ""}>
            <option value="">Select equipment</option>
            <option>Dry Van</option>
            <option>Reefer</option>
            <option>Flatbed</option>
            <option>Step Deck</option>
            <option>Power Only</option>
            <option>Other</option>
          </Select>
        </Field>

        <Field label="Customer" required error={err.customerId}>
          <Select name="customerId" required defaultValue={load?.customerId ?? ""}>
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Carrier" error={err.carrierId}>
          <Select name="carrierId" defaultValue={load?.carrierId ?? ""}>
            <option value="">Unassigned</option>
            {carriers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Agent / Broker" required error={err.agentId}>
          <Select name="agentId" required defaultValue={load?.agentId ?? ""}>
            <option value="">Select agent</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Origin City" required error={err.originCity}>
          <Input name="originCity" required defaultValue={load?.originCity ?? ""} />
        </Field>
        <Field label="Origin State" required error={err.originState}>
          <Input name="originState" required maxLength={2} defaultValue={load?.originState ?? ""} />
        </Field>
        <div />
        <Field label="Destination City" required error={err.destCity}>
          <Input name="destCity" required defaultValue={load?.destCity ?? ""} />
        </Field>
        <Field label="Destination State" required error={err.destState}>
          <Input name="destState" required maxLength={2} defaultValue={load?.destState ?? ""} />
        </Field>
        <Field label="Destination ZIP" error={err.destZip}>
          <Input name="destZip" defaultValue={load?.destZip ?? ""} />
        </Field>

        <Field label="Loaded Miles" required error={err.loadedMiles}>
          <Input
            type="number"
            step="1"
            name="loadedMiles"
            required
            defaultValue={load?.loadedMiles ?? 0}
            onChange={(e) => setMiles(Number(e.target.value))}
          />
        </Field>
        <Field label="Commodity" error={err.commodity}>
          <Input name="commodity" defaultValue={load?.commodity ?? ""} />
        </Field>
        <Field label="Weight (lbs)" required error={err.weight}>
          <Input type="number" step="1" name="weight" required defaultValue={load?.weight ?? 0} />
        </Field>

        <Field label="Customer Rate ($)" required error={err.customerRate}>
          <Input
            type="number"
            step="0.01"
            name="customerRate"
            required
            defaultValue={load?.customerRate ?? 0}
            onChange={(e) => setRate(Number(e.target.value))}
          />
        </Field>
        <Field label="Carrier Cost ($)" required error={err.carrierCost}>
          <Input
            type="number"
            step="0.01"
            name="carrierCost"
            required
            defaultValue={load?.carrierCost ?? 0}
            onChange={(e) => setCost(Number(e.target.value))}
          />
        </Field>
        <div />

        <Field label="Customer Terms (days)" required error={err.customerTerms}>
          <Input type="number" name="customerTerms" required defaultValue={load?.customerTerms ?? 30} />
        </Field>
        <Field label="Carrier Terms (days)" required error={err.carrierTerms}>
          <Input type="number" name="carrierTerms" required defaultValue={load?.carrierTerms ?? 15} />
        </Field>
        <div />

        <Field label="Invoice Date">
          <Input
            type="date"
            name="invoiceDate"
            defaultValue={load?.invoiceDate ? new Date(load.invoiceDate).toISOString().slice(0, 10) : ""}
          />
        </Field>
        <Field label="Invoice Status" required error={err.invoiceStatus}>
          <Select name="invoiceStatus" required defaultValue={load?.invoiceStatus ?? "NOT_INVOICED"}>
            <option value="NOT_INVOICED">Not Invoiced</option>
            <option value="INVOICED">Invoiced</option>
            <option value="PAID">Paid</option>
          </Select>
        </Field>
        <Field label="Payment Status" required error={err.paymentStatus}>
          <Select name="paymentStatus" required defaultValue={load?.paymentStatus ?? "PENDING"}>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
          </Select>
        </Field>
      </section>

      <Field label="Notes">
        <Textarea name="notes" rows={3} defaultValue={load?.notes ?? ""} />
      </Field>

      <div className="grid grid-cols-3 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <ComputedStat label="Gross Profit" value={formatCurrency(grossProfit)} positive={grossProfit >= 0} />
        <ComputedStat label="Profit Margin" value={formatPercent(margin)} positive={margin >= 0} />
        <ComputedStat label="Rev / Mile" value={formatCurrency(revPerMile)} positive />
      </div>

      {showLinkedOptions && !load && (
        <div className="space-y-2 rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-700">Also create:</p>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="createTracking" className="rounded border-slate-300" />
            Tracking entry for customer-facing status
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="createBoardPost" className="rounded border-slate-300" />
            Load board post (public)
          </label>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : load ? "Save Changes" : "Create Load"}
        </Button>
      </div>
    </form>
  );
}

function ComputedStat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${positive ? "text-emerald-600" : "text-red-600"}`}>{value}</p>
    </div>
  );
}
