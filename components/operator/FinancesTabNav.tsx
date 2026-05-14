import Link from "next/link";

export type FinancesTab = "onboarding" | "earnings" | "payouts";

type FinancesTabNavProps = {
  active: FinancesTab;
  earningsQuery: { from: string; to: string; payment: string };
};

export function FinancesTabNav({ active, earningsQuery }: FinancesTabNavProps) {
  const earningsParams = new URLSearchParams();
  earningsParams.set("tab", "earnings");
  earningsParams.set("from", earningsQuery.from);
  earningsParams.set("to", earningsQuery.to);
  earningsParams.set("payment", earningsQuery.payment);

  const tabs: { id: FinancesTab; label: string; href: string }[] = [
    { id: "onboarding", label: "Onboarding", href: "/operator/finances?tab=onboarding" },
    {
      id: "earnings",
      label: "Earnings",
      href: `/operator/finances?${earningsParams.toString()}`,
    },
    { id: "payouts", label: "Payouts", href: "/operator/finances?tab=payouts" },
  ];

  return (
    <nav
      className="mt-6 flex flex-wrap gap-2 border-b border-slate-200 pb-px"
      aria-label="Finances sections"
    >
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
              isActive
                ? "border border-b-0 border-slate-200 bg-white text-secondary"
                : "text-content/70 hover:bg-slate-50 hover:text-content"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
