import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/layout/PublicHeader";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicHeader />

      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 py-24 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Freight Brokerage, Simplified
          </p>
          <h1 className="mt-3 text-4xl font-bold text-slate-900 sm:text-5xl">
            The command center behind every load we move.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Freight Society brokers truckload freight nationwide — reefer, dry van, and flatbed.
            Get a fast quote, post a load, or track your shipment below.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/quote-request"
              className="rounded-lg bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Request a Quote
            </Link>
            <Link
              href="/track"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Track a Shipment
            </Link>
            <Link
              href="/loadboard-public"
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              View Load Board
            </Link>
          </div>
        </section>

        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-3">
          <FeatureCard
            title="For Shippers"
            body="Tell us your lane and we'll get you a competitive rate, usually within the hour."
            href="/quote-request"
            cta="Request a Quote"
          />
          <FeatureCard
            title="For Carriers"
            body="Browse our open loads and call or email to book — no account required."
            href="/loadboard-public"
            cta="View Open Loads"
          />
          <FeatureCard
            title="For Customers"
            body="Enter your load number and delivery ZIP to see live status, ETA, and location."
            href="/track"
            cta="Track Shipment"
          />
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function FeatureCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
      <Link href={href} className="mt-4 inline-block text-sm font-semibold text-slate-900 hover:underline">
        {cta} →
      </Link>
    </div>
  );
}
