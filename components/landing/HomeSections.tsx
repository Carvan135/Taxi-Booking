import {
  BadgePoundSterling,
  Car,
  Clock,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { HeroBookingForm } from "@/components/landing/HeroBookingForm";

const features = [
  {
    title: "Wide Selection",
    description: "Choose from multiple verified operators.",
    Icon: Car,
  },
  {
    title: "Best Prices",
    description: "Compare prices and get the best deal.",
    Icon: BadgePoundSterling,
  },
  {
    title: "Fast Booking",
    description: "Book in seconds, ride in minutes.",
    Icon: Clock,
  },
  {
    title: "Safe & Secure",
    description: "All operators are verified and rated.",
    Icon: Shield,
  },
] as const;

const steps = [
  {
    step: 1,
    title: "Enter Details",
    description: "Tell us where you're going and when.",
  },
  {
    step: 2,
    title: "Choose Operator",
    description: "Compare options and select your preferred operator.",
  },
  {
    step: 3,
    title: "Enjoy Your Ride",
    description: "Pay securely and track your journey.",
  },
] as const;

const faqs = [
  {
    q: "How do I pay for my ride?",
    a: "Pay securely online with a card when you confirm your booking. Operators receive payouts via Stripe Connect.",
  },
  {
    q: "Can I book for someone else?",
    a: "Yes — enter the passenger details at checkout and share the booking reference with them.",
  },
  {
    q: "Are operators verified?",
    a: "Every operator completes onboarding and document checks before appearing on TaxiBook.",
  },
] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pb-24 pt-10 text-white sm:pb-28 sm:pt-14 lg:pb-32 lg:pt-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Pre-Book Your Taxi – Fast, Easy & Reliable
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-slate-300 sm:text-lg">
            Compare trusted operators and get the best price instantly.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-200">
            <span className="flex gap-0.5 text-amber-400" aria-label="Rated 4.8 out of 5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} aria-hidden>
                  ★
                </span>
              ))}
            </span>
            <span className="text-slate-300">
              Rated <strong className="font-semibold text-white">4.8/5</strong>{" "}
              from 5,000+ customers
            </span>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-10 max-w-3xl lg:mt-12">
          <HeroBookingForm />
        </div>
      </div>
    </section>
  );
}

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="scroll-mt-24 bg-white py-16 sm:py-20 lg:py-24"
      aria-labelledby="why-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2
          id="why-heading"
          className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Why Choose TaxiBook?
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {features.map(({ title, description, Icon }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-secondary">
                <Icon className="h-7 w-7" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 bg-slate-50 py-16 sm:py-20 lg:py-24"
      aria-labelledby="how-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2
          id="how-heading"
          className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          How It Works
        </h2>
        <div className="mt-12 grid gap-8 lg:grid-cols-3 lg:gap-10">
          {steps.map(({ step, title, description }) => (
            <div
              key={step}
              className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-lg font-bold text-secondary-foreground">
                {step}
              </div>
              <h3 className="mt-6 text-xl font-semibold text-slate-900">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  return (
    <section
      id="faq"
      className="scroll-mt-24 bg-white py-16 sm:py-20 lg:py-24"
      aria-labelledby="faq-heading"
    >
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2
          id="faq-heading"
          className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Frequently Asked Questions
        </h2>
        <dl className="mt-10 space-y-8">
          {faqs.map(({ q, a }) => (
            <div key={q} className="border-b border-slate-100 pb-8 last:border-0 last:pb-0">
              <dt className="text-lg font-semibold text-slate-900">{q}</dt>
              <dd className="mt-2 text-sm leading-relaxed text-slate-600">{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section
      id="contact"
      className="scroll-mt-24 border-y border-slate-100 bg-slate-50 py-14 sm:py-16"
      aria-labelledby="contact-heading"
    >
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <h2
          id="contact-heading"
          className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl"
        >
          Contact us
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
          Questions about bookings or becoming an operator? We&apos;re here to
          help.
        </p>
        <a
          href="mailto:support@taxibook.com"
          className="mt-6 inline-flex rounded-full border border-secondary bg-white px-6 py-3 text-sm font-semibold text-secondary shadow-sm transition hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
        >
          support@taxibook.com
        </a>
      </div>
    </section>
  );
}

export function CtaSection() {
  return (
    <section className="bg-white py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Ready to Get Started?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-slate-600">
          Book your first ride today — compare operators and ride with confidence.
        </p>
        <Link
          href="/book"
          className="mt-8 inline-flex rounded-full bg-secondary px-8 py-4 text-base font-semibold text-secondary-foreground shadow-lg shadow-secondary/25 transition hover:bg-blue-600 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
        >
          Start Booking
        </Link>
      </div>
    </section>
  );
}
