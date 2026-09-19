"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Form";

export function Carrier411LookupButton({
  dotNumber,
  mcNumber,
  carrierId,
}: {
  dotNumber?: string | null;
  mcNumber?: string | null;
  carrierId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  async function run() {
    setLoading(true);
    setMessage(null);
    try {
      const identifier = dotNumber || mcNumber;
      if (!identifier) {
        setIsError(true);
        setMessage("No MC/DOT number on file.");
        setLoading(false);
        return;
      }
      const param = dotNumber ? `dot=${encodeURIComponent(dotNumber)}` : `mc=${encodeURIComponent(mcNumber || "")}`;
      const carrierParam = carrierId ? `&carrierId=${encodeURIComponent(carrierId)}` : "";
      const res = await fetch(`/api/carrier411/lookup?${param}${carrierParam}`);
      const json = await res.json();
      if (!json.ok) {
        setIsError(true);
        setMessage(json.error);
      } else {
        setIsError(false);
        setMessage(`Found: ${json.data.legalName ?? "Unnamed carrier"} — ${json.data.authorityStatus}`);
      }
    } catch {
      setIsError(true);
      setMessage("Network error — could not reach the Carrier411 lookup endpoint.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="secondary" onClick={run} disabled={loading}>
        {loading ? "Looking up…" : "Carrier411 Lookup"}
      </Button>
      {message && (
        <p className={`text-xs ${isError ? "text-red-600" : "text-emerald-600"}`}>{message}</p>
      )}
    </div>
  );
}
