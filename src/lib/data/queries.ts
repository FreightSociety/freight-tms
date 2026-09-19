import { db } from "@/lib/db";
import {
  users,
  companies,
  carriers,
  loads,
  tracking,
  loadBoardPosts,
  quotes,
} from "@/lib/db/schema";
import { eq, desc, asc, sql as dsql } from "drizzle-orm";
import { grossProfit } from "@/lib/utils/compute";

export async function getAllLoads() {
  return db.query.loads.findMany({
    with: {
      customer: true,
      carrier: true,
      agent: true,
    },
    orderBy: [desc(loads.date)],
  });
}

export async function getLoadById(id: string) {
  return db.query.loads.findFirst({
    where: eq(loads.id, id),
    with: { customer: true, carrier: true, agent: true, tracking: true, loadBoardPost: true },
  });
}

export async function getLastLoad() {
  const rows = await db.select().from(loads).orderBy(desc(loads.createdAt)).limit(1);
  return rows[0] ?? null;
}

export async function getAllCompanies() {
  return db.select().from(companies).orderBy(asc(companies.name));
}

export async function getCompaniesByType(type: "CUSTOMER" | "CARRIER" | "LEAD") {
  return db.select().from(companies).where(eq(companies.type, type)).orderBy(asc(companies.name));
}

export async function getCompanyById(id: string) {
  const rows = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getCompanyLoadStats(companyId: string) {
  const allLoads = await db.query.loads.findMany({
    where: (l, { or, eq: eqq }) => or(eqq(l.customerId, companyId), eqq(l.carrierId, companyId)),
  });
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  for (const l of allLoads) {
    if (l.customerId === companyId) totalRevenue += l.customerRate;
    if (l.carrierId === companyId) totalCost += l.carrierCost;
    if (l.customerId === companyId) totalProfit += grossProfit(l);
  }
  return {
    totalLoads: allLoads.length,
    totalRevenue,
    totalCost,
    totalProfit,
    loads: allLoads,
  };
}

export async function getAllCarriers() {
  return db.query.carriers.findMany({
    with: { company: true },
    orderBy: [asc(carriers.createdAt)],
  });
}

export async function getCarrierById(id: string) {
  return db.query.carriers.findFirst({
    where: eq(carriers.id, id),
    with: { company: true },
  });
}

export async function getCarrierByCompanyId(companyId: string) {
  const rows = await db.select().from(carriers).where(eq(carriers.companyId, companyId)).limit(1);
  return rows[0] ?? null;
}

export async function getAllUsers() {
  return db.select().from(users).orderBy(asc(users.name));
}

export async function getUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAllQuotes() {
  return db.query.quotes.findMany({
    with: { quotedBy: true, bookedLoad: true },
    orderBy: [desc(quotes.receivedAt)],
  });
}

export async function getQuoteById(id: string) {
  return db.query.quotes.findFirst({ where: eq(quotes.id, id), with: { quotedBy: true } });
}

export async function getAllLoadBoardPosts() {
  return db.query.loadBoardPosts.findMany({
    with: { load: { with: { customer: true, carrier: true } } },
    orderBy: [desc(loadBoardPosts.createdAt)],
  });
}

export async function getPublicLoadBoard() {
  const posts = await db.query.loadBoardPosts.findMany({
    where: eq(loadBoardPosts.post, true),
    with: { load: true },
  });
  return posts.filter((p) => p.status === "OPEN" && p.load);
}

export async function getAllTracking() {
  return db.query.tracking.findMany({
    with: { load: { with: { customer: true } } },
    orderBy: [desc(tracking.createdAt)],
  });
}

export async function getTrackingByLoadId(loadId: string) {
  const rows = await db.select().from(tracking).where(eq(tracking.loadId, loadId)).limit(1);
  return rows[0] ?? null;
}

export async function findPublicTracking(loadNumber: string, zip: string) {
  const loadRow = await db.query.loads.findFirst({
    where: eq(loads.loadNumber, loadNumber.trim().toUpperCase()),
  });
  if (!loadRow) return null;

  const trackRow = await db.query.tracking.findFirst({
    where: eq(tracking.loadId, loadRow.id),
  });
  if (!trackRow) return null;
  if (trackRow.hide || !trackRow.ready) return null;
  if (trackRow.deliveryZip.trim() !== zip.trim()) return null;

  return { load: loadRow, tracking: trackRow };
}

export async function getNextLoadNumber() {
  const rows = await db
    .select({ loadNumber: loads.loadNumber })
    .from(loads)
    .orderBy(desc(dsql`CAST(substr(${loads.loadNumber}, 4) AS INTEGER)`))
    .limit(1);
  if (!rows[0]) return "FS-1001";
  const match = rows[0].loadNumber.match(/(\d+)$/);
  if (!match) return "FS-1001";
  return `FS-${parseInt(match[1], 10) + 1}`;
}
