# Freight Society — TMS / CRM

A working freight brokerage Transportation Management System and CRM, built to replace the
"Freight Society Command Center" spreadsheet. It covers the full brokering workflow: loads,
customers/carriers/leads, carrier compliance, inbound quotes, a public load board, customer
tracking, agent commissions, and company financials — plus public pages for shippers, carriers,
and customers who aren't logged in.

## Tech stack

- **Next.js 16** (App Router, Turbopack, TypeScript)
- **Tailwind CSS 4**
- **Drizzle ORM + Postgres (Neon serverless HTTP driver)** — see "Why Drizzle instead of Prisma"
  and "Database: Postgres via Neon" below
- **NextAuth.js (Auth.js) v5** — Credentials provider, bcrypt password hashing, JWT sessions,
  three roles (`ADMIN`, `BROKER`, `VIEWER`)
- **Recharts** for dashboard charts
- **Zod** for form/server-action validation
- Hand-built Tailwind UI components (cards, tables, badges, forms) — no heavy component library

### Why Drizzle instead of Prisma

The spec called for Prisma. This project was originally built in a network-restricted sandbox
where Prisma's migration/query engine binaries (downloaded from `binaries.prisma.sh` at install
time) were not reachable. Drizzle ORM is pure TypeScript with no native engine download, so it
installs and builds reliably in locked-down environments while still giving a fully typed schema
(`src/lib/db/schema.ts`) and a real relational database. If your environment has open network
access, migrating to Prisma is a mechanical change: the schema shape maps 1:1 to a Prisma schema
(see the field-by-field comments in `schema.ts`).

### Database: Postgres via Neon

The app is deployed on Vercel with a **Neon** Postgres database, accessed through the **Neon
serverless HTTP driver** (`@neondatabase/serverless` + `drizzle-orm/neon-http`, wired up in
`src/lib/db/index.ts`) rather than a traditional `pg`/`node-postgres` connection pool. That
driver talks to Neon over plain HTTPS with no persistent TCP connection, which is what makes it
work well from Vercel's serverless functions — each invocation gets a fresh, ephemeral
filesystem and can't keep a long-lived DB connection or a local file around the way a normal
server (or the SQLite file this project used earlier in development) can. It also avoids
needing any native driver binary, in the same spirit as the Prisma-binary workaround above.

Every date/time column in `schema.ts` uses `{ mode: "string" }`, so Postgres `timestamp` columns
still round-trip as ISO strings in application code — the rest of the app (forms, server actions,
formatting helpers) didn't need to change when the storage engine moved from SQLite to Postgres.

## Getting started

```bash
npm install
# Set DATABASE_URL in .env to your Postgres/Neon connection string (see .env.example)
npm run db:push      # creates all tables in that database from src/lib/db/schema.ts
npm run db:seed      # idempotent: seeds example data on a fresh DB, no-ops if an admin user already exists
npm run dev           # http://localhost:3000
```

When deployed on Vercel with the Neon integration, Vercel provisions the Neon database and sets
`DATABASE_URL` in the project's environment variables automatically — run `db:push`/`db:seed`
against that same URL (e.g. with `vercel env pull` locally, or from a one-off script/CI step)
rather than pointing them at a separate local database.

To type-check and build for production:

```bash
npm run build
npm start
```

## Seeded login credentials

| Role   | Email                          | Password        |
| ------ | ------------------------------- | ---------------- |
| Admin  | admin@freightsociety.com        | `ChangeMe123!`   |
| Broker | j.rivera@freightsociety.com     | `Agent#2026!`    |
| Broker | k.nguyen@freightsociety.com     | `Agent#2026!`    |
| Broker | d.patel@freightsociety.com      | `Agent#2026!`    |

**Change these before deploying anywhere real.** The seed script also creates the one example
load (`FS-1001`), its customer (Acme Foods Inc), two example carriers (Blue Ridge Trucking LLC —
preferred, insurance OK/expiring-soon depending on today's date — and Route 9 Freight Co, whose
insurance is already expired, to demonstrate the compliance alert states), a prospect lead
(Prairie Distribution), and a tracking entry for FS-1001. The Load Board and Quotes tables are
left empty, ready for real use.

## Environment variables

Copy `.env.example` to `.env` and fill in as needed:

