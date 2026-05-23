import Link from "next/link";
import { ConnectStripeButton } from "@/components/operator/ConnectStripeButton";
import type { OperatorSetupStep } from "@/lib/operator/operator-setup-steps";

function SetupStepRow({
  step,
  showStripeAction,
}: {
  step: OperatorSetupStep;
  showStripeAction: boolean;
}) {
  return (
    <li className="flex gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3">
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          step.done
            ? "bg-emerald-600 text-white"
            : "border border-slate-300 bg-white text-slate-400"
        }`}
        aria-hidden
      >
        {step.done ? "✓" : ""}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-content">{step.label}</p>
        <p className="mt-0.5 text-xs text-content/70">{step.detail}</p>
        {!step.done && step.href ? (
          <Link
            href={step.href}
            className="mt-2 inline-block text-xs font-semibold text-secondary underline-offset-2 hover:underline"
          >
            {step.id === "pricing" ? "Open pricing" : "Continue"}
          </Link>
        ) : null}
        {showStripeAction ? (
          <div className="mt-3">
            <ConnectStripeButton returnPath="/operator/dashboard" />
          </div>
        ) : null}
      </div>
    </li>
  );
}

type OperatorDashboardSetupStepsProps = {
  steps: OperatorSetupStep[];
  approved: boolean;
  payoutsEnabled: boolean;
};

export function OperatorDashboardSetupSteps({
  steps,
  approved,
  payoutsEnabled,
}: OperatorDashboardSetupStepsProps) {
  const completedCount = steps.filter((s) => s.done).length;
  const showStripeAction = approved && !payoutsEnabled;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-content/70">
        {completedCount} of {steps.length} complete — finish setup to unlock your
        weekly revenue chart.
      </p>
      <ol className="mt-4 space-y-2">
        {steps.map((step) => (
          <SetupStepRow
            key={step.id}
            step={step}
            showStripeAction={showStripeAction && step.id === "payouts"}
          />
        ))}
      </ol>
    </div>
  );
}
