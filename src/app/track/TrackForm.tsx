"use client";

import { useActionState } from "react";
import { lookupTracking } from "./actions";
import { Field, Input, Button } from "@/components/ui/Form";
import { formatDate } from "@/lib/utils/format";
import { trackingStageOrder, trackingStageLabel } from "@/lib/utils/compute";

export function TrackForm() {
  const [state, formAction, pending] = useActionState(lookupTracking, { error: null });

  return (
    <div className="space-y-8">
      <form action={formAction} className="mx-auto max-w-md space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Field label="Load Number" required>
          <Input name="loadNumber" placeholder="FS-1001" required />
        </Field>
        <Field label="Delivery ZIP" required>
          <Input name="zip" placeholder="28202" required />
        </Field>
        {state.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Looking up…" : "Track Shipment"}
        </Button>
      </form>

      {state.data && (
        <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">{state.data.loadNumber}</h2>
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {state.data.stageLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {state.data.originCity}, {state.data.originState} → {state.data.destCity}, {state.data.destState}
          </p>

          <div className="mt-6 flex items-center justify-between">
            {trackingStageOrder.map((stage, idx) => {
              const currentIdx = trackingStageOrder.indexOf(state.data!.stage);
              const active = idx <= currentIdx;
              return (
                <div key={stage} className="flex flex-1 flex-col items-center">
                  <div
                    className={`h-3 w-3 rounded-full ${active ? "bg-emerald-500" : "bg-slate-200"}`}
                  />
                  <p className={`mt-2 text-center text-[11px] font-medium ${active ? "text-slate-900" : "text-slate-400"}`}>
                    {trackingStageLabel[stage]}
                  </p>
                </div>
              );
            })}
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Current Location</dt>
              <dd className="mt-0.5 text-slate-700">{state.data.currentLocation || "Not yet available"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">ETA</dt>
              <dd className="mt-0.5 text-slate-700">{state.data.eta ? formatDate(state.data.eta) : "TBD"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Equipment</dt>
              <dd className="mt-0.5 text-slate-700">{state.data.equipment || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Weight</dt>
              <dd className="mt-0.5 text-slate-700">{state.data.weight.toLocaleString()} lbs</dd>
            </div>
          </dl>

          {state.data.publicNote && (
            <div className="mt-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {state.data.publicNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
