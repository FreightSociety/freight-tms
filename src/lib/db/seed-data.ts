import type { db as DbClient } from "@/lib/db";
import { users, companies, carriers, loads, tracking } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import path from "path";

const XLSX_PATH =
  "/root/.claude/uploads/2b139a39-004f-5317-9af7-e11ad0cfb2d0/6312c384-Freight_Society_Command_Center.xlsx";

export const TEMP_PASSWORD = "Agent#2026!";
export const ADMIN_PASSWORD = "ChangeMe123!";
export const ADMIN_EMAIL = "admin@freightsociety.com";

type SeedData = {
  agents: { name: string; email: string; commissionRate: number }[];
  customer: {
    name: string;
    contactName: string;
    phone: string;
    email: string;
    city: string;
    state: string;
  };
  carrierCompany: {
    name: string;
    contactName: string;
    phone: string;
    email: string;
    city: string;
    state: string;
    mcNumber: string;
    dotNumber: string;
  };
  carrierDetail: {
    insuranceCompany: string;
    policyNumber: string;
    insuranceExpiry: string;
    equipmentTypes: string;
    safetyRating: string;
    preferred: boolean;
  };
  secondCarrier: {
    name: string;
    mcNumber: string;
    dotNumber: string;
    insuranceCompany: string;
    policyNumber: string;
    insuranceExpiry: string; // already-expired date
    equipmentTypes: string;
    safetyRating: string;
  };
  load: {
    loadNumber: string;
    date: string;
    originCity: string;
    originState: string;
    destCity: string;
    destState: string;
    destZip: string;
    loadedMiles: number;
    commodity: string;
    weight: number;
    customerRate: number;
    carrierCost: number;
    customerTerms: number;
    carrierTerms: number;
    invoiceDate: string;
    invoiceStatus: string;
    paymentStatus: string;
    notes: string;
    equipment: string;
  };
};

function excelDateToIso(serial: number): string {
  // Excel serial date (1900 date system) -> JS Date
  const utcDays = Math.floor(serial - 25569);
  const utcMs = utcDays * 86400 * 1000;
  return new Date(utcMs).toISOString();
}

const FALLBACK: SeedData = {
  agents: [
    { name: "J. Rivera", email: "j.rivera@freightsociety.com", commissionRate: 0.1 },
    { name: "K. Nguyen", email: "k.nguyen@freightsociety.com", commissionRate: 0.1 },
    { name: "D. Patel", email: "d.patel@freightsociety.com", commissionRate: 0.1 },
  ],
  customer: {
    name: "Acme Foods Inc",
    contactName: "Maria Chen",
    phone: "555-201-3344",
    email: "maria@acmefoods.com",
    city: "Atlanta",
    state: "GA",
  },
  carrierCompany: {
    name: "Blue Ridge Trucking LLC",
    contactName: "Tom Blake",
    phone: "555-887-2200",
    email: "dispatch@blueridge.com",
    city: "Charlotte",
    state: "NC",
    mcNumber: "MC-778812",
    dotNumber: "DOT-2214499",
  },
  carrierDetail: {
    insuranceCompany: "Progressive Commercial",
    policyNumber: "PC-55201-A",
    insuranceExpiry: excelDateToIso(46295),
    equipmentTypes: "Reefer, Dry Van",
    safetyRating: "SATISFACTORY",
    preferred: true,
  },
  secondCarrier: {
    name: "Route 9 Freight Co",
    mcNumber: "MC-441290",
    dotNumber: "DOT-1980212",
    insuranceCompany: "Sentry Insurance",
    policyNumber: "SI-90031",
    insuranceExpiry: excelDateToIso(46068),
    equipmentTypes: "Flatbed",
    safetyRating: "SATISFACTORY",
  },
  load: {
    loadNumber: "FS-1001",
    date: excelDateToIso(46028),
    originCity: "Atlanta",
    originState: "GA",
    destCity: "Charlotte",
    destState: "NC",
    destZip: "28202",
    loadedMiles: 245,
    commodity: "Produce",
    weight: 38000,
    customerRate: 1350,
    carrierCost: 1050,
    customerTerms: 30,
    carrierTerms: 15,
    invoiceDate: excelDateToIso(46030),
    invoiceStatus: "INVOICED",
    paymentStatus: "PENDING",
    notes: "Reefer load, on-time delivery",
    equipment: "Reefer",
  },
};

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

