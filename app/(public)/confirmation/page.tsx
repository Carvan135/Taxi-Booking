import { Suspense } from "react";
import ConfirmationContent from "./ConfirmationContent";

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-content/60">
          Loading confirmation…
        </div>
      }
    >
      <ConfirmationContent />
    </Suspense>
  );
}
