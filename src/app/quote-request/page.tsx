import { PublicHeader, PublicFooter } from "@/components/layout/PublicHeader";
import { QuoteRequestForm } from "./QuoteRequestForm";

export default function QuoteRequestPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicHeader />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-slate-900">Request a Quote</h1>
          <p className="mt-2 text-slate-600">
            Tell us about your lane and we&apos;ll get back to you with a rate.
          </p>
        </div>
        <div className="mt-10">
          <QuoteRequestForm />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