async function loadFromXlsx(): Promise<SeedData | null> {
  try {
    // xlsx is only available in the local/CLI environment where the source
    // workbook lives; a dynamic import keeps it (and its Node-only file
    // access) out of the serverless bootstrap route's cold-start path when
    // the file simply isn't there, which is the expected/normal case in
    // production.
    const xlsx = await import("xlsx");
    const wb = xlsx.readFile(path.resolve(XLSX_PATH));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sheetToRows = (name: string): any[][] =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      xlsx.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "" }) as any[][];

    const brokering = sheetToRows("BROKERING");
    const crm = sheetToRows("CRM");
    const carriersSheet = sheetToRows("CARRIERS");
    const agentSheet = sheetToRows("AGENT PERFORMANCE");

    const loadRow = brokering[4];
    const customerRow = crm[4];
    const carrierCrmRow = crm[5];
    const carrierComplianceRow = carriersSheet[4];
    const secondCarrierRow = carriersSheet[5];
    const agentRows = agentSheet.slice(6, 9);

    if (!loadRow || !loadRow[0]) return null; // no real data, fall back

    const agents = agentRows
      .filter((r: unknown[]) => r[0])
      .map((r: unknown[]) => {
        const name = String(r[0]);
        const slug = name
          .toLowerCase()
          .replace(/[^a-z\s]/g, "")
          .trim()
          .split(/\s+/)
          .join(".");
        return {
          name,
          email: `${slug}@freightsociety.com`,
          commissionRate: Number(r[1]) || 0.1,
        };
      });

    return {
      agents: agents.length ? agents : FALLBACK.agents,
      customer: {
        name: String(customerRow[1] || FALLBACK.customer.name),
        contactName: String(customerRow[3] || FALLBACK.customer.contactName),
        phone: String(customerRow[4] || FALLBACK.customer.phone),
        email: String(customerRow[5] || FALLBACK.customer.email),
        city: String(customerRow[6] || FALLBACK.customer.city),
        state: String(customerRow[7] || FALLBACK.customer.state),
      },
      carrierCompany: {
        name: String(carrierCrmRow[1] || FALLBACK.carrierCompany.name),
        contactName: String(carrierCrmRow[3] || FALLBACK.carrierCompany.contactName),
        phone: String(carrierCrmRow[4] || FALLBACK.carrierCompany.phone),
        email: String(carrierCrmRow[5] || FALLBACK.carrierCompany.email),
        city: String(carrierCrmRow[6] || FALLBACK.carrierCompany.city),
        state: String(carrierCrmRow[7] || FALLBACK.carrierCompany.state),
        mcNumber: String(carrierComplianceRow[1] || FALLBACK.carrierCompany.mcNumber),
        dotNumber: String(carrierComplianceRow[2] || FALLBACK.carrierCompany.dotNumber),
      },
      carrierDetail: {
        insuranceCompany: String(
          carrierComplianceRow[3] || FALLBACK.carrierDetail.insuranceCompany
        ),
        policyNumber: String(carrierComplianceRow[4] || FALLBACK.carrierDetail.policyNumber),
        insuranceExpiry:
          typeof carrierComplianceRow[5] === "number"
            ? excelDateToIso(carrierComplianceRow[5])
            : FALLBACK.carrierDetail.insuranceExpiry,
        equipmentTypes: String(
          carrierComplianceRow[9] || FALLBACK.carrierDetail.equipmentTypes
        ),
        safetyRating: "SATISFACTORY",
        preferred: true,
      },
      secondCarrier: secondCarrierRow && secondCarrierRow[0]
        ? {
            name: String(secondCarrierRow[0]),
            mcNumber: String(secondCarrierRow[1]),
            dotNumber: String(secondCarrierRow[2]),
            insuranceCompany: String(secondCarrierRow[3]),
            policyNumber: String(secondCarrierRow[4]),
            insuranceExpiry:
              typeof secondCarrierRow[5] === "number"
                ? excelDateToIso(secondCarrierRow[5])
                : FALLBACK.secondCarrier.insuranceExpiry,
            equipmentTypes: String(secondCarrierRow[9]),
            safetyRating: "SATISFACTORY",
          }
        : FALLBACK.secondCarrier,
      load: {
        loadNumber: String(loadRow[0] || FALLBACK.load.loadNumber),
        date: typeof loadRow[1] === "number" ? excelDateToIso(loadRow[1]) : FALLBACK.load.date,
        originCity: String(loadRow[5] || "Atlanta, GA").split(",")[0].trim(),
        originState: String(loadRow[5] || "Atlanta, GA").split(",")[1]?.trim() || "GA",
        destCity: String(loadRow[6] || "Charlotte, NC").split(",")[0].trim(),
        destState: String(loadRow[6] || "Charlotte, NC").split(",")[1]?.trim() || "NC",
        destZip: String(loadRow[21] || FALLBACK.load.destZip),
        loadedMiles: Number(loadRow[7]) || FALLBACK.load.loadedMiles,
        commodity: String(loadRow[8] || FALLBACK.load.commodity),
        weight: Number(loadRow[9]) || FALLBACK.load.weight,
        customerRate: Number(loadRow[10]) || FALLBACK.load.customerRate,
        carrierCost: Number(loadRow[11]) || FALLBACK.load.carrierCost,
        customerTerms: Number(loadRow[15]) || FALLBACK.load.customerTerms,
        carrierTerms: Number(loadRow[16]) || FALLBACK.load.carrierTerms,
        invoiceDate:
          typeof loadRow[17] === "number" ? excelDateToIso(loadRow[17]) : FALLBACK.load.invoiceDate,
        invoiceStatus: String(loadRow[18] || "Invoiced").toUpperCase().replace(" ", "_"),
        paymentStatus: String(loadRow[19] || "Pending").toUpperCase(),
        notes: String(loadRow[20] || FALLBACK.load.notes),
        equipment: String(loadRow[22] || FALLBACK.load.equipment),
      },
    };
  } catch (err) {
    console.warn("Could not read xlsx workbook, using hardcoded fallback seed data.", err);
    return null;
  }
}

