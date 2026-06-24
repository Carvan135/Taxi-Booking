"use client";

import { useEffect } from "react";
import { SITE_NAME } from "@/lib/site/contact";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-16 text-center text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sky-400">
            Error
          </p>
          <h1 className="mt-3 text-3xl font-bold">{SITE_NAME}</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-300">
            A critical error occurred. Please refresh the page or try again in a
            moment.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
