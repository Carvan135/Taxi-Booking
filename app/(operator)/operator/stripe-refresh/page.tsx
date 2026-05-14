import Link from "next/link";
import { ConnectStripeButton } from "@/components/operator/ConnectStripeButton";

export default function OperatorStripeRefreshPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-primary">
        Complete your payout setup
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-content/80">
        Your previous Stripe session expired or was left incomplete. Continue
        where you left off to finish connecting your bank account.
      </p>
      <div className="mt-8 space-y-4">
        <ConnectStripeButton returnPath="/operator/finances" />
        <p className="text-xs text-content/60">
          Prefer an automatic redirect? Open{" "}
          <Link
            href="/api/stripe/connect/refresh?returnTo=%2Foperator%2Ffinances"
            className="font-semibold text-secondary underline-offset-2 hover:underline"
          >
            this link
          </Link>{" "}
          while signed in.
        </p>
      </div>
    </div>
  );
}
