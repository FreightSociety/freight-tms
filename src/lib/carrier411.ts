import { XMLParser } from "fast-xml-parser";

/**
 * Carrier411 "Web Services" integration.
 *
 * Carrier411's web services are SOAP-based (see
 * https://www.carrier411.com/webservices.cfm) and are a paid add-on separate
 * from a normal Carrier411 subscription — the account owner has to ask
 * Carrier411 to turn on "Web Services" (an extra ~$99/month) before any of
 * this will work. Auth is a `wsLogin(username, password)` call that returns a
 * session id; sessions are IP-restricted to whatever IP made the wsLogin call
 * and expire at midnight EST regardless of activity, so we log in fresh for
 * every request rather than trying to cache a session across server
 * invocations (serverless instances don't have a stable IP anyway, and a
 * stale/foreign-IP session would just fault on the next call).
 *
 * There's no official SOAP client dependency here (node-soap pulls in a lot
 * of machinery for three calls, and this environment can't always reach
 * arbitrary registries for native/large deps) — instead we hand-build the
 * minimal SOAP 1.1 envelope with `fetch` and parse the response with
 * fast-xml-parser, which is pure JS and installs anywhere npm does.
 */

const CARRIER411_ENDPOINT = "https://www.carrier411.com/webservices/carrier411ws.asmx";
const CARRIER411_NAMESPACE = "http://www.carrier411.com/webservices/";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
});

