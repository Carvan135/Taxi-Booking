import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { PolicyPdfDownload } from "@/components/legal/PolicyPdfDownload";
import { getCancellationCutoffHours } from "@/lib/booking/platform-settings-server";
import { getPolicyDocumentUrl } from "@/lib/policies/getPolicyDocument";

export const metadata: Metadata = {
  title: "Terms & Conditions | AirportHub",
  description:
    "Terms of service for booking airport transfers and private hire through AirportHub.",
};

const LAST_UPDATED = "19 June 2026";

const SECTIONS = [
  { id: "acceptance", label: "Acceptance of terms" },
  { id: "service-description", label: "Service description" },
  { id: "user-accounts", label: "User accounts" },
  { id: "bookings-payments", label: "Bookings and payments" },
  { id: "cancellation-policy", label: "Cancellation policy" },
  { id: "user-conduct", label: "User conduct" },
  { id: "operator-responsibilities", label: "Operator responsibilities" },
  { id: "limitation-of-liability", label: "Limitation of liability" },
  { id: "disputes", label: "Disputes and resolution" },
  { id: "intellectual-property", label: "Intellectual property" },
  { id: "modifications", label: "Modifications to service" },
  { id: "termination", label: "Termination" },
  { id: "contact", label: "Contact information" },
] as const;

export default async function TermsPage() {
  const [cutoffHours, pdfUrl] = await Promise.all([
    getCancellationCutoffHours(),
    getPolicyDocumentUrl("terms_conditions"),
  ]);

  return (
    <LegalPageLayout
      title="Terms & conditions"
      lastUpdated={LAST_UPDATED}
      intro="These terms govern your use of AirportHub (airporthub.co.uk), our booking platform, and the services arranged through verified operators."
      sections={[...SECTIONS]}
      headerAction={<PolicyPdfDownload url={pdfUrl} />}
    >
      <LegalSection id="acceptance" title="Acceptance of terms">
        <p>
          By accessing and using AirportHub&apos;s platform, you accept and agree
          to be bound by these Terms of Service. If you do not agree to these
          terms, please do not use our services.
        </p>
      </LegalSection>

      <LegalSection id="service-description" title="Service description">
        <p>
          AirportHub provides a marketplace platform that connects customers with
          independent taxi operators. We are not a transportation provider and
          do not own, operate, or manage the vehicles or drivers. Each taxi
          operator is an independent contractor responsible for providing the
          transportation services.
        </p>
      </LegalSection>

      <LegalSection id="user-accounts" title="User accounts">
        <p>To use our booking services, you must:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Be at least 18 years old</li>
          <li>Provide accurate and complete information</li>
          <li>Maintain the security of your account credentials</li>
          <li>Notify us immediately of any unauthorized use</li>
        </ul>
      </LegalSection>

      <LegalSection id="bookings-payments" title="Bookings and payments">
        <p>When you make a booking:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>You agree to pay the fare displayed at the time of booking</li>
          <li>Payment is processed securely through Stripe Connect</li>
          <li>
            Prices are fixed unless you modify the trip details during the
            journey
          </li>
          <li>
            You may cancel up to 2 hours before pickup without penalty
          </li>
          <li>Late cancellations may incur a cancellation fee</li>
        </ul>
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
        <p className="mt-4">
          You can cancel or modify eligible bookings from My Bookings before the
          cutoff time. Cancellations made less than 2 hours before scheduled
          pickup may incur a cancellation fee as described above.
        </p>
      </LegalSection>

      <LegalSection id="user-conduct" title="User conduct">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Violate any applicable laws or regulations</li>
          <li>Impersonate any person or entity</li>
          <li>Interfere with or disrupt the platform</li>
          <li>Use the service for fraudulent purposes</li>
          <li>Harass, abuse, or harm operators or other users</li>
        </ul>
      </LegalSection>

      <LegalSection id="operator-responsibilities" title="Operator responsibilities">
        <p>
          Taxi operators are independent contractors responsible for maintaining
          valid licenses, insurance, vehicle safety, and compliance with local
          transportation regulations. AirportHub verifies operator credentials
          but does not guarantee the quality or safety of services provided.
        </p>
      </LegalSection>

      <LegalSection id="limitation-of-liability" title="Limitation of liability">
        <p>
          AirportHub acts solely as a marketplace platform. We are not liable
          for any damages, injuries, losses, or disputes arising from
          transportation services provided by operators. Your use of operator
          services is at your own risk.
        </p>
      </LegalSection>

      <LegalSection id="disputes" title="Disputes and resolution">
        <p>
          Any disputes with operators should first be addressed directly with
          them. If unresolved, you may contact our support team. For disputes
          with AirportHub, you agree to attempt informal resolution before
          pursuing legal action.
        </p>
      </LegalSection>

      <LegalSection id="intellectual-property" title="Intellectual property">
        <p>
          All content, trademarks, and data on this platform are the property of
          AirportHub or its licensors. You may not copy, modify, or distribute
          any content without our written permission.
        </p>
      </LegalSection>

      <LegalSection id="modifications" title="Modifications to service">
        <p>
          We reserve the right to modify, suspend, or discontinue any part of our
          service at any time. We may also update these terms, and continued use
          constitutes acceptance of the updated terms.
        </p>
      </LegalSection>

      <LegalSection id="termination" title="Termination">
        <p>
          We may terminate or suspend your access to our service immediately,
          without notice, for conduct that violates these terms or is harmful to
          other users or the platform.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact information">
        <p>
          For questions about these terms, please contact us at{" "}
          <a
            href="mailto:legal@airporthub.co.uk"
            className="font-medium text-secondary hover:underline"
          >
            legal@airporthub.co.uk
          </a>{" "}
          or visit our{" "}
          <Link href="/#contact" className="font-medium text-secondary hover:underline">
            Contact page
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
