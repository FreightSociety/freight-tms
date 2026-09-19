export type FmcsaLookupResult =
  | {
      ok: true;
      data: {
        legalName: string | null;
        authorityStatus: "ACTIVE" | "INACTIVE" | "REVOKED";
        safetyRating: "SATISFACTORY" | "CONDITIONAL" | "UNSATISFACTORY" | "NOT_RATED";
        mcNumber: string | null;
        dotNumber: string | null;
        raw: unknown;
      };
    }
  | { ok: false; error: string };

function isMcNumber(identifier: string): boolean {
  return /^mc-?\d+$/i.test(identifier.trim());
}

function digitsOnly(identifier: string): string {
  return identifier.replace(/\D/g, "");
}

function mapAuthorityStatus(carrierRecord: Record<string, unknown>): "ACTIVE" | "INACTIVE" | "REVOKED" {
  const allowed = carrierRecord.allowedToOperate;
  const common = String(carrierRecord.commonAuthorityStatus || "").toUpperCase();
  const contract = String(carrierRecord.contractAuthorityStatus || "").toUpperCase();
  const broker = String(carrierRecord.brokerAuthorityStatus || "").toUpperCase();

  if (String(allowed).toUpperCase() === "N") return "REVOKED";
  if ([common, contract, broker].some((s) => s.includes("REVOK"))) return "REVOKED";
  if ([common, contract, broker].some((s) => s === "A" || s.includes("ACTIVE"))) return "ACTIVE";
  return "INACTIVE";
}

function mapSafetyRating(
  carrierRecord: Record<string, unknown>
): "SATISFACTORY" | "CONDITIONAL" | "UNSATISFACTORY" | "NOT_RATED" {
  const rating = String(carrierRecord.safetyRating || "").toUpperCase();
  if (rating.startsWith("S")) return "SATISFACTORY";
  if (rating.startsWith("C")) return "CONDITIONAL";
  if (rating.startsWith("U")) return "UNSATISFACTORY";
  return "NOT_RATED";
}

/**
 * Look up a carrier by MC or DOT number against the FMCSA QCMobile API.
 * https://mobile.fmcsa.dot.gov/QCDevsite/docs/getWebKey
 */
export async function lookupFmcsa(identifier: string): Promise<FmcsaLookupResult> {
  const webKey = process.env.FMCSA_WEBKEY;
  if (!webKey) {
    return {
      ok: false,
      error: "FMCSA lookup unavailable — set FMCSA_WEBKEY in .env (see .env.example).",
    };
  }

  const clean = identifier.trim();
  if (!clean) return { ok: false, error: "No MC or DOT number provided." };

  const url = isMcNumber(clean)
    ? `https://mobile.fmcsa.dot.gov/qc/services/carriers/docket-number/${digitsOnly(clean)}?webKey=${webKey}`
    : `https://mobile.fmcsa.dot.gov/qc/services/carriers/${digitsOnly(clean)}?webKey=${webKey}`;

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return { ok: false, error: "FMCSA lookup failed — could not reach mobile.fmcsa.dot.gov." };
  }

  if (!res.ok) {
    return { ok: false, error: `FMCSA lookup failed — API returned status ${res.status}.` };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: "FMCSA lookup failed — could not parse the API response." };
  }

  const payload = json as { content?: unknown[] | Record<string, unknown> };
  const contentArr = Array.isArray(payload.content) ? payload.content : payload.content ? [payload.content] : [];
  const first = contentArr[0] as Record<string, unknown> | undefined;
  const carrierRecord = (first?.carrier as Record<string, unknown> | undefined) ?? first;

  if (!carrierRecord) {
    return { ok: false, error: "No carrier found for that MC/DOT number in the FMCSA database." };
  }

  return {
    ok: true,
    data: {
      legalName: (carrierRecord.legalName as string) || (carrierRecord.dbaName as string) || null,
      authorityStatus: mapAuthorityStatus(carrierRecord),
      safetyRating: mapSafetyRating(carrierRecord),
      mcNumber: carrierRecord.mcNumber ? `MC-${carrierRecord.mcNumber}` : null,
      dotNumber: carrierRecord.dotNumber ? `DOT-${carrierRecord.dotNumber}` : null,
      raw: json,
    },
  };
}
