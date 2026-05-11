import type { LucideIcon } from "lucide-react";

export type StatCardProps = {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
};

export function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="flex gap-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/60">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-secondary">
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold tracking-tight text-primary tabular-nums">
          {value}
        </p>
        <p className="mt-1 text-sm font-medium text-content/70">{title}</p>
        {trend ? (
          <p className="mt-1 text-xs font-medium text-emerald-600">{trend}</p>
        ) : null}
      </div>
    </div>
  );
}
