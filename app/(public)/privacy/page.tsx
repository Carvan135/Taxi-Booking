import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { PolicyPdfDownload } from "@/components/legal/PolicyPdfDownload";
import { getPolicyDocumentUrl } from "@/lib/policies/getPolicyDocument";

export const metadata: Metadata = {
  title: "Privacy Policy | AirportHub",
  description: "How AirportHub collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "19 June 2026";

const SECTIONS = [
  { id: "data-collected", label: "Information we collect" },
  { id: "how-we-use", label: "How we use your information" },
  { id: "third-parties", label: "Information sharing" },
  { id: "data-security", label: "Data security" },
  { id: "your-rights", label: "Your rights" },
  { id: "cookies", label: "Cookies and tracking" },
  { id: "children", label: "Children's privacy" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact us" },
] as const;

export default async function PrivacyPage() {
  const pdfUrl = await getPolicyDocumentUrl("privacy_policy");

  return (
    <LegalPageLayout
      title="Privacy policy"
      lastUpdated={LAST_UPDATED}
      intro="AirportHub (airporthub.co.uk) is committed to protecting your privacy. This policy explains what information we collect, how we use it, and the choices available to you under UK data protection law."
      sections={[...SECTIONS]}
      headerAction={<PolicyPdfDownload url={pdfUrl} />}
    >
      <LegalSection id="data-collected" title="Information we collect">
        <p>
          We collect information you provide directly to us when you:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Create an account or book a ride</li>
          <li>Contact customer support</li>
          <li>Participate in surveys or promotions</li>
        </ul>
        <p>
          This information may include your name, email address, phone number,
          payment information, and pickup/destination locations.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="How we use your information">
        <p>We use the information we collect to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Process and complete your bookings</li>
          <li>Send you booking confirmations and updates</li>
          <li>Provide customer support</li>
          <li>Improve our services and user experience</li>
          <li>Prevent fraud and enhance security</li>
          <li>Comply with legal obligations</li>
        </ul>
      </LegalSection>

      <LegalSection id="third-parties" title="Information sharing">
        <p>
          We share your information with taxi operators only to the extent
          necessary to complete your booking. This includes your name, phone
          number, and pickup/destination details. We do not sell your personal
          information to third parties.
        </p>
      </LegalSection>

      <LegalSection id="data-security" title="Data security">
        <p>
          We implement appropriate technical and organizational measures to
          protect your personal information against unauthorized access,
          alteration, disclosure, or destruction. Payment information is
          processed through Stripe Connect, which is PCI-DSS compliant.
        </p>
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <p>You have the right to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Access and receive a copy of your personal data</li>
          <li>Correct inaccurate or incomplete data</li>
          <li>Request deletion of your data</li>
          <li>Object to or restrict certain processing of your data</li>
          <li>Withdraw consent at any time</li>
        </ul>
      </LegalSection>

      <LegalSection id="cookies" title="Cookies and tracking">
        <p>
          We use cookies and similar tracking technologies to improve your
          experience, analyze usage patterns, and deliver personalized content.
          You can control cookies through your browser settings and our{" "}
          <Link href="/cookies" className="font-medium text-secondary hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children's privacy">
        <p>
          Our services are not intended for children under 13 years of age. We
          do not knowingly collect personal information from children under 13.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          We may update this privacy policy from time to time. We will notify
          you of any significant changes by posting the new policy on this page
          and updating the &ldquo;Last updated&rdquo; date.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact us">
        <p>
          If you have questions about this privacy policy or our data practices,
          please contact us at{" "}
          <a
            href="mailto:privacy@airporthub.co.uk"
            className="font-medium text-secondary hover:underline"
          >
            privacy@airporthub.co.uk
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
