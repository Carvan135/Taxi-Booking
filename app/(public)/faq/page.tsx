import type { Metadata } from "next";
import { FaqPageClient } from "@/components/faq/FaqPageClient";
import { getCancellationCutoffHours } from "@/lib/booking/platform-settings-server";

export const metadata: Metadata = {
  title: "FAQ | AirportHub",
  description:
    "Answers about booking, payments, cancellations, refunds, and your AirportHub account.",
};

export default async function FaqPage() {
  const cutoffHours = await getCancellationCutoffHours();

  return <FaqPageClient cutoffHours={cutoffHours} />;
}
