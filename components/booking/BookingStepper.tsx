import { Check } from "lucide-react";
import { Fragment } from "react";

const STEPS = [
  { step: 1 as const, label: "Journey Details", short: "Journey" },
  { step: 2 as const, label: "Choose Operator", short: "Operator" },
  { step: 3 as const, label: "Payment", short: "Payment" },
] as const;

type BookingStepperProps = {
  currentStep: 1 | 2 | 3;
};

export function BookingStepper({ currentStep }: BookingStepperProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="mx-auto flex max-w-lg items-start justify-center px-0.5 sm:max-w-xl">
        {STEPS.map(({ step, label, short }, index) => {
          const done = currentStep > step;
          const active = currentStep === step;

          return (
            <Fragment key={step}>
              <div className="flex w-[4.5rem] shrink-0 flex-col items-center sm:w-28">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors sm:h-10 sm:w-10 sm:text-sm ${
                    done
                      ? "bg-emerald-500 text-white"
                      : active
                        ? "bg-secondary text-secondary-foreground shadow-md shadow-secondary/30"
                        : "border-2 border-slate-200 bg-white text-slate-400"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <Check
                      className="h-4 w-4 sm:h-5 sm:w-5"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  ) : (
                    step
                  )}
                </div>
                <p
                  className={`mt-2 text-center text-[10px] font-semibold leading-tight sm:text-xs ${
                    active
                      ? "text-secondary"
                      : done
                        ? "text-emerald-700"
                        : "text-content/45"
                  }`}
                >
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">
                    Step {step}: {label}
                  </span>
                </p>
              </div>
              {index < STEPS.length - 1 ? (
                <div className="flex min-h-10 min-w-0 flex-1 items-center self-start px-0.5 pt-5 sm:px-2 sm:pt-5">
                  <div
                    className={`h-0.5 w-full rounded-full transition-colors ${
                      currentStep > step ? "bg-secondary" : "bg-slate-200"
                    }`}
                    aria-hidden
                  />
                </div>
              ) : null}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
