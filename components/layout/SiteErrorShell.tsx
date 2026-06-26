import { Home, MessageCircleQuestion, Plane } from "lucide-react";
import Link from "next/link";
import { SITE_NAME } from "@/lib/site/contact";

type SiteErrorShellProps = {
  statusCode: string;
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function SiteErrorShell({
  statusCode,
  title,
  description,
  action,
}: SiteErrorShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <header className="border-b border-white/10 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <Plane className="h-5 w-5" aria-hidden />
          </span>
          {SITE_NAME}
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="max-w-lg text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            {statusCode}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            {description}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {action ?? (
              <>
                <Link
                  href="/"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                >
                  <Home className="h-4 w-4" aria-hidden />
                  Back to home
                </Link>
                <Link
                  href="/book"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Book a ride
                </Link>
                <Link
                  href="/faq"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-sky-300 transition hover:text-sky-200"
                >
                  <MessageCircleQuestion className="h-4 w-4" aria-hidden />
                  Help & FAQ
                </Link>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
