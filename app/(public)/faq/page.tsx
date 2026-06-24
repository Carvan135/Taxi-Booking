import type { Metadata } from "next";
import { FaqPageClient } from "@/components/faq/FaqPageClient";
import { getCancellationCutoffHours } from "@/lib/booking/platform-settings-server";
import { getPolicyDocumentUrl } from "@/lib/policies/getPolicyDocument";

export const metadata: Metadata = {
  title: "FAQ | AirportHub",
  description:
    "Answers about booking, payments, cancellations, refunds, and your AirportHub account.",
};

export default async function FaqPage() {
  const [cutoffHours, pdfUrl] = await Promise.all([
    getCancellationCutoffHours(),
    getPolicyDocumentUrl("faq"),
  ]);

  return <FaqPageClient cutoffHours={cutoffHours} pdfUrl={pdfUrl} />;
}
