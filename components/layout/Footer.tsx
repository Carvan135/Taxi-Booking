import { Plane } from "lucide-react";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/cookies/CookieSettingsButton";
import { SITE_EMAILS } from "@/lib/site/contact";

const SITE_DOMAIN = "airporthub.co.uk";

const quickLinks = [
  { href: "/book", label: "Book a Ride" },
  { href: "/bookings", label: "My Bookings" },
  { href: "/faq", label: "FAQ" },
] as const;

const operatorLinks = [
  { href: "/login/operator", label: "Login" },
  { href: "/signup/operator", label: "Register" },
] as const;

const legalLinks = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/faq", label: "FAQ" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight text-white"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <Plane className="h-5 w-5 text-white" aria-hidden />
              </span>
              AirportHub
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              Book airport transfers and private hire with verified operators
              across the UK.
            </p>
            <a
              href={`https://${SITE_DOMAIN}`}
              className="mt-3 inline-block text-sm text-slate-400 transition hover:text-white"
            >
              {SITE_DOMAIN}
            </a>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-3">
              {quickLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              For Operators
            </h3>
            <ul className="mt-4 space-y-3">
              {operatorLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Support
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href={`mailto:${SITE_EMAILS.support}`}
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  {SITE_EMAILS.support}
                </a>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="text-sm text-slate-400 transition hover:text-white"
                >
                  Help & FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-white">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {legalLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-sm text-slate-400 transition hover:text-white"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <CookieSettingsButton />
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-8 sm:flex-row sm:gap-4">
          <p className="text-center text-xs text-slate-500 sm:text-left">
            © {year} AirportHub · {SITE_DOMAIN}. All rights reserved.
          </p>
          <Link
            href="/admin/dashboard"
            className="text-xs text-slate-500 transition hover:text-slate-300"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
