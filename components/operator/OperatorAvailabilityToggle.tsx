"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type OperatorAvailabilityToggleProps = {
  isPaused: boolean;
  pausedAt: string | null;
  /** Renders inside the profile sidebar card (no outer panel). */
  embedded?: boolean;
};

function formatPausedSince(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/London",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

export function OperatorAvailabilityToggle({
  isPaused: initialPaused,
  pausedAt,
  embedded = false,
}: OperatorAvailabilityToggleProps) {
  const router = useRouter();
  const [isPaused, setIsPaused] = useState(initialPaused);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    setLoading(true);
    try {
      if (isPaused) {
        const res = await fetch("/api/operator/resume", { method: "POST" });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not resume");
        setIsPaused(false);
      } else {
        const res = await fetch("/api/operator/pause", { method: "POST" });
        const json = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Could not pause");
        setIsPaused(true);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const content = (
    <>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-content/70">
        Availability
      </h2>
      <div
        className={
          embedded
            ? "mt-3 flex flex-col gap-3"
            : "mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        }
      >
        <div className={embedded ? "text-center" : undefined}>
          <p
            className={`flex items-center gap-2 font-semibold text-content ${embedded ? "justify-center text-base" : "text-lg"}`}
          >
            <span
              className={`inline-block h-3 w-3 rounded-full ${isPaused ? "bg-red-500" : "bg-emerald-500"}`}
              aria-hidden
            />
            {isPaused ? "Paused" : "Available"}
          </p>
          <p className="mt-1 text-sm text-content/70">
            {isPaused
              ? "Hidden from new bookings"
              : "Visible to customers"}
          </p>
          {isPaused && pausedAt ? (
            <p className="mt-2 text-xs text-content/60">
              Paused since {formatPausedSince(pausedAt)}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant={isPaused ? "primary" : "secondary"}
          loading={loading}
          onClick={() => void toggle()}
          className={embedded ? "w-full" : "shrink-0"}
        >
          {isPaused ? "Resume availability" : "Pause availability"}
        </Button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      {content}
    </div>
  );
}
