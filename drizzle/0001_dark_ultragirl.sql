CREATE TYPE "public"."load_board_name" AS ENUM('DAT', 'CENTRAL_DISPATCH');--> statement-breakpoint
CREATE TYPE "public"."load_board_posting_status" AS ENUM('POSTED', 'COVERED', 'EXPIRED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."vetting_source" AS ENUM('CARRIER411', 'FMCSA');--> statement-breakpoint
CREATE TABLE "carrier_vetting_checks" (
	"id" text PRIMARY KEY NOT NULL,
	"carrier_id" text NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"source" "vetting_source" NOT NULL,
	"identifier_used" text,
	"legal_name" text,
	"authority_status" "authority_status",
	"safety_rating" "safety_rating",
	"raw" text,
	"checked_by_id" text
);
--> statement-breakpoint
CREATE TABLE "load_board_postings" (
	"id" text PRIMARY KEY NOT NULL,
	"load_id" text NOT NULL,
	"board" "load_board_name" NOT NULL,
	"external_ref" text,
	"status" "load_board_posting_status" DEFAULT 'POSTED' NOT NULL,
	"posted_rate" double precision,
	"equipment" text,
	"posted_at" timestamp,
	"last_synced_at" timestamp,
	"raw" text,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "carrier_vetting_checks" ADD CONSTRAINT "carrier_vetting_checks_carrier_id_carriers_id_fk" FOREIGN KEY ("carrier_id") REFERENCES "public"."carriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carrier_vetting_checks" ADD CONSTRAINT "carrier_vetting_checks_checked_by_id_users_id_fk" FOREIGN KEY ("checked_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_board_postings" ADD CONSTRAINT "load_board_postings_load_id_loads_id_fk" FOREIGN KEY ("load_id") REFERENCES "public"."loads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "load_board_postings" ADD CONSTRAINT "load_board_postings_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;