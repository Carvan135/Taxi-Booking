/** Shared pill styles for admin operator actions (list + detail). */

export const ADMIN_OP_PILL_BASE =
  "inline-flex !min-h-8 h-8 shrink-0 items-center justify-center !rounded-full !border bg-white px-3 text-xs font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50";

export const adminOpPillNeutral = `${ADMIN_OP_PILL_BASE} !border-slate-300 text-primary hover:bg-slate-50 focus-visible:ring-secondary/30`;

export const adminOpPillApprove = `${ADMIN_OP_PILL_BASE} !border-emerald-600 !text-emerald-700 hover:bg-emerald-50 focus-visible:ring-emerald-500/40`;

export const adminOpPillReject = `${ADMIN_OP_PILL_BASE} !border-red-500 !text-red-700 hover:bg-red-50 focus-visible:ring-red-400`;

export const adminOpPillSuspend = `${ADMIN_OP_PILL_BASE} !border-amber-500 !text-amber-800 hover:bg-amber-50 focus-visible:ring-amber-400`;

export const adminOpPillReactivate = adminOpPillNeutral;
