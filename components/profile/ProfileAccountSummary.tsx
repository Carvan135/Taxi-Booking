import { Mail, Phone, User } from "lucide-react";
import type { UserRole } from "@/types";

export type ProfileAccountSummaryProps = {
  fullName: string | null;
  email: string;
  phone?: string | null;
  role?: UserRole;
  memberSince?: string | null;
};

const ROLE_LABELS: Record<UserRole, string> = {
  customer: "Customer",
  operator: "Operator",
  admin: "Administrator",
};

export function ProfileAccountSummary({
  fullName,
  email,
  phone,
  role,
  memberSince,
}: ProfileAccountSummaryProps) {
  const displayName = fullName?.trim() || "Your account";
  const memberYear = memberSince
    ? new Date(memberSince).toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F]">
          <User className="h-7 w-7" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-primary">{displayName}</h2>
          {role ? (
            <p className="mt-0.5 text-sm font-medium text-secondary">
              {ROLE_LABELS[role]}
            </p>
          ) : null}
          {memberYear ? (
            <p className="mt-1 text-sm text-content/65">Member since {memberYear}</p>
          ) : null}
        </div>
      </div>

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 shrink-0 text-content/50" aria-hidden />
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-content/55">
              Email
            </dt>
            <dd className="font-medium text-content">{email}</dd>
          </div>
        </div>
        {phone?.trim() ? (
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 shrink-0 text-content/50" aria-hidden />
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-content/55">
                Phone
              </dt>
              <dd className="font-medium text-content">{phone.trim()}</dd>
            </div>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
