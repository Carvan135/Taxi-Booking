import type { Metadata } from "next";
import { ContentPlaceholder } from "@/components/legal/ContentPlaceholder";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { getCancellationCutoffHours } from "@/lib/booking/platform-settings-server";
import { SITE_EMAILS } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "Terms & Conditions | AirportHub",
  description:
    "Terms of service for booking airport transfers and private hire through AirportHub.",
};

const LAST_UPDATED = "8 June 2026";

const SECTIONS = [
  { id: "introduction", label: "Introduction" },
  { id: "definitions", label: "Definitions" },
  { id: "booking-terms", label: "Booking terms" },
  { id: "payment-terms", label: "Payment terms" },
  { id: "cancellation-policy", label: "Cancellation policy" },
  { id: "operator-terms", label: "Operator terms" },
  { id: "liability", label: "Liability" },
  { id: "governing-law", label: "Governing law" },
  { id: "contact", label: "Contact" },
] as const;

export default async function TermsPage() {
  const cutoffHours = await getCancellationCutoffHours();

  return (
    <LegalPageLayout
      title="Terms & conditions"
      lastUpdated={LAST_UPDATED}
      intro="These terms govern your use of AirportHub (airporthub.co.uk), our booking platform, and the services arranged through verified operators."
      sections={[...SECTIONS]}
    >
      <LegalSection id="introduction" title="Introduction">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="definitions" title="Definitions">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="booking-terms" title="Booking terms">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="payment-terms" title="Payment terms">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="cancellation-policy" title="Cancellation policy">
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-relaxed text-sky-950">
          <p>
            Cancellations made more than{" "}
            <strong>{cutoffHours} hours</strong> before pickup qualify for a
            full refund. Cancellations within {cutoffHours} hours of pickup are
            not eligible for a refund.
          </p>
        </div>
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="operator-terms" title="Operator terms">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="liability" title="Liability">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="governing-law" title="Governing law">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          Questions about these terms? Email{" "}
          <a
            href={`mailto:${SITE_EMAILS.support}`}
            className="font-medium text-secondary hover:underline"
          >
            {SITE_EMAILS.support}
          </a>
          .
        </p>
        <ContentPlaceholder />
      </LegalSection>
    </LegalPageLayout>
  );
}
