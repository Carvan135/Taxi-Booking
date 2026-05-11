import { Check } from "lucide-react";
import { Fragment } from "react";

const STEPS = [
  { step: 1 as const, label: "Enter Details", short: "Details" },
  { step: 2 as const, label: "Select Operator", short: "Operator" },
  { step: 3 as const, label: "Payment", short: "Pay" },
] as const;

type BookingStepperProps = {
  currentStep: 1 | 2 | 3;
};

export function BookingStepper({ currentStep }: BookingStepperProps) {
  return (
    <div className="mb-5 sm:mb-6">
      <div className="mx-auto flex max-w-md items-start justify-center px-0.5 sm:max-w-lg">
        {STEPS.map(({ step, label, short }, index) => {
          const done = currentStep > step;
          const active = currentStep === step;

          return (
            <Fragment key={step}>
              <div className="flex w-16 shrink-0 flex-col items-center sm:w-24">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors sm:h-9 sm:w-9 sm:text-sm ${
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
                      className="h-4 w-4 sm:h-4 sm:w-4"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                  ) : (
                    step
                  )}
                </div>
                <p
                  className={`mt-1.5 text-center text-[10px] font-medium leading-tight sm:mt-2 sm:text-xs ${
                    active
                      ? "text-secondary"
                      : done
                        ? "text-emerald-700"
                        : "text-content/50"
                  }`}
                >
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">
                    Step {step}: {label}
                  </span>
                </p>
              </div>
              {index < STEPS.length - 1 ? (
                <div className="flex min-h-9 min-w-0 flex-1 items-center self-start px-0.5 pt-4 sm:min-h-10 sm:px-1.5 sm:pt-[18px]">
                  <div
                    className={`h-0.5 w-full rounded-full ${
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
