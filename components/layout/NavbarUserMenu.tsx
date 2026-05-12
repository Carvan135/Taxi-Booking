"use client";

import { ChevronDown, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/lib/auth/actions";
import { FormSubmitSpinner } from "@/components/ui/FormSubmitSpinner";
import type { UserRole } from "@/types";

export type NavbarUserMenuSession = {
  displayName: string;
  role: UserRole;
};

type MenuEntry =
  | { kind: "link"; href: string; label: string }
  | { kind: "logout" };

function menuEntries(role: UserRole): MenuEntry[] {
  switch (role) {
    case "customer":
      return [
        { kind: "link", href: "/bookings", label: "My Bookings" },
        { kind: "logout" },
      ];
    case "operator":
      return [
        { kind: "link", href: "/operator/dashboard", label: "Dashboard" },
        { kind: "link", href: "/operator/profile", label: "Profile" },
        { kind: "logout" },
      ];
    case "admin":
      return [
        { kind: "link", href: "/admin/dashboard", label: "Dashboard" },
        { kind: "logout" },
      ];
  }
}

function initials(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  if (parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
  return parts[0][0]?.toUpperCase() ?? "?";
}

type NavbarUserMenuProps = {
  session: NavbarUserMenuSession;
  /** Dark navbar (public) vs light (customer) */
  appearance: "dark" | "light";
};

export function NavbarUserMenu({ session, appearance }: NavbarUserMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const entries = menuEntries(session.role);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerDark =
    appearance === "dark"
      ? "border-white/20 bg-white/10 text-white hover:bg-white/15"
      : "border-slate-200 bg-slate-50 text-content hover:bg-slate-100";

  const panel =
    appearance === "dark"
      ? "border border-slate-200 bg-white text-slate-900 shadow-xl"
      : "border border-slate-200 bg-white text-slate-900 shadow-lg";

  const linkClass =
    "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full border px-2 py-1.5 pr-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ${triggerDark}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
            appearance === "dark"
              ? "bg-white/20 text-white"
              : "bg-secondary/15 text-secondary"
          }`}
          aria-hidden
        >
          {initials(session.displayName)}
        </span>
        <span
          className={`hidden max-w-[140px] truncate text-left sm:inline sm:max-w-[180px] ${appearance === "dark" ? "text-white" : ""}`}
        >
          {session.displayName}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-80 ${open ? "rotate-180" : ""} transition-transform`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          className={`absolute right-0 z-[60] mt-2 min-w-[220px] rounded-xl py-1 ${panel}`}
        >
          <div className="p-1">
            {entries.map((entry, i) =>
              entry.kind === "link" ? (
                <Link
                  key={`${entry.href}-${i}`}
                  role="menuitem"
                  href={entry.href}
                  className={linkClass}
                  onClick={() => setOpen(false)}
                >
                  <User className="h-4 w-4 shrink-0" aria-hidden />
                  {entry.label}
                </Link>
              ) : (
                <form key="logout" action={signOut}>
                  <FormSubmitSpinner
                    role="menuitem"
                    icon={<LogOut className="h-4 w-4 shrink-0" aria-hidden />}
                    className={`${linkClass} w-full text-red-700 hover:bg-red-50 hover:text-red-800 disabled:opacity-60`}
                  >
                    Log out
                  </FormSubmitSpinner>
                </form>
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
