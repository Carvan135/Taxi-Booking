"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { SiteErrorShell } from "@/components/layout/SiteErrorShell";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <SiteErrorShell
      statusCode="Error"
      title="Something went wrong"
      description="An unexpected error occurred while loading this page. You can try again, or return to the homepage."
      action={
        <>
          <Button type="button" variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Back to home
          </a>
        </>
      }
    />
  );
}
