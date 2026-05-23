import { Suspense } from "react";
import { OperatorBookingsListSkeleton } from "@/components/operator/OperatorBookingCardSkeleton";
import { OperatorBookingsClient } from "@/components/operator/OperatorBookingsClient";

export default function OperatorBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
          <div className="mt-8 h-10 w-64 animate-pulse rounded-full bg-slate-200" />
          <div className="mt-6">
            <OperatorBookingsListSkeleton count={4} />
          </div>
        </div>
      }
    >
      <OperatorBookingsClient />
    </Suspense>
  );
}
