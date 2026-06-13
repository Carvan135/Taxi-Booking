"use client";

import { ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { OpenTawkChatButton } from "@/components/chat/OpenTawkChatButton";
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
        question: "How do I book a ride?",
        answer: "[CONTENT]",
      },
      {
        id: "booking-2",
        question: "Can I book a return trip?",
        answer: "[CONTENT]",
      },
      {
        id: "booking-3",
        question: "Can I book for someone else?",
        answer: "[CONTENT]",
      },
    ],
  },
  {
    id: "payment",
    label: "Payment",
    items: [
      {
        id: "payment-1",
        question: "How do I pay for my booking?",
        answer: "[CONTENT]",
      },
      {
        id: "payment-2",
        question: "When am I charged?",
        answer: "[CONTENT]",
      },
      {
        id: "payment-3",
        question: "Is my payment secure?",
        answer: "[CONTENT]",
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
        answer: "[CONTENT]",
      },
      {
        id: "operators-2",
        question: "Can I choose my operator?",
        answer: "[CONTENT]",
      },
      {
        id: "operators-3",
        question: "What if my operator is late?",
        answer: "[CONTENT]",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      {
        id: "account-1",
        question: "Do I need an account to book?",
        answer: "[CONTENT]",
      },
      {
        id: "account-2",
        question: "How do I reset my password?",
        answer: "[CONTENT]",
      },
      {
        id: "account-3",
        question: "Where can I view my bookings?",
        answer: "[CONTENT]",
      },
    ],
  },
  {
    id: "refunds",
    label: "Refunds",
    items: [
      {
        id: "refunds-1",
        question: "When can I cancel for a full refund?",
        answer: "[CONTENT]",
      },
      {
        id: "refunds-2",
        question: "How long do refunds take?",
        answer: "[CONTENT]",
      },
      {
        id: "refunds-3",
        question: "What if I cancel inside the cutoff window?",
        answer: "[CONTENT]",
      },
    ],
  },
];

function matchesQuery(item: FaqItem, query: string): boolean {
  const haystack = `${item.question} ${item.answer}`.toLowerCase();
  return haystack.includes(query);
}

export function FaqPageClient({ cutoffHours }: { cutoffHours: number }) {
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
