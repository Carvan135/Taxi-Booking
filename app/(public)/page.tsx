import {
  ContactSection,
  CtaSection,
  FaqSection,
  FeaturesSection,
  HeroSection,
  HowItWorksSection,
} from "@/components/landing/HomeSections";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <FaqSection />
      <ContactSection />
      <CtaSection />
    </>
  );
}