```
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
NEXTAUTH_SECRET="<a long random string>"
NEXTAUTH_URL="http://localhost:3000"
FMCSA_WEBKEY=""
CARRIER411_USERNAME=""
CARRIER411_PASSWORD=""
NEXT_PUBLIC_COMPANY_PHONE="(555) 123-4567"
NEXT_PUBLIC_COMPANY_EMAIL="dispatch@freightsociety.com"
```

### Getting an FMCSA web key

The Carriers page's "FMCSA Lookup" button calls the government FMCSA QCMobile API to pull a
carrier's legal name, authority status, and safety rating by MC or DOT number. This requires a
free API key:

1. Go to <https://mobile.fmcsa.dot.gov/QCDevsite/docs/getWebKey> and register for a web key.
2. Put it in `.env` as `FMCSA_WEBKEY=...`.

Without a key set, the lookup button returns a clear in-app error
("FMCSA lookup unavailable — set FMCSA_WEBKEY in .env") instead of crashing — the rest of the
app works normally without it.

### Carrier411 (optional second vetting source)

The Carriers page also has a "Carrier411 Lookup" button (list page, read-only preview) and a
"Carrier411 Lookup & Refresh" action (carrier edit page, persists to the record) that call
Carrier411's SOAP "Web Services" API alongside FMCSA. This is a **paid add-on**, separate from a
normal Carrier411 subscription:

1. Contact Carrier411 to have "Web Services" enabled on your account — it's an extra ~$99/month
   on top of a regular subscription. See <https://www.carrier411.com/webservices.cfm> for details
   and to request access; there's no self-service signup.
2. Once enabled, set `CARRIER411_USERNAME` and `CARRIER411_PASSWORD` in `.env` to the
   credentials Carrier411 gives you.

A few things worth knowing about how this integration behaves, straight from Carrier411's docs:

- The API is **SOAP**, not REST/JSON — this app hand-builds the SOAP 1.1 envelopes with `fetch`
  and parses responses with `fast-xml-parser` (pure JS, no native/SOAP-toolkit dependency) rather
  than pulling in a full SOAP client library.
- Sessions from `wsLogin` are **IP-restricted** to whichever IP made the call and **expire at
  midnight EST** regardless of activity — so this app logs in fresh (`wsLogin`) on every lookup
  rather than caching a session, which also sidesteps "wrong IP" faults on serverless deploys
  where the outbound IP can change between requests.
- `wsGetCompany` pulls the carrier's authority/insurance/safety profile; `wsGetAllSMS` pulls SMS
  BASIC scores, shown as small badges under the Carrier411 button once a lookup has run.

