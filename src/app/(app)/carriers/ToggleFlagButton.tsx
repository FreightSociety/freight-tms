"use client";

import { useTransition } from "react";
import { toggleCarrierFlag } from "@/lib/actions/carriers";

export function ToggleFlagButton({
  carrierId,
  flag,
  value,
  label,
}: {
  carrierId: string;
  flag: "preferred" | "watchlist";
  value: boolean;
  label: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-1.5 text-xs text-slate-600">
      <input
        type="checkbox"
        defaultChecked={value}
        disabled={pending}
        className="rounded border-slate-300"
        onChange={(e) => {
          const checked = e.target.checked;
          startTransition(() => {
            toggleCarrierFlag(carrierId, flag, checked);
          });
        }}
      />
      {label}
    </label>
  );
}
