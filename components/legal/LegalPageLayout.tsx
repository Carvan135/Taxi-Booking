import type { ReactNode } from "react";

export type LegalTocItem = {
  id: string;
  label: string;
};

type LegalPageLayoutProps = {
  title: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalTocItem[];
  children: ReactNode;
};

export function LegalPageLayout({
  title,
  lastUpdated,
  intro,
  sections,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 xl:grid-cols-[240px_minmax(0,1fr)] xl:gap-16">
        <aside className="hidden lg:block">
          <nav
            className="sticky top-28 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            aria-label="On this page"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-content/55">
              On this page
            </p>
            <ul className="mt-4 space-y-2">
              {sections.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block text-sm text-content/75 transition hover:text-secondary"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <article className="min-w-0">
          <header className="border-b border-slate-200 pb-8">
            <p className="text-sm font-medium text-content/60">
              Last updated: {lastUpdated}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-primary sm:text-4xl">
              {title}
            </h1>
            {intro ? (
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-content/80">
                {intro}
              </p>
            ) : null}
          </header>

          <div className="mt-10 space-y-12">{children}</div>
        </article>
      </div>
    </div>
  );
}