Without credentials set, or if Web Services isn't enabled, or the session/IP is rejected, the
button shows a clear inline error ("Carrier411 lookup unavailable — set
CARRIER411_USERNAME/PASSWORD, and confirm Web Services is enabled on your account") instead of
crashing — everything else in the app, including the FMCSA lookup, keeps working normally.

## What's implemented

- **Auth & roles** — Credentials login, JWT sessions, middleware (`src/proxy.ts`, the Next 16
  name for `middleware.ts`) protecting every internal route. `VIEWER` is read-only everywhere;
  `BROKER` has full CRUD on loads/CRM/carriers/quotes/tracking/load board but can't manage users
  or see other agents' commission dollars; `ADMIN` sees and manages everything, including
  Financial Overview and all agents' commissions.
- **Loads (`/loads`)** — the master brokering log. Create/edit/delete, searchable list,
  auto-generated sequential load numbers (`FS-1001`, `FS-1002`, …), live-computed Gross
  Profit / Margin / Rev-per-Mile as you type, and optional inline creation of a linked Tracking
  entry and/or Load Board post.
- **CRM (`/crm`)** — customers, carriers, and leads with filters, and a detail page showing
  computed total loads/revenue/cost/profit rolled up live from the Loads table (never stored).
- **Carriers (`/carriers`)** — compliance table with computed Days-Until-Expiry and a
  color-coded Insurance Alert (green OK / amber Expiring Soon ≤30 days / red EXPIRED), Authority
  Status, Safety Rating, Preferred/Watchlist toggles, and **dual carrier vetting**: an FMCSA
  Lookup (free government SAFER data) and a Carrier411 Lookup (paid SOAP "Web Services" API,
  pulling in authority/insurance/safety plus SMS BASIC scores) sit side by side, each refreshing
  authority/safety/legal-name data and storing its own raw response + timestamp
  (`fmcsaRaw`/`fmcsaLastChecked` and `carrier411Raw`/`carrier411LastChecked`).
- **Quotes (`/quotes`)** — inbound queue sorted with new quotes first, an Age badge that flags
  quotes sitting >2 days as stale, inline status changes, quoted-rate entry, and a "Book This
  Quote" action that creates a real Load (and Company, if needed) pre-filled from the quote.
- **Load Board (`/loadboard`)** — toggle Post?/Status per load, set the posted (carrier-pay)
  rate, and see which loads are actually "Live" (computed as Post = Yes AND Status = Open).
- **Tracking (`/tracking`)** — internal management of the five milestone timestamps
  (Booked/Picked Up/In Transit/Out for Delivery/Delivered) via one-click "Mark ___" buttons,
  Hide/Notify/Ready/POD-on-file toggles, and editable Current Location / ETA / Public Note.
- **Agent Performance (`/agents`)** — monthly gross-profit grid (Jan–Dec) computed live from
  Loads grouped by agent and month, YTD profit, YTD commission, year selector. Admins see every
  agent; brokers see only their own row.
- **Financial Overview (`/financials`, ADMIN only)** — revenue/cost/profit by month, by quarter,
  and YTD, year selector, computed live.
- **Analytics (`/analytics`)** — By Customer / By Carrier / By Agent breakdown tables (loads,
  revenue, profit, margin), computed live and sortable by the columns shown.
- **Dashboard (`/dashboard`)** — KPI cards (revenue, profit, loads, margin for this month and
  YTD) and Recharts visuals: revenue/profit trend, top 5 customers, top 5 carriers, profit by
  agent.
- **Admin Users (`/admin/users`, ADMIN only)** — create/edit users, set role and commission
  rate, activate/deactivate accounts.
- **Public pages (no auth, separate layout)**:
  - `/` — marketing landing page with links to quote request, load board, and tracking.
  - `/track` — Load # + ZIP lookup; only shows entries that are `ready`, not `hidden`, and where
    the ZIP matches. Shows stage progress, current location, ETA, and a public note — **never**
    rate, cost, or profit data.
  - `/quote-request` — public form that creates a `Quote` with status `NEW`, with a thank-you
    confirmation on submit.
  - `/loadboard-public` — read-only list of loads where `Post? = Yes AND Status = Open`, with a
    call/email prompt using `NEXT_PUBLIC_COMPANY_PHONE` / `NEXT_PUBLIC_COMPANY_EMAIL`.
- All monetary values are formatted as currency, percentages and dates are formatted for
  humans, every list has an empty state, and every listed form validates required fields with
  inline error messages.

## What a production rollout would still want

This is a strong v1 core TMS/CRM — not a claim of feature parity with large commercial products
like MyCarrierPacket or Highway, which run dedicated compliance/fraud-detection data pipelines
and large support/sales orgs behind them. Things intentionally left out of this build:

- **Real notifications** — the Tracking page has Notify?/Last Notified fields and a public note,
  but there's no SMS/email delivery wired up (e.g. via Twilio/SendGrid) when a load's stage
  changes.
- **Payments / factoring integration** — invoice and payment status are tracked as fields, but
  there's no connection to a factoring company, QuickBooks, or a payments processor.
- **EDI / load-board syndication** — the public load board is Freight Society's own page; it
  doesn't push postings to DAT, Truckstop, or other load boards via EDI/API.
- **Document upload** — no file storage for signed rate confirmations, BOLs, or insurance
  certificates (the Carriers page stores structured fields and the raw FMCSA JSON, not PDFs).
- **E-signature** — no DocuSign/HelloSign-style flow for carrier packets or rate confirmations.
- **Deeper compliance/fraud checks** — the FMCSA integration covers authority status, safety
  rating, and legal name; it doesn't cross-reference double-brokering databases, watch lists, or
  the deeper insurance-verification services commercial carrier-vetting products use.
- **Audit trail / history** — the schema doesn't currently version row changes (who changed
  what, when) beyond `createdAt`/`updatedAt`.

## Deploying

### Vercel + Neon Postgres

The app already runs on Postgres (see "Database: Postgres via Neon" above), so deploying is
mostly configuration, not a code migration:

1. Create the Vercel project from this repo and add the **Neon** integration (or provision a
   Neon project directly and copy its connection string) — either path gives you a
   `DATABASE_URL` for a pooled/HTTP-compatible Neon connection.
2. Set `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` (your production URL), `FMCSA_WEBKEY`,
   `CARRIER411_USERNAME`/`CARRIER411_PASSWORD`, `ADMIN_BOOTSTRAP_SECRET`, and the
   `NEXT_PUBLIC_COMPANY_*` vars in the Vercel project's environment variables.
