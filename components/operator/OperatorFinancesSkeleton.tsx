export function OperatorFinancesSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-6">
      <div className="h-8 w-32 rounded-lg bg-slate-200" />
      <div className="mt-2 h-4 max-w-lg rounded bg-slate-100" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-28 rounded-full bg-slate-200" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="h-4 w-24 rounded bg-slate-100" />
            <div className="mt-3 h-8 w-20 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex justify-between border-b border-slate-100 py-4 last:border-0"
          >
            <div className="h-4 w-32 rounded bg-slate-100" />
            <div className="h-4 w-16 rounded bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  );
}
