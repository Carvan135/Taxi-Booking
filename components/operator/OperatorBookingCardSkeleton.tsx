export function OperatorBookingCardSkeleton() {
  return (
    <li className="animate-pulse rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="h-5 w-24 rounded bg-slate-200" />
          <div className="h-5 w-16 rounded-full bg-slate-100" />
          <div className="h-5 w-14 rounded-full bg-slate-100" />
        </div>
        <div className="h-6 w-16 rounded bg-slate-200" />
      </div>
      <div className="mt-3 h-4 w-48 rounded bg-slate-100" />
      <div className="mt-4 space-y-2">
        <div className="h-4 w-32 rounded bg-slate-100" />
        <div className="h-4 w-full max-w-md rounded bg-slate-100" />
        <div className="h-4 w-40 rounded bg-slate-100" />
      </div>
      <div className="mt-4 flex gap-2">
        <div className="h-9 w-20 rounded-lg bg-slate-200" />
        <div className="h-9 w-24 rounded-lg bg-slate-100" />
      </div>
    </li>
  );
}

export function OperatorBookingsListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="space-y-5">
      {Array.from({ length: count }).map((_, i) => (
        <OperatorBookingCardSkeleton key={i} />
      ))}
    </ul>
  );
}
