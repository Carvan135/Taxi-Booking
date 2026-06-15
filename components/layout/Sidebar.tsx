"use client";

import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  LayoutDashboard,
  Mail,
  Percent,
  Shield,
  User,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type SidebarVariant = "operator" | "admin";

type NavItem = { href: string; label: string; icon: LucideIcon };

const operatorItems: NavItem[] = [
  { href: "/operator/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/operator/bookings", label: "Bookings", icon: Calendar },
  { href: "/operator/price-rules", label: "Price Rules", icon: Percent },
  { href: "/operator/finances", label: "Finances", icon: Wallet },
  { href: "/operator/profile", label: "Profile", icon: User },
];

const adminItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: Calendar },
  { href: "/admin/emails", label: "Email log", icon: Mail },
  { href: "/admin/operators", label: "Operators", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/profile", label: "Profile", icon: User },
];

type SidebarProps = {
  variant: SidebarVariant;
  onNavigate?: () => void;
};

export function Sidebar({ variant, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const items = variant === "operator" ? operatorItems : adminItems;

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white md:h-full">
      <div className="flex items-center gap-2 px-4 py-5">
        {variant === "admin" ? (
          <Shield className="h-5 w-5 shrink-0 text-secondary" aria-hidden />
        ) : null}
        <div className="text-sm font-semibold tracking-tight text-primary">
          {variant === "operator" ? "Operator" : "Admin"}
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 pb-5">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-sky-50 text-secondary"
                  : "text-content/80 hover:bg-slate-100 hover:text-content"
              }`}
              onClick={onNavigate}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${active ? "text-secondary" : "text-content/60"}`}
                aria-hidden
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