export type SeedResult =
  | { status: "already_seeded" }
  | {
      status: "seeded";
      credentials: {
        admin: { email: string; password: string };
        agents: { email: string; password: string }[];
      };
    };

/**
 * Idempotent seed: if the admin user already exists, this is a no-op and
 * returns `{ status: "already_seeded" }` rather than erroring or duplicating
 * rows. Used by both the local `db:seed` CLI script and the production
 * bootstrap API route.
 */
export async function seedDatabase(db: typeof DbClient): Promise<SeedResult> {
  const existingAdmin = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
  if (existingAdmin[0]) {
    return { status: "already_seeded" };
  }

  const data = (await loadFromXlsx()) ?? FALLBACK;

  // --- Users ---
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const agentHash = await bcrypt.hash(TEMP_PASSWORD, 10);

  const adminId = id("usr");
  await db.insert(users).values({
    id: adminId,
    name: "Admin",
    email: ADMIN_EMAIL,
    passwordHash: adminHash,
    role: "ADMIN",
    commissionRate: 0,
    active: true,
  });

  const agentIds: Record<string, string> = {};
  for (const agent of data.agents) {
    const uid = id("usr");
    agentIds[agent.name] = uid;
    await db.insert(users).values({
      id: uid,
      name: agent.name,
      email: agent.email,
      passwordHash: agentHash,
      role: "BROKER",
      commissionRate: agent.commissionRate,
      active: true,
    });
  }
  const firstAgentId = Object.values(agentIds)[0] ?? adminId;

  // --- Companies ---
  const customerId = id("cmp");
  await db.insert(companies).values({
    id: customerId,
    name: data.customer.name,
    type: "CUSTOMER",
    contactName: data.customer.contactName,
    phone: data.customer.phone,
    email: data.customer.email,
    city: data.customer.city,
    state: data.customer.state,
    status: "ACTIVE",
    leadSource: "Referral",
    notes: "Weekly reefer freight, net-30",
  });

  const carrierCompanyId = id("cmp");
  await db.insert(companies).values({
    id: carrierCompanyId,
    name: data.carrierCompany.name,
    type: "CARRIER",
    contactName: data.carrierCompany.contactName,
    phone: data.carrierCompany.phone,
    email: data.carrierCompany.email,
    city: data.carrierCompany.city,
    state: data.carrierCompany.state,
    mcNumber: data.carrierCompany.mcNumber,
    dotNumber: data.carrierCompany.dotNumber,
    status: "ACTIVE",
    leadSource: "Cold call",
    notes: "Reliable, prefers reefer/dry van",
  });

  await db.insert(carriers).values({
    id: id("car"),
    companyId: carrierCompanyId,
    mcNumber: data.carrierCompany.mcNumber,
    dotNumber: data.carrierCompany.dotNumber,
    insuranceCompany: data.carrierDetail.insuranceCompany,
    policyNumber: data.carrierDetail.policyNumber,
    insuranceExpiry: data.carrierDetail.insuranceExpiry,
    authorityStatus: "ACTIVE",
    equipmentTypes: data.carrierDetail.equipmentTypes,
    safetyRating: data.carrierDetail.safetyRating as never,
    preferred: true,
    watchlist: false,
    notes: "Preferred reefer carrier",
  });

  // Second carrier (expired insurance) for variety
  const secondCarrierCompanyId = id("cmp");
  await db.insert(companies).values({
    id: secondCarrierCompanyId,
    name: data.secondCarrier.name,
    type: "CARRIER",
    mcNumber: data.secondCarrier.mcNumber,
    dotNumber: data.secondCarrier.dotNumber,
    status: "ACTIVE",
    notes: "",
  });
  await db.insert(carriers).values({
    id: id("car"),
    companyId: secondCarrierCompanyId,
    mcNumber: data.secondCarrier.mcNumber,
    dotNumber: data.secondCarrier.dotNumber,
    insuranceCompany: data.secondCarrier.insuranceCompany,
    policyNumber: data.secondCarrier.policyNumber,
    insuranceExpiry: data.secondCarrier.insuranceExpiry,
    authorityStatus: "ACTIVE",
    equipmentTypes: data.secondCarrier.equipmentTypes,
    safetyRating: data.secondCarrier.safetyRating as never,
    preferred: false,
    watchlist: false,
    notes: "",
  });

  // A prospect/lead company for the CRM demo
  await db.insert(companies).values({
    id: id("cmp"),
    name: "Prairie Distribution",
    type: "LEAD",
    contactName: "Sam Osei",
    phone: "555-410-9090",
    email: "sam@prairiedist.com",
    city: "Columbus",
    state: "OH",
    status: "PROSPECT",
    leadSource: "Trade show",
    notes: "Following up next week",
  });

  // --- Load ---
  const loadId = id("ld");
  await db.insert(loads).values({
    id: loadId,
    loadNumber: data.load.loadNumber,
    date: data.load.date,
    customerId,
    carrierId: carrierCompanyId,
    agentId: firstAgentId,
    originCity: data.load.originCity,
    originState: data.load.originState,
    destCity: data.load.destCity,
    destState: data.load.destState,
    destZip: data.load.destZip,
    loadedMiles: data.load.loadedMiles,
    commodity: data.load.commodity,
    weight: data.load.weight,
    customerRate: data.load.customerRate,
    carrierCost: data.load.carrierCost,
    customerTerms: data.load.customerTerms,
    carrierTerms: data.load.carrierTerms,
    invoiceDate: data.load.invoiceDate,
    invoiceStatus: (["NOT_INVOICED", "INVOICED", "PAID"].includes(data.load.invoiceStatus)
      ? data.load.invoiceStatus
      : "INVOICED") as never,
    paymentStatus: (["PENDING", "PAID", "OVERDUE"].includes(data.load.paymentStatus)
      ? data.load.paymentStatus
      : "PENDING") as never,
    equipment: data.load.equipment,
    notes: data.load.notes,
  });

  // Update lastLoadDate manually for customer & carrier
  await db.update(companies).set({ lastLoadDate: data.load.date }).where(eq(companies.id, customerId));
  await db.update(companies).set({ lastLoadDate: data.load.date }).where(eq(companies.id, carrierCompanyId));

  // --- Tracking entry for the example load ---
  await db.insert(tracking).values({
    id: id("trk"),
    loadId,
    deliveryZip: data.load.destZip,
    bookedAt: data.load.date,
    pickedUpAt: data.load.date,
    inTransitAt: data.load.date,
    outForDeliveryAt: data.load.date,
    deliveredAt: data.load.date,
    currentLocation: `${data.load.destCity}, ${data.load.destState}`,
    eta: data.load.date,
    publicNote: "Delivered on schedule. Thank you for shipping with Freight Society.",
    hide: false,
    notify: false,
    ready: true,
    podOnFile: true,
  });

  return {
    status: "seeded",
    credentials: {
      admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      agents: data.agents.map((a) => ({ email: a.email, password: TEMP_PASSWORD })),
    },
  };
}
