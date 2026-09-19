import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold text-slate-900">
          Freight Society
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
          <Link href="/loadboard-public" className="hover:text-slate-900">
            Load Board
          </Link>
          <Link href="/quote-request" className="hover:text-slate-900">
            Get a Quote
          </Link>
          <Link href="/track" className="hover:text-slate-900">
            Track Shipment
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
          >
            Sign In
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE ?? "(555) 123-4567";
  const email = process.env.NEXT_PUBLIC_COMPANY_EMAIL ?? "dispatch@freightsociety.com";
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-8">
      <div className="mx-auto max-w-6xl px-6 text-sm text-slate-500">
        <p className="font-semibold text-slate-700">Freight Society</p>
        <p className="mt-1">
          {phone} · {email}
        </p>
        <p className="mt-4 text-xs text-slate-400">© {new Date().getFullYear()} Freight Society. All rights reserved.</p>
      </div>
    </footer>
  );
}
