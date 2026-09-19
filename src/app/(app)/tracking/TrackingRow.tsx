"use client";

import { useState, useTransition } from "react";
import {
  stampTrackingEvent,
  toggleTrackingFlag,
  updateTrackingDetails,
} from "@/lib/actions/tracking";
import { Button, Input, Textarea } from "@/components/ui/Form";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime, toInputDate } from "@/lib/utils/format";
import { trackingStage, trackingStageLabel } from "@/lib/utils/compute";
import type { TrackingRow as TrackingRowType, LoadRow, CompanyRow } from "@/lib/db/schema";

const stageColor: Record<string, "slate" | "blue" | "amber" | "purple" | "green"> = {
  PENDING: "slate",
  BOOKED: "blue",
  PICKED_UP: "amber",
  IN_TRANSIT: "purple",
  OUT_FOR_DELIVERY: "amber",
  DELIVERED: "green",
};

type FullTracking = TrackingRowType & { load: (LoadRow & { customer: CompanyRow | null }) | null };

export function TrackingRow({ t }: { t: FullTracking }) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const stage = trackingStage(t);

  if (!t.load) return null;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div className="flex flex-wrap items-center gap-4 px-5 py-3">
        <div className="w-24 font-medium text-slate-900">{t.load.loadNumber}</div>
        <div className="w-40 text-sm text-slate-600">{t.load.customer?.name ?? "—"}</div>
        <div className="w-56 text-sm text-slate-600">
          {t.load.originCity}, {t.load.originState} → {t.load.destCity}, {t.load.destState}
        </div>
        <Badge color={stageColor[stage]}>{trackingStageLabel[stage]}</Badge>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <FlagToggle label="Ready" value={t.ready} onChange={(v) => startTransition(() => toggleTrackingFlag(t.id, "ready", v))} />
          <FlagToggle label="Hide" value={t.hide} onChange={(v) => startTransition(() => toggleTrackingFlag(t.id, "hide", v))} />
          <FlagToggle label="Notify" value={t.notify} onChange={(v) => startTransition(() => toggleTrackingFlag(t.id, "notify", v))} />
          <FlagToggle label="POD" value={t.podOnFile} onChange={(v) => startTransition(() => toggleTrackingFlag(t.id, "podOnFile", v))} />
        </div>
        <Button type="button" variant="ghost" className="ml-auto" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Collapse" : "Manage"}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            <StampButton label="Mark Booked" done={!!t.bookedAt} disabled={pending} onClick={() => startTransition(() => stampTrackingEvent(t.id, "bookedAt"))} />
            <StampButton label="Mark Picked Up" done={!!t.pickedUpAt} disabled={pending} onClick={() => startTransition(() => stampTrackingEvent(t.id, "pickedUpAt"))} />
            <StampButton label="Mark In Transit" done={!!t.inTransitAt} disabled={pending} onClick={() => startTransition(() => stampTrackingEvent(t.id, "inTransitAt"))} />
            <StampButton label="Mark Out for Delivery" done={!!t.outForDeliveryAt} disabled={pending} onClick={() => startTransition(() => stampTrackingEvent(t.id, "outForDeliveryAt"))} />
            <StampButton label="Mark Delivered" done={!!t.deliveredAt} disabled={pending} onClick={() => startTransition(() => stampTrackingEvent(t.id, "deliveredAt"))} />
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-5">
            <span>Booked: {formatDateTime(t.bookedAt)}</span>
            <span>Picked Up: {formatDateTime(t.pickedUpAt)}</span>
            <span>In Transit: {formatDateTime(t.inTransitAt)}</span>
            <span>Out for Delivery: {formatDateTime(t.outForDeliveryAt)}</span>
            <span>Delivered: {formatDateTime(t.deliveredAt)}</span>
          </div>

          <form
            action={(formData) => startTransition(() => updateTrackingDetails(t.id, formData))}
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Delivery ZIP (auth)</span>
              <Input name="deliveryZip" defaultValue={t.deliveryZip} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Current Location</span>
              <Input name="currentLocation" defaultValue={t.currentLocation ?? ""} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">ETA</span>
              <Input type="date" name="eta" defaultValue={toInputDate(t.eta)} />
            </label>
            <label className="col-span-full block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Public Note (shown to customer)</span>
              <Textarea name="publicNote" rows={2} defaultValue={t.publicNote ?? ""} />
            </label>
            <div>
              <Button type="submit" disabled={pending}>
                Save
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FlagToggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-1">
      <input
        type="checkbox"
        defaultChecked={value}
        className="rounded border-slate-300"
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function StampButton({
  label,
  done,
  disabled,
  onClick,
}: {
  label: string;
  done: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" variant={done ? "secondary" : "primary"} disabled={disabled} onClick={onClick}>
      {done ? `✓ ${label}` : label}
    </Button>
  );
}
