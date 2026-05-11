"use client";

import { Car, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  NavbarUserMenu,
  type NavbarUserMenuSession,
} from "@/components/layout/NavbarUserMenu";

type NavbarVariant = "public" | "customer";

type NavbarProps = {
  variant: NavbarVariant;
  /** Present when the user is logged in (from server layout). */
  session?: NavbarUserMenuSession | null;
};

const publicPrimaryLinks = [
  { href: "/", label: "Home" },
  { href: "/book", label: "Book Now" },
  { href: "/bookings", label: "My Bookings" },
  { href: "/#contact", label: "Contact" },
  { href: "/#faq", label: "FAQ" },
] as const;

const publicSecondaryLinks = [
  { href: "/login/operator", label: "Operator Portal" },
] as const;

const customerLinks = [
  { href: "/book", label: "Book a Ride" },
  { href: "/bookings", label: "My Bookings" },
];

function navLinkClass(active: boolean, onDark = true) {
  if (onDark) {
    return active
      ? "text-sky-400 font-semibold"
      : "text-white/95 hover:text-white transition-colors";
  }
  return active
    ? "text-secondary font-semibold"
    : "text-content transition-colors hover:text-secondary";
}

export function Navbar({ variant, session = null }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (variant === "public") {
    return (
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-white sm:text-xl"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
              <Car className="h-5 w-5 text-white" aria-hidden />
            </span>
            TaxiBook
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-6 lg:flex xl:gap-8">
            {publicPrimaryLinks.map(({ href, label }) => {
              const resolvedHref =
                href === "/bookings" && !session
                  ? `/login?redirect=${encodeURIComponent("/bookings")}`
                  : href;
              const active =
                href === "/"
                  ? pathname === "/"
                  : href.startsWith("/#")
                    ? false
                    : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={resolvedHref}
                  className={`text-sm font-medium ${navLinkClass(active)}`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-4 lg:flex xl:gap-6">
            {publicSecondaryLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium text-white/90 transition-colors hover:text-white"
              >
                {label}
              </Link>
            ))}
            {session ? (
              <NavbarUserMenu session={session} appearance="dark" />
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground shadow-sm transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Login
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            {session ? (
              <NavbarUserMenu session={session} appearance="dark" />
            ) : null}
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
              onClick={() => setMobileOpen((o) => !o)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" aria-hidden />
              ) : (
                <Menu className="h-6 w-6" aria-hidden />
              )}
            </button>
          </div>
        </nav>

        {mobileOpen ? (
          <div
            id="mobile-nav"
            className="border-t border-white/10 bg-slate-950 px-4 py-4 lg:hidden"
          >
            <div className="flex flex-col gap-1">
              {publicPrimaryLinks.map(({ href, label }) => {
                const resolvedHref =
                  href === "/bookings" && !session
                    ? `/login?redirect=${encodeURIComponent("/bookings")}`
                    : href;
                const active =
                  href === "/"
                    ? pathname === "/"
                    : href.startsWith("/#")
                      ? false
                      : pathname === href || pathname.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={resolvedHref}
                    className={`rounded-lg px-3 py-3 text-base font-medium ${navLinkClass(active)}`}
                  >
                    {label}
                  </Link>
                );
              })}
              <hr className="my-2 border-white/10" />
              {publicSecondaryLinks.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-3 text-base font-medium text-white/90"
                >
                  {label}
                </Link>
              ))}
              {!session ? (
                <Link
                  href="/login"
                  className="mt-2 rounded-full bg-secondary px-4 py-3 text-center text-sm font-semibold text-secondary-foreground"
                >
                  Login
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>
    );
  }

  return (
    <header className="border-b border-slate-200 bg-white shadow-sm">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link
          href="/bookings"
          className="flex items-center gap-2 text-lg font-bold text-primary"
        >
          <Car className="h-6 w-6 text-secondary" aria-hidden />
          TaxiBook
        </Link>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {customerLinks.map(({ href, label }) => {
            const active =
              pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium ${navLinkClass(active, false)}`}
              >
                {label}
              </Link>
            );
          })}
          {session ? (
            <NavbarUserMenu session={session} appearance="light" />
          ) : null}
        </div>
      </nav>
    </header>
  );
}
