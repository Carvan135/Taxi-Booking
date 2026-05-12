import { Calendar } from "lucide-react";

export default function OperatorBookingsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-semibold text-content">
        <Calendar className="h-7 w-7 shrink-0 text-secondary" aria-hidden />
        Bookings
      </h1>
      <p className="mt-2 text-sm text-content/70">Content coming soon.</p>
    </div>
  );
}
