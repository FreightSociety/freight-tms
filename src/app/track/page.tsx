import { PublicHeader, PublicFooter } from "@/components/layout/PublicHeader";
import { TrackForm } from "./TrackForm";

export default function TrackPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PublicHeader />
      <main className="flex-1 px-6 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold text-slate-900">Track Your Shipment</h1>
          <p className="mt-2 text-slate-600">
            Enter your load number and delivery ZIP code to see live status.
          </p>
        </div>
        <div className="mt-10">
          <TrackForm />
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
