CREATE TYPE "public"."authority_status" AS ENUM('ACTIVE', 'INACTIVE', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."company_status" AS ENUM('ACTIVE', 'INACTIVE', 'PROSPECT');--> statement-breakpoint
CREATE TYPE "public"."company_type" AS ENUM('CUSTOMER', 'CARRIER', 'LEAD');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('NOT_INVOICED', 'INVOICED', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."load_board_status" AS ENUM('OPEN', 'COVERED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'PAID', 'OVERDUE');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('NEW', 'QUOTED', 'BOOKED', 'LOST', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('ADMIN', 'BROKER', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."safety_rating" AS ENUM('SATISFACTORY', 'CONDITIONAL', 'UNSATISFACTORY', 'NOT_RATED');--> statement-breakpoint
CREATE TABLE "carriers" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" text NOT NULL,
	"mc_number" text,
	"dot_number" text,
	"insurance_company" text,
	"policy_number" text,
	"insurance_expiry" timestamp,
	"authority_status" "authority_status" DEFAULT 'ACTIVE' NOT NULL,
	"equipment_types" text,
	"safety_rating" "safety_rating" DEFAULT 'NOT_RATED' NOT NULL,
	"preferred" boolean DEFAULT false NOT NULL,
	"watchlist" boolean DEFAULT false NOT NULL,
	"notes" text,
	"fmcsa_last_checked" timestamp,
	"fmcsa_raw" text,
	"carrier411_last_checked" timestamp,
	"carrier411_raw" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "carriers_company_id_unique" UNIQUE("company_id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "company_type" NOT NULL,
	"contact_name" text,
	"phone" text,
	"email" text,
	"city" text,
	"state" text,
	"mc_number" text,
	"dot_number" text,
	"status" "company_status" DEFAULT 'ACTIVE' NOT NULL,
	"lead_source" text,
	"date_added" timestamp DEFAULT now() NOT NULL,
	"last_load_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "load_board_posts" (
	"id" text PRIMARY KEY NOT NULL,
	"load_id" text NOT NULL,
	"post" boolean DEFAULT false NOT NULL,
	"pickup_date" timestamp,
	"posted_rate" double precision,
	"status" "load_board_status" DEFAULT 'OPEN' NOT NULL,
	"posted_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "load_board_posts_load_id_unique" UNIQUE("load_id")
);
--> statement-breakpoint
CREATE TABLE "loads" (
	"id" text PRIMARY KEY NOT NULL,
	"load_number" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"customer_id" text NOT NULL,
	"carrier_id" text,
	"agent_id" text NOT NULL,
	"origin_city" text NOT NULL,
	"origin_state" text NOT NULL,
	"dest_city" text NOT NULL,
	"dest_state" text NOT NULL,
	"dest_zip" text,
	"loaded_miles" double precision DEFAULT 0 NOT NULL,
	"commodity" text,
	"weight" double precision DEFAULT 0 NOT NULL,
	"customer_rate" double precision DEFAULT 0 NOT NULL,
	"carrier_cost" double precision DEFAULT 0 NOT NULL,
	"customer_terms" integer DEFAULT 30 NOT NULL,
	"carrier_terms" integer DEFAULT 30 NOT NULL,
	"invoice_date" timestamp,
	"invoice_status" "invoice_status" DEFAULT 'NOT_INVOICED' NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"equipment" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "loads_load_number_unique" UNIQUE("load_number")
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"status" "quote_status" DEFAULT 'NEW' NOT NULL,
	"name" text NOT NULL,
	"company" text,
	"email" text,
	"phone" text,
	"pickup_location" text NOT NULL,
	"delivery_location" text NOT NULL,
	"pickup_date" timestamp,
	"weight" double precision,
	"commodity" text,
	"equipment" text,
	"contact_prefs" text,
	"notes" text,
	"quoted_rate" double precision,
	"quoted_by_id" text,
	"booked_load_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "quotes_booked_load_id_unique" UNIQUE("booked_load_id")
);
--> statement-breakpoint
CREATE TABLE "tracking" (
	"id" text PRIMARY KEY NOT NULL,
	"load_id" text NOT NULL,
	"delivery_zip" text NOT NULL,
	"booked_at" timestamp,
	"picked_up_at" timestamp,
	"in_transit_at" timestamp,
	"out_for_delivery_at" timestamp,
	"delivered_at" timestamp,
	"current_location" text,
	"eta" timestamp,
	"public_note" text,
	"hide" boolean DEFAULT false NOT NULL,
	"notify" boolean DEFAULT false NOT NULL,
	"last_notified" timestamp,
	"ready" boolean DEFAULT false NOT NULL,
	"pod_on_file" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tracking_load_id_unique" UNIQUE("load_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'BROKER' NOT NULL,
	"commission_rate" double precision DEFAULT 0.1 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "carriers" ADD CONSTRAINT "carriers_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_board_posts" ADD CONSTRAINT "load_board_posts_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_customer_id_companies_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_carrier_id_companies_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loads" ADD CONSTRAINT "loads_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_quoted_by_id_users_id_fk" FOREIGN KEY ("quoted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_booked_load_id_loads_id_fk" FOREIGN KEY ("booked_load_id") REFERENCES "public"."loads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking" ADD CONSTRAINT "tracking_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;