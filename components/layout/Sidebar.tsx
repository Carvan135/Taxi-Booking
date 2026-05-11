import Link from "next/link";
import { signOut } from "@/lib/auth/actions";

type SidebarVariant = "operator" | "admin";

type NavItem = { href: string; label: string };

const operatorItems: NavItem[] = [
  { href: "/operator/dashboard", label: "Dashboard" },
  { href: "/operator/bookings", label: "Bookings" },
  { href: "/operator/profile", label: "Profile" },
];

const adminItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/operators", label: "Operators" },
];

type SidebarProps = {
  variant: SidebarVariant;
};

export function Sidebar({ variant }: SidebarProps) {
  const items = variant === "operator" ? operatorItems : adminItems;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-primary text-primary-foreground">
      <div className="border-b border-white/10 px-4 py-5">
        <Link href="/" className="text-lg font-bold tracking-tight text-white">
          TaxiBook
        </Link>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-white/70">
          {variant === "operator" ? "Operator" : "Admin"}
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-white/90 transition hover:bg-white/10"
          >
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
