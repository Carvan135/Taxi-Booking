import { CheckCircle2, Lock, Shield } from "lucide-react";

export function PaymentTrustBadges() {
  return (
    <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-100 pt-5 text-xs text-emerald-800 sm:text-sm">
      <li className="flex items-center gap-2">
        <Lock className="h-4 w-4 shrink-0" aria-hidden />
        Secure Payment
      </li>
      <li className="flex items-center gap-2">
        <Shield className="h-4 w-4 shrink-0" aria-hidden />
        SSL Encrypted
      </li>
      <li className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
        Stripe Protected
      </li>
    </ul>
  );
}
