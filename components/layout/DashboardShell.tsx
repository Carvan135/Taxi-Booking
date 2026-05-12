
"use client";

import { useState } from "react";
import { Car, LogOut, Menu, Shield, X } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { FormSubmitSpinner } from "@/components/ui/FormSubmitSpinner";
import { signOut } from "@/lib/auth/actions";

type DashboardVariant = "operator" | "admin";

type DashboardShellProps = {
  variant: DashboardVariant;
  children: React.ReactNode;
};

export function DashboardShell({ variant, children }: DashboardShellProps) {
  const title = variant === "operator" ? "TaxiBook Operator" : "TaxiBook Admin";
  const TitleIcon = variant === "operator" ? Car : Shield;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-accent">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white/90 transition hover:bg-white/10 hover:text-white md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open sidebar"
              aria-controls="dashboard-sidebar"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-white sm:text-base">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                <TitleIcon className="h-5 w-5 text-white" aria-hidden />
              </span>
              {title}
            </div>
          </div>
          <form action={signOut}>
            <FormSubmitSpinner
              icon={<LogOut className="h-4 w-4" aria-hidden />}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition hover:bg-white/10 hover:text-white disabled:opacity-60"
            >
              Logout
            </FormSubmitSpinner>
          </form>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-[1600px]">
        {/* Desktop sidebar */}
        <div className="hidden md:flex">
          <Sidebar variant={variant} />
        </div>
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>

      {/* Mobile sidebar drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/60"
            aria-label="Close sidebar"
            onClick={() => setMobileOpen(false)}
          />
          <div
            id="dashboard-sidebar"
            className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-white shadow-2xl"
          >
            <div className="flex h-14 items-center justify-between border-b border-slate-200 px-4">
              <div className="text-sm font-semibold text-primary">Menu</div>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-content/70 transition hover:bg-slate-100 hover:text-content"
                onClick={() => setMobileOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <Sidebar variant={variant} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

