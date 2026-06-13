import type { Metadata } from "next";
import { ContentPlaceholder } from "@/components/legal/ContentPlaceholder";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { SITE_EMAILS } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "Privacy Policy | AirportHub",
  description: "How AirportHub collects, uses, and protects your personal data.",
};

const LAST_UPDATED = "8 June 2026";

const SECTIONS = [
  { id: "introduction", label: "Introduction" },
  { id: "data-collected", label: "Data we collect" },
  { id: "how-we-use", label: "How we use your data" },
  { id: "cookies", label: "Cookies" },
  { id: "third-parties", label: "Third parties" },
  { id: "your-rights", label: "Your rights" },
  { id: "contact", label: "Contact" },
] as const;

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      title="Privacy policy"
      lastUpdated={LAST_UPDATED}
      intro="AirportHub (airporthub.co.uk) is committed to protecting your privacy. This policy explains what information we collect, how we use it, and the choices available to you under UK data protection law."
      sections={[...SECTIONS]}
    >
      <LegalSection id="introduction" title="Introduction">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="data-collected" title="Data we collect">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="how-we-use" title="How we use your data">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="cookies" title="Cookies">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="third-parties" title="Third parties">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="your-rights" title="Your rights">
        <ContentPlaceholder />
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          For privacy enquiries, contact us at{" "}
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
