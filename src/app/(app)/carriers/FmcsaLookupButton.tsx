"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Form";

export function FmcsaLookupButton({
  dotNumber,
  mcNumber,
}: {
  dotNumber?: string | null;
  mcNumber?: string | null;
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
      const res = await fetch(`/api/fmcsa/lookup?${param}`);
      const json = await res.json();
      if (!json.ok) {
        setIsError(true);
        setMessage(json.error);
      } else {
        setIsError(false);
        setMessage(`Found: ${json.data.legalName ?? "Unnamed carrier"} — ${json.data.authorityStatus}`);
        // Full refresh so the server-computed table reflects any DB update from
        // a matching write endpoint. This lookup endpoint is read-only, so we
        // just surface results here; use the carrier edit form's own button
        // for the write-and-refresh flow.
      }
    } catch {
      setIsError(true);
      setMessage("Network error — could not reach the FMCSA lookup endpoint.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="secondary" onClick={run} disabled={loading}>
        {loading ? "Looking up…" : "FMCSA Lookup"}
      </Button>
      {message && (
        <p className={`text-xs ${isError ? "text-red-600" : "text-emerald-600"}`}>{message}</p>
      )}
    </div>
  );
}
