export function OperatorDashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6">
      <div className="h-8 w-40 rounded-lg bg-slate-200" />
      <div className="mt-2 h-4 max-w-xl rounded-md bg-slate-100" />

      <div className="mt-4 h-20 rounded-xl bg-slate-100" />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-4 w-28 rounded bg-slate-100" />
            <div className="mt-3 h-8 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="h-6 w-36 rounded bg-slate-200" />
          <div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-lg bg-slate-50 px-4 py-4">
                <div className="h-4 w-24 rounded bg-slate-200" />
                <div className="mt-2 h-4 w-40 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-full max-w-md rounded bg-slate-100" />
                <div className="mt-2 h-3 w-20 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </section>
        <section className="lg:col-span-2">
          <div className="h-6 w-28 rounded bg-slate-200" />
          <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="h-4 w-full max-w-xs rounded bg-slate-100" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-lg bg-slate-50 px-3 py-3"
                >
                  <div className="h-6 w-6 shrink-0 rounded-full bg-slate-200" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 w-40 rounded bg-slate-200" />
                    <div className="h-3 w-full max-w-sm rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
