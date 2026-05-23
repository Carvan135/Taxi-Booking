"use client";

type StarRatingProps = {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
};

const SIZE_CLASS = {
  sm: "h-5 w-5",
  md: "h-7 w-7",
} as const;

export function StarRating({
  value,
  onChange,
  disabled = false,
  size = "md",
  label = "Rating",
}: StarRatingProps) {
  const interactive = onChange != null && !disabled;
  const sizeClass = SIZE_CLASS[size];

  return (
    <div
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? label : `${label}: ${value} out of 5 stars`}
      className="inline-flex items-center gap-0.5"
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        if (interactive) {
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              disabled={disabled}
              onClick={() => onChange(star)}
              className={`rounded p-0.5 transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 ${
                filled ? "text-amber-400" : "text-slate-300"
              }`}
            >
              <StarIcon className={sizeClass} filled={filled} />
            </button>
          );
        }
        return (
          <span key={star} className={filled ? "text-amber-400" : "text-slate-300"}>
            <StarIcon className={sizeClass} filled={filled} />
          </span>
        );
      })}
    </div>
  );
}

function StarIcon({
  className,
  filled,
}: {
  className: string;
  filled: boolean;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 0 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
      />
    </svg>
  );
}
