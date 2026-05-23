import { BOOKING_STATUS, type BookingStatus } from "@/lib/validations/enums";

const STEPS: { key: BookingStatus; label: string }[] = [
  { key: BOOKING_STATUS.pending, label: "Pending" },
  { key: BOOKING_STATUS.confirmed, label: "Confirmed" },
  { key: BOOKING_STATUS.completed, label: "Completed" },
];

function stepIndex(status: BookingStatus): number {
  if (status === BOOKING_STATUS.cancelled) return -1;
  if (status === BOOKING_STATUS.completed) return 2;
  if (status === BOOKING_STATUS.confirmed) return 1;
  return 0;
}

type BookingStatusTimelineProps = {
  status: BookingStatus;
};

export function BookingStatusTimeline({ status }: BookingStatusTimelineProps) {
  const active = stepIndex(status);

  if (status === BOOKING_STATUS.cancelled) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
        This booking was cancelled.
      </p>
    );
  }

  return (
    <ol className="flex items-center gap-2 sm:gap-4" aria-label="Booking progress">
      {STEPS.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                done || current
                  ? "bg-secondary text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
              aria-current={current ? "step" : undefined}
            >
              {i + 1}
            </span>
            <span
              className={`text-xs font-semibold sm:text-sm ${
                current ? "text-content" : done ? "text-content/70" : "text-content/45"
              }`}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 ? (
              <span
                className={`hidden h-0.5 flex-1 sm:block ${done ? "bg-secondary" : "bg-slate-200"}`}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