function soapEnvelope(bodyXml: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    ${bodyXml}
  </soap:Body>
</soap:Envelope>`;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function soapCall(
  action: string,
  paramsXml: string
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; error: string }> {
  const username = process.env.CARRIER411_USERNAME;
  const password = process.env.CARRIER411_PASSWORD;

  if (!username || !password) {
    return {
      ok: false,
      error:
        "Carrier411 lookup unavailable — set CARRIER411_USERNAME/PASSWORD, and confirm Web Services is enabled on your account.",
    };
  }

  const envelope = soapEnvelope(
    `<${action} xmlns="${CARRIER411_NAMESPACE}">${paramsXml}</${action}>`
  );

  let res: Response;
  try {
    res = await fetch(CARRIER411_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: `"${CARRIER411_NAMESPACE}${action}"`,
      },
      body: envelope,
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      error: "Carrier411 lookup failed — could not reach carrier411.com.",
    };
  }

  const text = await res.text();
  let parsed: Record<string, unknown>;
  try {
    parsed = xmlParser.parse(text);
  } catch {
    return { ok: false, error: "Carrier411 lookup failed — could not parse the SOAP response." };
  }

  const envelopeBody = (parsed?.Envelope as Record<string, unknown> | undefined)?.Body as
    | Record<string, unknown>
    | undefined;

  const fault = envelopeBody?.Fault as Record<string, unknown> | undefined;
  if (fault) {
    const faultCode = String(fault.faultcode ?? fault.Faultcode ?? "");
    const faultString = String(fault.faultstring ?? fault.Faultstring ?? "Unknown SOAP fault");
    const ipOrSession =
      /ip/i.test(faultString) || /session/i.test(faultString)
        ? " (this often means the session expired at midnight EST, or the request came from an IP not authorized for this Carrier411 account)."
        : "";
    return {
      ok: false,
      error: `Carrier411 lookup failed — ${faultCode}: ${faultString}${ipOrSession}`,
    };
  }

  if (!res.ok) {
    return { ok: false, error: `Carrier411 lookup failed — HTTP ${res.status}.` };
  }

  const responseKey = Object.keys(envelopeBody ?? {}).find((k) => k.endsWith("Response"));
  const responseBody = responseKey ? (envelopeBody?.[responseKey] as Record<string, unknown>) : envelopeBody;

  return { ok: true, body: responseBody ?? {} };
}

async function login(): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const username = process.env.CARRIER411_USERNAME!;
  const password = process.env.CARRIER411_PASSWORD!;

  const result = await soapCall(
    "wsLogin",
    `<username>${escapeXml(username)}</username><password>${escapeXml(password)}</password>`
  );
  if (!result.ok) return result;

  const resultKey = Object.keys(result.body).find((k) => k.toLowerCase().endsWith("result"));
  const sessionId = resultKey ? String(result.body[resultKey]) : "";

  if (!sessionId) {
    return { ok: false, error: "Carrier411 lookup failed — wsLogin did not return a session id." };
  }
  return { ok: true, sessionId };
}

export type Carrier411Data = {
  legalName: string | null;
  authorityStatus: "ACTIVE" | "INACTIVE" | "REVOKED";
  safetyRating: "SATISFACTORY" | "CONDITIONAL" | "UNSATISFACTORY" | "NOT_RATED";
  mcNumber: string | null;
  dotNumber: string | null;
  insuranceSummary: string | null;
  smsScores: Record<string, string | number>;
  raw: unknown;
};

function mapAuthority(record: Record<string, unknown>): "ACTIVE" | "INACTIVE" | "REVOKED" {
  const status = String(record.AuthorityStatus ?? record.authorityStatus ?? "").toUpperCase();
  if (status.includes("REVOK")) return "REVOKED";
  if (status.includes("ACTIVE") || status === "A") return "ACTIVE";
  return "INACTIVE";
}

function mapSafety(
  record: Record<string, unknown>
): "SATISFACTORY" | "CONDITIONAL" | "UNSATISFACTORY" | "NOT_RATED" {
  const rating = String(record.SafetyRating ?? record.safetyRating ?? "").toUpperCase();
  if (rating.startsWith("S")) return "SATISFACTORY";
  if (rating.startsWith("C")) return "CONDITIONAL";
  if (rating.startsWith("U")) return "UNSATISFACTORY";
  return "NOT_RATED";
}

/**
 * Look up a carrier's full profile via wsGetCompany, by MC or DOT number.
 */
export async function lookupCarrier411(
  identifier: string
): Promise<{ ok: true; data: Carrier411Data } | { ok: false; error: string }> {
  const clean = identifier.replace(/\D/g, "");
  if (!clean) return { ok: false, error: "No MC or DOT number provided." };

  const session = await login();
  if (!session.ok) return session;

  const companyResult = await soapCall(
    "wsGetCompany",
    `<sessionID>${escapeXml(session.sessionId)}</sessionID><docketOrDOT>${escapeXml(clean)}</docketOrDOT>`
  );
  if (!companyResult.ok) return companyResult;

  const resultKey = Object.keys(companyResult.body).find((k) => k.toLowerCase().endsWith("result"));
  const record = (resultKey ? companyResult.body[resultKey] : companyResult.body) as
    | Record<string, unknown>
    | undefined;

  if (!record) {
    return { ok: false, error: "No carrier found in Carrier411 for that MC/DOT number." };
  }

  // wsGetAllSMS gives BASIC scores; best-effort, since not every account tier
  // or carrier has SMS data available.
  let smsScores: Record<string, string | number> = {};
  const smsResult = await soapCall(
    "wsGetAllSMS",
    `<sessionID>${escapeXml(session.sessionId)}</sessionID><docketOrDOT>${escapeXml(clean)}</docketOrDOT>`
  );
  if (smsResult.ok) {
    const smsKey = Object.keys(smsResult.body).find((k) => k.toLowerCase().endsWith("result"));
    const smsRecord = (smsKey ? smsResult.body[smsKey] : smsResult.body) as
      | Record<string, unknown>
      | undefined;
    if (smsRecord) {
      smsScores = Object.fromEntries(
        Object.entries(smsRecord).filter(([k]) => /basic|score/i.test(k)) as [string, string | number][]
      );
    }
  }

  return {
    ok: true,
    data: {
      legalName: (record.LegalName as string) || (record.DBAName as string) || null,
      authorityStatus: mapAuthority(record),
      safetyRating: mapSafety(record),
      mcNumber: record.DocketNumber ? `MC-${record.DocketNumber}` : null,
      dotNumber: record.DOTNumber ? `DOT-${record.DOTNumber}` : null,
      insuranceSummary:
        (record.BIPDInsuranceOnFile as string) || (record.CargoInsuranceOnFile as string) || null,
      smsScores,
      raw: { company: record, sms: smsScores },
    },
  };
}
