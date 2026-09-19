import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  doublePrecision,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// NOTE ON DATA LAYER
// ---------------------------------------------------------------------------
// This project uses Drizzle ORM instead of Prisma. Prisma's migration/query
// engine binaries are fetched at install time from binaries.prisma.sh, which
// was not reachable from the original build environment (network egress
// policy). Drizzle is a pure TypeScript ORM with no native engine download,
// so it builds reliably in locked-down environments while still giving a
// typed schema and a real relational database.
//
// The database itself is Postgres (Neon), accessed over the Neon serverless
// HTTP driver (`@neondatabase/serverless` + `drizzle-orm/neon-http`) — plain
// HTTPS, no persistent TCP connection, which is the standard pairing for
// Vercel + Neon and works well from serverless functions with a fresh,
// ephemeral filesystem per invocation. All date/time columns use
// `{ mode: "string" }` so they round-trip as ISO strings exactly like the
// original SQLite build did, which kept every call site elsewhere in the app
// (`new Date(field)`, `field.toISOString()`) unchanged during the port.
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", ["ADMIN", "BROKER", "VIEWER"]);
export const companyTypeEnum = pgEnum("company_type", ["CUSTOMER", "CARRIER", "LEAD"]);
export const companyStatusEnum = pgEnum("company_status", ["ACTIVE", "INACTIVE", "PROSPECT"]);
export const authorityStatusEnum = pgEnum("authority_status", ["ACTIVE", "INACTIVE", "REVOKED"]);
export const safetyRatingEnum = pgEnum("safety_rating", [
  "SATISFACTORY",
  "CONDITIONAL",
  "UNSATISFACTORY",
  "NOT_RATED",
]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["NOT_INVOICED", "INVOICED", "PAID"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "PAID", "OVERDUE"]);
export const loadBoardStatusEnum = pgEnum("load_board_status", ["OPEN", "COVERED"]);
export const quoteStatusEnum = pgEnum("quote_status", ["NEW", "QUOTED", "BOOKED", "LOST", "EXPIRED"]);

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("BROKER"),
  commissionRate: doublePrecision("commission_rate").notNull().default(0.1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const companies = pgTable("companies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: companyTypeEnum("type").notNull(),
  contactName: text("contact_name"),
  phone: text("phone"),
  email: text("email"),
  city: text("city"),
  state: text("state"),
  mcNumber: text("mc_number"),
  dotNumber: text("dot_number"),
  status: companyStatusEnum("status").notNull().default("ACTIVE"),
  leadSource: text("lead_source"),
  dateAdded: timestamp("date_added", { mode: "string" }).notNull().defaultNow(),
  lastLoadDate: timestamp("last_load_date", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const carriers = pgTable("carriers", {
  id: text("id").primaryKey(),
  companyId: text("company_id")
    .notNull()
    .unique()
    .references(() => companies.id, { onDelete: "cascade" }),
  mcNumber: text("mc_number"),
  dotNumber: text("dot_number"),
  insuranceCompany: text("insurance_company"),
  policyNumber: text("policy_number"),
  insuranceExpiry: timestamp("insurance_expiry", { mode: "string" }),
  authorityStatus: authorityStatusEnum("authority_status").notNull().default("ACTIVE"),
  equipmentTypes: text("equipment_types"),
  safetyRating: safetyRatingEnum("safety_rating").notNull().default("NOT_RATED"),
  preferred: boolean("preferred").notNull().default(false),
  watchlist: boolean("watchlist").notNull().default(false),
  notes: text("notes"),
  fmcsaLastChecked: timestamp("fmcsa_last_checked", { mode: "string" }),
  fmcsaRaw: text("fmcsa_raw"),
  carrier411LastChecked: timestamp("carrier411_last_checked", { mode: "string" }),
  carrier411Raw: text("carrier411_raw"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const loads = pgTable("loads", {
  id: text("id").primaryKey(),
  loadNumber: text("load_number").notNull().unique(),
  date: timestamp("date", { mode: "string" }).notNull().defaultNow(),
  customerId: text("customer_id")
    .notNull()
    .references(() => companies.id),
  carrierId: text("carrier_id").references(() => companies.id),
  agentId: text("agent_id")
    .notNull()
    .references(() => users.id),
  originCity: text("origin_city").notNull(),
  originState: text("origin_state").notNull(),
  destCity: text("dest_city").notNull(),
  destState: text("dest_state").notNull(),
  destZip: text("dest_zip"),
  loadedMiles: doublePrecision("loaded_miles").notNull().default(0),
  commodity: text("commodity"),
  weight: doublePrecision("weight").notNull().default(0),
  customerRate: doublePrecision("customer_rate").notNull().default(0),
  carrierCost: doublePrecision("carrier_cost").notNull().default(0),
  customerTerms: integer("customer_terms").notNull().default(30),
  carrierTerms: integer("carrier_terms").notNull().default(30),
  invoiceDate: timestamp("invoice_date", { mode: "string" }),
  invoiceStatus: invoiceStatusEnum("invoice_status").notNull().default("NOT_INVOICED"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("PENDING"),
  equipment: text("equipment"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const tracking = pgTable("tracking", {
  id: text("id").primaryKey(),
  loadId: text("load_id")
    .notNull()
    .unique()
    .references(() => loads.id, { onDelete: "cascade" }),
  deliveryZip: text("delivery_zip").notNull(),
  bookedAt: timestamp("booked_at", { mode: "string" }),
  pickedUpAt: timestamp("picked_up_at", { mode: "string" }),
  inTransitAt: timestamp("in_transit_at", { mode: "string" }),
  outForDeliveryAt: timestamp("out_for_delivery_at", { mode: "string" }),
  deliveredAt: timestamp("delivered_at", { mode: "string" }),
  currentLocation: text("current_location"),
  eta: timestamp("eta", { mode: "string" }),
  publicNote: text("public_note"),
  hide: boolean("hide").notNull().default(false),
  notify: boolean("notify").notNull().default(false),
  lastNotified: timestamp("last_notified", { mode: "string" }),
  ready: boolean("ready").notNull().default(false),
  podOnFile: boolean("pod_on_file").notNull().default(false),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const loadBoardPosts = pgTable("load_board_posts", {
  id: text("id").primaryKey(),
  loadId: text("load_id")
    .notNull()
    .unique()
    .references(() => loads.id, { onDelete: "cascade" }),
  post: boolean("post").notNull().default(false),
  pickupDate: timestamp("pickup_date", { mode: "string" }),
  postedRate: doublePrecision("posted_rate"),
  status: loadBoardStatusEnum("status").notNull().default("OPEN"),
  postedAt: timestamp("posted_at", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  receivedAt: timestamp("received_at", { mode: "string" }).notNull().defaultNow(),
  status: quoteStatusEnum("status").notNull().default("NEW"),
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  phone: text("phone"),
  pickupLocation: text("pickup_location").notNull(),
  deliveryLocation: text("delivery_location").notNull(),
  pickupDate: timestamp("pickup_date", { mode: "string" }),
  weight: doublePrecision("weight"),
  commodity: text("commodity"),
  equipment: text("equipment"),
  contactPrefs: text("contact_prefs"),
  notes: text("notes"),
  quotedRate: doublePrecision("quoted_rate"),
  quotedById: text("quoted_by_id").references(() => users.id),
  bookedLoadId: text("booked_load_id").unique().references(() => loads.id),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  loadsAsAgent: many(loads),
  quotesQuoted: many(quotes),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  carrier: one(carriers, {
    fields: [companies.id],
    references: [carriers.companyId],
  }),
  loadsAsCustomer: many(loads, { relationName: "customerLoads" }),
  loadsAsCarrier: many(loads, { relationName: "carrierLoads" }),
}));

export const carriersRelations = relations(carriers, ({ one }) => ({
  company: one(companies, {
    fields: [carriers.companyId],
    references: [companies.id],
  }),
}));

export const loadsRelations = relations(loads, ({ one }) => ({
  customer: one(companies, {
    fields: [loads.customerId],
    references: [companies.id],
    relationName: "customerLoads",
  }),
  carrier: one(companies, {
    fields: [loads.carrierId],
    references: [companies.id],
    relationName: "carrierLoads",
  }),
  agent: one(users, {
    fields: [loads.agentId],
    references: [users.id],
  }),
  tracking: one(tracking, {
    fields: [loads.id],
    references: [tracking.loadId],
  }),
  loadBoardPost: one(loadBoardPosts, {
    fields: [loads.id],
    references: [loadBoardPosts.loadId],
  }),
}));

export const trackingRelations = relations(tracking, ({ one }) => ({
  load: one(loads, { fields: [tracking.loadId], references: [loads.id] }),
}));

export const loadBoardPostsRelations = relations(loadBoardPosts, ({ one }) => ({
  load: one(loads, { fields: [loadBoardPosts.loadId], references: [loads.id] }),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  quotedBy: one(users, { fields: [quotes.quotedById], references: [users.id] }),
  bookedLoad: one(loads, { fields: [quotes.bookedLoadId], references: [loads.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type CompanyRow = typeof companies.$inferSelect;
export type CarrierRow = typeof carriers.$inferSelect;
export type LoadRow = typeof loads.$inferSelect;
export type TrackingRow = typeof tracking.$inferSelect;
export type LoadBoardPostRow = typeof loadBoardPosts.$inferSelect;
export type QuoteRow = typeof quotes.$inferSelect;
