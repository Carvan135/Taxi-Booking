import Link from "next/link";

export type FinancesTab = "onboarding" | "earnings" | "payouts";

type FinancesTabNavProps = {
  active: FinancesTab;
  earningsQuery: { from: string; to: string };
  showOnboardingTab?: boolean;
};

export function FinancesTabNav({
  active,
  earningsQuery,
  showOnboardingTab = true,
}: FinancesTabNavProps) {
  const earningsParams = new URLSearchParams();
  earningsParams.set("tab", "earnings");
  earningsParams.set("from", earningsQuery.from);
  earningsParams.set("to", earningsQuery.to);

  const tabs: { id: FinancesTab; label: string; href: string }[] = [
    {
      id: "earnings",
      label: "Earnings",
      href: `/operator/finances?${earningsParams.toString()}`,
    },
    { id: "payouts", label: "Payouts", href: "/operator/finances?tab=payouts" },
  ];

  if (showOnboardingTab) {
    tabs.push({
      id: "onboarding",
      label: "Payout setup",
      href: "/operator/finances?tab=onboarding",
    });
  }

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
            className={`rounded-t-lg md:px-4 px-2 py-2.5 text-xs md:text-sm font-semibold transition ${
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