3. Deploy with `vercel deploy` (or connect the repo in the Vercel dashboard for git-based
   deploys). No `vercel.json` is needed — Vercel auto-detects this as a standard Next.js App
   Router project.
4. Create the database tables and seed data — see "First-time production setup" below. If you
   *can* reach the production `DATABASE_URL` directly (e.g. from your own machine, with no
   network restrictions), it's simpler to just run `npx drizzle-kit push` and `npm run db:seed`
   locally against that URL instead of using the bootstrap route.

### First-time production setup

`DATABASE_URL` normally isn't reachable from outside Vercel's own infrastructure (Neon's
pooled/HTTP endpoint is meant for server-side use), and some environments can't reach the Vercel
or Neon APIs directly either — so this project ships a one-time HTTP bootstrap route,
`POST /api/admin/bootstrap`, that runs the database migration and seed *from inside* the deployed
app, where the database is reachable:

1. After the first deploy, set `ADMIN_BOOTSTRAP_SECRET` to a long random value in the Vercel
   project's environment variables (and redeploy, or use "Redeploy" so the function picks it up).
2. Call the route once, with that secret in a header:
   ```bash
   curl -X POST https://your-app.vercel.app/api/admin/bootstrap \
     -H "x-bootstrap-secret: <your ADMIN_BOOTSTRAP_SECRET value>"
   ```
   (No REST client handy? Opening the URL with a tool that lets you set a POST + custom header —
   e.g. your browser's dev tools `fetch()` console, or any REST client extension — works too; a
   plain browser address-bar visit won't, since it needs to be a `POST`.)
3. The response is JSON summarizing which migration statements ran vs. were already applied
   (safe to call more than once — `CREATE TYPE`/`CREATE TABLE`/constraint statements that already
   exist are skipped, not treated as errors), whether seeding ran or was skipped (it's a no-op if
   an admin user already exists), and — the first time seeding actually runs — the seeded login
   credentials, read straight from the response body.
4. **Delete the route (or at least rotate `ADMIN_BOOTSTRAP_SECRET`) after first use** for a real
   production rollout — it's a powerful, unauthenticated-by-anything-except-one-header endpoint
   and isn't meant to stay live indefinitely.

The migration SQL it runs is pre-generated and committed to the repo under `drizzle/` (via
`npx drizzle-kit generate`, run locally against `src/lib/db/schema.ts` — regenerate and commit a
new file here any time the schema changes), and the seed logic lives in
`src/lib/db/seed-data.ts` as a shared `seedDatabase(db)` function used by both this route and the
local `npm run db:seed` CLI script.

## Project structure (top levels)

```
freight-tms/
├── prisma/seed.ts              # local CLI seed script (calls seedDatabase() from seed-data.ts)
├── drizzle.config.ts
├── drizzle/                     # generated SQL migrations (npx drizzle-kit generate), committed
├── src/
│   ├── app/
│   │   ├── page.tsx             # public landing page
│   │   ├── login/                # /login
│   │   ├── track/                # public /track
│   │   ├── quote-request/        # public /quote-request
│   │   ├── loadboard-public/     # public /loadboard-public
│   │   ├── (app)/                # authenticated app, shared sidebar layout
│   │   │   ├── dashboard/ loads/ crm/ carriers/ quotes/ loadboard/
│   │   │   └── tracking/ agents/ financials/ analytics/ admin/users/
│   │   └── api/
│   │       ├── auth/[...nextauth]/
│   │       ├── fmcsa/lookup/
│   │       ├── carrier411/lookup/
│   │       └── admin/bootstrap/    # one-time prod migration+seed route (see README)
│   ├── components/ui/            # Card, Table, Form, Badge primitives
│   ├── components/layout/        # Sidebar, PublicHeader/Footer
│   └── lib/
│       ├── db/                   # Drizzle schema + Neon client + shared seedDatabase()
│       ├── actions/               # server actions (loads, companies, carriers, quotes, …)
│       ├── data/                  # read queries + computed analytics
│       ├── utils/                 # currency/date/percent formatting, computed-field helpers
│       ├── auth.ts / session.ts   # NextAuth config, role helpers
│       ├── fmcsa.ts                # FMCSA QCMobile API integration
│       └── carrier411.ts           # Carrier411 SOAP Web Services integration
└── src/proxy.ts                  # route-protection middleware (Next 16 renamed this file)
```
