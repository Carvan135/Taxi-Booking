"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type ConnectStripeButtonProps = {
  /** Compact amber styling for use inside the payout-setup banner. */
  tone?: "default" | "amber-banner";
  /** Post-onboarding return pathname (must be allowlisted server-side). */
  returnPath?: string;
};

export function ConnectStripeButton({
  tone = "default",
  returnPath = "/operator/dashboard",
}: ConnectStripeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/connect/account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath }),
      });
      const data = (await res.json()) as { url?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Failed to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isAmberBanner = tone === "amber-banner";

  return (
    <div className={isAmberBanner ? "flex flex-col items-start sm:items-end" : undefined}>
      <Button
        type="button"
        variant="primary"
        size={isAmberBanner ? "sm" : "lg"}
        className={
          isAmberBanner
            ? "!border !border-amber-600/35 !bg-amber-200/70 !text-amber-950 !shadow-none hover:!bg-amber-300/80 focus-visible:!ring-amber-500 focus-visible:!ring-offset-2 focus-visible:!ring-offset-amber-50"
            : "bg-secondary hover:opacity-95"
        }
        loading={loading}
        onClick={handleConnect}
      >
        Connect bank account
      </Button>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
