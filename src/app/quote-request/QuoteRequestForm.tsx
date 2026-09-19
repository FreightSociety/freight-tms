"use client";

import { useActionState } from "react";
import { submitPublicQuote } from "@/lib/actions/quotes";
import { Field, Input, Select, Textarea, Button } from "@/components/ui/Form";

export function QuoteRequestForm() {
  const [state, formAction, pending] = useActionState(submitPublicQuote, { error: null });
  const err = state.fieldErrors ?? {};

  if (state.success) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h2 className="text-lg font-bold text-emerald-800">Thank you!</h2>
        <p className="mt-2 text-sm text-emerald-700">
          Your quote request has been received. A member of our team will reach out shortly with a rate.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Your Name" required error={err.name}>
          <Input name="name" required />
        </Field>
        <Field label="Company">
          <Input name="company" />
        </Field>
        <Field label="Email" required error={err.email}>
          <Input type="email" name="email" required />
        </Field>
        <Field label="Phone">
          <Input name="phone" />
        </Field>
        <Field label="Pickup (City, ST or ZIP)" required error={err.pickupLocation}>
          <Input name="pickupLocation" required placeholder="Atlanta, GA" />
        </Field>
        <Field label="Delivery (City, ST or ZIP)" required error={err.deliveryLocation}>
          <Input name="deliveryLocation" required placeholder="Charlotte, NC" />
        </Field>
        <Field label="Pickup Date">
          <Input type="date" name="pickupDate" />
        </Field>
        <Field label="Weight (lbs)">
          <Input type="number" name="weight" />
        </Field>
        <Field label="Commodity">
          <Input name="commodity" />
        </Field>
        <Field label="Equipment">
          <Select name="equipment" defaultValue="">
            <option value="">Select equipment</option>
            <option>Dry Van</option>
            <option>Reefer</option>
            <option>Flatbed</option>
            <option>Step Deck</option>
            <option>Power Only</option>
            <option>Other</option>
          </Select>
        </Field>
        <Field label="Preferred Contact Method">
          <Select name="contactPrefs" defaultValue="">
            <option value="">No preference</option>
            <option value="Email">Email</option>
            <option value="Phone">Phone</option>
            <option value="Text">Text</option>
          </Select>
        </Field>
      </section>
      <Field label="Notes">
        <Textarea name="notes" rows={3} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Submitting…" : "Request a Quote"}
      </Button>
    </form>
  );
}
