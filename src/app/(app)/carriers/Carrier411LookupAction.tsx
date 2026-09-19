"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/Form";
import { runCarrier411Lookup } from "@/lib/actions/carriers";

export function Carrier411LookupAction({ carrierId }: { carrierId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function run() {
    setMessage(null);
    startTransition(async () => {
      const result = await runCarrier411Lookup(carrierId);
      if (result.error) {
        setIsError(true);
        setMessage(result.error);
      } else {
        setIsError(false);
        setMessage(
          `Updated from Carrier411: ${result.data?.legalName ?? "carrier"} — ${result.data?.authorityStatus} / ${result.data?.safetyRating}`
        );
      }
    });
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="secondary" onClick={run} disabled={pending}>
        {pending ? "Looking up…" : "Carrier411 Lookup & Refresh"}
      </Button>
      {message && (
        <p className={`text-xs ${isError ? "text-red-600" : "text-emerald-600"}`}>{message}</p>
      )}
    </div>
  );
}
