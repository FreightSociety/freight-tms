"use client";

import { useState, useTransition } from "react";
import { updateQuoteStatus, setQuotedRate, bookQuote } from "@/lib/actions/quotes";
import { Button, Select, Input } from "@/components/ui/Form";
import { Badge } from "@/components/ui/Badge";
import { Td, Tr } from "@/components/ui/Table";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { quoteAgeDays, isStaleQuote } from "@/lib/utils/compute";
import type { QuoteRow as QuoteRowType } from "@/lib/db/schema";

const statusColor: Record<string, "blue" | "amber" | "green" | "red" | "slate"> = {
  NEW: "blue",
  QUOTED: "amber",
  BOOKED: "green",
  LOST: "red",
  EXPIRED: "slate",
};

export function QuoteRow({ quote, canWrite }: { quote: QuoteRowType; canWrite: boolean }) {
  const [pending, startTransition] = useTransition();
  const [rate, setRate] = useState(quote.quotedRate ?? "");
  const age = quoteAgeDays(quote.receivedAt);
  const stale = isStaleQuote(quote.status, quote.receivedAt);

  return (
    <Tr>
      <Td>{formatDate(quote.receivedAt)}</Td>
      <Td>
        <span className={stale ? "font-semibold text-red-600" : ""}>{age}d</span>
        {stale && <Badge color="red">Stale</Badge>}
      </Td>
      <Td className="font-medium text-slate-900">{quote.name}</Td>
      <Td>{quote.company || "—"}</Td>
      <Td>
        {quote.pickupLocation} → {quote.deliveryLocation}
      </Td>
      <Td>{quote.equipment || "—"}</Td>
      <Td>
        {canWrite ? (
          <Select
            defaultValue={quote.status}
            disabled={pending}
            onChange={(e) => startTransition(() => updateQuoteStatus(quote.id, e.target.value))}
            className="min-w-[110px]"
          >
            <option value="NEW">New</option>
            <option value="QUOTED">Quoted</option>
            <option value="BOOKED">Booked</option>
            <option value="LOST">Lost</option>
            <option value="EXPIRED">Expired</option>
          </Select>
        ) : (
          <Badge color={statusColor[quote.status]}>{quote.status}</Badge>
        )}
      </Td>
      <Td>
        {canWrite ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              step="0.01"
              className="w-24"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              disabled={pending || quote.status === "BOOKED"}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={pending || quote.status === "BOOKED" || !rate}
              onClick={() => startTransition(() => setQuotedRate(quote.id, Number(rate)))}
            >
              Set
            </Button>
          </div>
        ) : (
          formatCurrency(quote.quotedRate)
        )}
      </Td>
      <Td>
        {canWrite && quote.status !== "BOOKED" && quote.quotedRate ? (
          <Button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => bookQuote(quote.id))}
          >
            Book Load
          </Button>
        ) : quote.status === "BOOKED" ? (
          <Badge color="green">Booked</Badge>
        ) : (
          <span className="text-xs text-slate-400">Set a rate first</span>
        )}
      </Td>
    </Tr>
  );
}
