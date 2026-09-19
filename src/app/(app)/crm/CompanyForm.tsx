"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea, Button } from "@/components/ui/Form";
import type { CompanyRow } from "@/lib/db/schema";
import type { CompanyFormState } from "@/lib/actions/companies";

export function CompanyForm({
  action,
  company,
}: {
  action: (prev: CompanyFormState, formData: FormData) => Promise<CompanyFormState>;
  company?: CompanyRow;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Company Name" required error={err.name}>
          <Input name="name" required defaultValue={company?.name ?? ""} />
        </Field>
        <Field label="Type" required error={err.type}>
          <Select name="type" required defaultValue={company?.type ?? "CUSTOMER"}>
            <option value="CUSTOMER">Customer</option>
            <option value="CARRIER">Carrier</option>
            <option value="LEAD">Lead</option>
          </Select>
        </Field>
        <Field label="Contact Name">
          <Input name="contactName" defaultValue={company?.contactName ?? ""} />
        </Field>
        <Field label="Status" required error={err.status}>
          <Select name="status" required defaultValue={company?.status ?? "ACTIVE"}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="PROSPECT">Prospect</option>
          </Select>
        </Field>
        <Field label="Phone">
          <Input name="phone" defaultValue={company?.phone ?? ""} />
        </Field>
        <Field label="Email">
          <Input type="email" name="email" defaultValue={company?.email ?? ""} />
        </Field>
        <Field label="City">
          <Input name="city" defaultValue={company?.city ?? ""} />
        </Field>
        <Field label="State">
          <Input name="state" maxLength={2} defaultValue={company?.state ?? ""} />
        </Field>
        <Field label="MC #">
          <Input name="mcNumber" defaultValue={company?.mcNumber ?? ""} />
        </Field>
        <Field label="DOT #">
          <Input name="dotNumber" defaultValue={company?.dotNumber ?? ""} />
        </Field>
        <Field label="Lead Source">
          <Input name="leadSource" defaultValue={company?.leadSource ?? ""} />
        </Field>
      </section>

      <Field label="Notes">
        <Textarea name="notes" rows={3} defaultValue={company?.notes ?? ""} />
      </Field>

      {!company && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" name="createCarrierRecord" className="rounded border-slate-300" />
          Also create a Carriers compliance record (for Type = Carrier)
        </label>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : company ? "Save Changes" : "Create Company"}
      </Button>
    </form>
  );
}
