export function OperatorCardSkeleton() {
  return (
    <li className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="h-5 w-40 rounded-md bg-slate-200" />
        <div className="h-4 w-28 rounded-md bg-slate-100" />
        <div className="flex gap-4">
          <div className="h-4 w-24 rounded-md bg-slate-100" />
          <div className="h-4 w-20 rounded-md bg-slate-100" />
        </div>
      </div>
      <div className="mt-4 flex flex-col items-end gap-2 sm:mt-0 sm:w-36">
        <div className="h-7 w-20 rounded-md bg-slate-200" />
        <div className="h-3 w-24 rounded-md bg-slate-100" />
        <div className="h-10 w-full rounded-xl bg-slate-200 sm:w-28" />
      </div>
    </li>
  );
}
