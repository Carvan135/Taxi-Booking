import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LegalSection } from "@/components/legal/LegalSection";
import { PolicyPdfDownload } from "@/components/legal/PolicyPdfDownload";
import { getPolicyDocumentUrl } from "@/lib/policies/getPolicyDocument";
import { SITE_EMAILS, SITE_NAME } from "@/lib/site/contact";

export const metadata: Metadata = {
  title: "Cookie Policy | AirportHub",
  description:
    "How AirportHub uses cookies and similar technologies, and how to manage your preferences.",
};

const LAST_UPDATED = "19 June 2026";

const SECTIONS = [
  { id: "introduction", label: "Introduction" },
  { id: "what-are-cookies", label: "What are cookies?" },
  { id: "how-we-use", label: "How we use cookies" },
  { id: "essential", label: "Essential cookies" },
  { id: "functional", label: "Functional cookies" },
  { id: "analytics", label: "Analytics cookies" },
  { id: "manage-preferences", label: "Manage your preferences" },
  { id: "third-party", label: "Third-party cookies" },
  { id: "changes", label: "Changes to this policy" },
  { id: "contact", label: "Contact us" },
] as const;

export default async function CookiesPage() {
  const pdfUrl = await getPolicyDocumentUrl("cookie_policy");

  return (
    <LegalPageLayout
      title="Cookie policy"
      lastUpdated={LAST_UPDATED}
      intro={`This policy explains how ${SITE_NAME} (airporthub.co.uk) uses cookies and similar technologies, in line with UK GDPR and the Privacy and Electronic Communications Regulations (PECR).`}
      sections={[...SECTIONS]}
      headerAction={<PolicyPdfDownload url={pdfUrl} />}
    >
      <LegalSection id="introduction" title="Introduction">
        <p>
          When you visit AirportHub, we may store or retrieve information on
          your browser — usually in the form of cookies. Some cookies are
          essential for the site to work. Others help us provide optional
          features such as live chat. You can accept or reject non-essential
          cookies at any time.
        </p>
      </LegalSection>

      <LegalSection id="what-are-cookies" title="What are cookies?">
        <p>
          Cookies are small text files placed on your device when you visit a
          website. They help the site remember your preferences, keep you signed
          in, and understand how the service is used. We also use similar
          technologies such as local storage for cookie consent preferences.
        </p>
      </LegalSection>

      <LegalSection id="how-we-use" title="How we use cookies">
        <p>We group cookies into three categories:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Essential</strong> — required for security, authentication,
            and core booking functionality.
          </li>
          <li>
            <strong>Functional</strong> — optional features such as live chat
            support.
          </li>
          <li>
            <strong>Analytics</strong> — optional usage statistics to improve the
            service (not currently active).
          </li>
        </ul>
        <p>
          Under UK law, we only place non-essential cookies after you have given
          consent. You can change your mind at any time.
        </p>
      </LegalSection>

      <LegalSection id="essential" title="Essential cookies">
        <p>
          These cookies are strictly necessary and cannot be switched off in our
          systems. They are usually set in response to actions you take, such
          as signing in, completing a booking, or saving your cookie choices.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-content">Name</th>
                <th className="px-4 py-3 font-semibold text-content">Purpose</th>
                <th className="px-4 py-3 font-semibold text-content">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <tr>
                <td className="px-4 py-3 align-top text-content/85">
                  Supabase auth cookies
                </td>
                <td className="px-4 py-3 align-top text-content/85">
                  Keep you signed in and secure your session
                </td>
                <td className="px-4 py-3 align-top text-content/85">Session</td>
              </tr>
              <tr>
                <td className="px-4 py-3 align-top text-content/85">
                  airporthub_cookie_consent
                </td>
                <td className="px-4 py-3 align-top text-content/85">
                  Stores your cookie preference choices
                </td>
                <td className="px-4 py-3 align-top text-content/85">1 year</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="functional" title="Functional cookies">
        <p>
          These cookies enable enhanced functionality. If you do not allow them,
          live chat may not be available.
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-content">Provider</th>
                <th className="px-4 py-3 font-semibold text-content">Purpose</th>
                <th className="px-4 py-3 font-semibold text-content">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <tr>
                <td className="px-4 py-3 align-top text-content/85">Tawk.to</td>
                <td className="px-4 py-3 align-top text-content/85">
                  Live chat widget and support conversations
                </td>
                <td className="px-4 py-3 align-top text-content/85">
                  Varies (third party)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection id="analytics" title="Analytics cookies">
        <p>
          We do not currently use analytics cookies on AirportHub. If we introduce
          analytics tools in future, we will update this policy and ask for your
          consent before they are enabled.
        </p>
      </LegalSection>

      <LegalSection id="manage-preferences" title="Manage your preferences">
        <p>
          When you first visit the site, you can accept all cookies, reject
          non-essential cookies, or manage your preferences by category. You can
          reopen the preference panel at any time using the link in the site
          footer.
        </p>
        <p>
          You can also control cookies through your browser settings. Blocking
          essential cookies may affect sign-in and booking functionality.
        </p>
      </LegalSection>

      <LegalSection id="third-party" title="Third-party cookies">
        <p>
          Some cookies are set by third-party services that appear on our pages.
          Tawk.to may set its own cookies when you enable functional cookies.
          We do not control third-party cookies — please refer to the relevant
          provider&apos;s privacy policy for more information.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          We may update this cookie policy from time to time. Material changes
          will be posted on this page with an updated &ldquo;Last updated&rdquo;
          date. Where required, we will ask for your consent again.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact us">
        <p>
          Questions about cookies or your privacy? Email{" "}
          <a
            href={`mailto:${SITE_EMAILS.support}`}
            className="font-medium text-secondary hover:underline"
          >
            {SITE_EMAILS.support}
          </a>{" "}
          or read our{" "}
          <Link href="/privacy" className="font-medium text-secondary hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
