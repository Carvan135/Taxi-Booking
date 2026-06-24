"use client";

import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { OpenTawkChatButton } from "@/components/chat/OpenTawkChatButton";
import { PolicyPdfDownload } from "@/components/legal/PolicyPdfDownload";
import { SITE_EMAILS } from "@/lib/site/contact";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

type FaqCategory = {
  id: string;
  label: string;
  items: FaqItem[];
};

const FAQ_DATA: FaqCategory[] = [
  {
    id: "booking",
    label: "Booking",
    items: [
      {
        id: "booking-1",
        question: "How do I book a taxi?",
        answer:
          "Simply fill out the booking form with your pickup location, destination, date, and time. You'll then see a list of available operators to choose from. Select your preferred operator and complete the payment to confirm your booking.",
      },
      {
        id: "booking-2",
        question: "What if I need to book for multiple passengers?",
        answer:
          "During the booking process, you can specify the number of passengers. We'll show you operators with vehicles that can accommodate your group size.",
      },
      {
        id: "booking-3",
        question: "Can I request a specific type of vehicle?",
        answer:
          "Yes, when browsing available operators, you'll see their vehicle types (sedan, SUV, luxury, etc.). You can filter and choose based on your preference.",
      },
      {
        id: "booking-4",
        question: "Are the prices fixed or estimated?",
        answer:
          "The prices shown are fixed quotes based on your journey details. The final price won't change unless you modify the pickup or destination during the trip.",
      },
    ],
  },
  {
    id: "payment",
    label: "Payment",
    items: [
      {
        id: "payment-1",
        question: "What payment methods do you accept?",
        answer:
          "We accept all major credit and debit cards through our secure Stripe Connect payment system. Payment is processed at the time of booking.",
      },
    ],
  },
  {
    id: "cancellations",
    label: "Cancellations & changes",
    items: [
      {
        id: "cancellations-1",
        question: "Can I cancel or modify my booking?",
        answer:
          "Yes, you can cancel or modify your booking up to 2 hours before the scheduled pickup time. Go to 'My Bookings' and select the booking you want to change. Cancellations made less than 2 hours before pickup may incur a cancellation fee.",
      },
      {
        id: "cancellations-2",
        question: "What happens if my driver is late?",
        answer:
          "If your driver is running late, they'll contact you directly. If they're more than 15 minutes late without notification, you can cancel the booking without penalty and receive a full refund.",
      },
    ],
  },
  {
    id: "operators",
    label: "Operators",
    items: [
      {
        id: "operators-1",
        question: "How are operators verified?",
        answer:
          "All operators on our platform undergo thorough background checks, vehicle inspections, and license verification. We also collect customer ratings and reviews to ensure quality service.",
      },
      {
        id: "operators-2",
        question: "How do I know my driver has arrived?",
        answer:
          "You'll receive a notification when your driver is nearby. The driver will also contact you directly using the phone number you provided during booking.",
      },
      {
        id: "operators-3",
        question: "How do I become an operator on the platform?",
        answer:
          "Visit our Operator Registration page to apply. You'll need to provide your business details, vehicle information, insurance documents, and driver licenses. Our team will review your application within 3–5 business days.",
      },
    ],
  },
];

function matchesQuery(item: FaqItem, query: string): boolean {
  const haystack = `${item.question} ${item.answer}`.toLowerCase();
  return haystack.includes(query);
}

export function FaqPageClient({
  cutoffHours,
  pdfUrl,
}: {
  cutoffHours: number;
  pdfUrl: string | null;
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredCategories = useMemo(() => {
    if (!normalizedQuery) return FAQ_DATA;

    return FAQ_DATA.map((category) => ({
      ...category,
      items: category.items.filter((item) =>
        matchesQuery(item, normalizedQuery),
      ),
    })).filter((category) => category.items.length > 0);
  }, [normalizedQuery]);

  const hasResults = filteredCategories.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-primary sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-4 text-base leading-relaxed text-content/80">
          Search for answers about booking, payments, cancellations, and your
          account on AirportHub.
        </p>
        <div className="mt-5 flex justify-center">
          <PolicyPdfDownload url={pdfUrl} />
        </div>
      </header>

      <div className="relative mt-8">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-content/45"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search questions…"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20"
          aria-label="Search FAQ"
        />
      </div>

      <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        Cancellations made more than{" "}
        <strong>{cutoffHours} hours</strong> before pickup qualify for a full
        refund. Cancellations within {cutoffHours} hours of pickup are not
        eligible for a refund.
      </p>

      <div className="mt-10 space-y-10">
        {!hasResults ? (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-content/70">
            No questions match your search. Try different keywords or contact
            support below.
          </p>
        ) : (
          filteredCategories.map((category) => (
            <section key={category.id} aria-labelledby={`faq-${category.id}`}>
              <h2
                id={`faq-${category.id}`}
                className="text-lg font-semibold text-primary"
              >
                {category.label}
              </h2>
              <ul className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
                {category.items.map((item) => {
                  const isOpen = openId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenId(isOpen ? null : item.id)
                        }
                      >
                        <span className="text-sm font-medium text-content sm:text-base">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={`mt-0.5 h-5 w-5 shrink-0 text-content/50 transition ${
                            isOpen ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </button>
                      {isOpen ? (
                        <div className="border-t border-slate-100 px-5 pb-5 pt-2 text-sm leading-relaxed text-content/80">
                          {item.answer}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      <section className="mt-14 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-8 text-center sm:px-8">
        <h2 className="text-xl font-bold text-primary">Still have questions?</h2>
        <p className="mt-2 text-sm leading-relaxed text-content/75">
          Our support team can help with bookings, refunds, and account issues.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <OpenTawkChatButton>Chat with support</OpenTawkChatButton>
          <a
            href={`mailto:${SITE_EMAILS.support}`}
            className="text-sm font-medium text-secondary hover:underline"
          >
            {SITE_EMAILS.support}
          </a>
        </div>
      </section>
    </div>
  );
}
