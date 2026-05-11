"use client";

import type { ReactNode } from "react";
import {
  Calendar,
  Clock,
  Luggage,
  MapPin,
  Plus,
  Users,
} from "lucide-react";
import type { TripDraft } from "@/components/booking/types";

/** Shared with hero + full booking flow — matches app form styling */
export const BOOK_TRIP_INPUT_CLASS =
  "mt-1.5 w-full rounded-xl border border-gray-300 bg-slate-50 px-3 py-2.5 text-sm text-content shadow-sm placeholder:text-slate-400 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-blue-500/40";

export const BOOK_TRIP_PRIMARY_ACTION_CLASS =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground shadow-md shadow-secondary/20 transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2";

export type BookTripDetailsFieldsProps = {
  /** Prefix for input ids, e.g. `hero` or `book` */
  idPrefix: string;
  value: TripDraft;
  onChange: (patch: Partial<TripDraft>) => void;
  /** Hero: from/to side‑by‑side on large screens */
  twoColumnFromTo?: boolean;
  tripToggleSize?: "default" | "compact";
  dateLabel: string;
  timeLabel: string;
  error?: string | null;
  /** CTA: `<Link>` or `<button type="button">` */
  action: ReactNode;
  /** Margin wrapper around one-way / return control */
  tripToggleWrapperClassName?: string;
  /** Top margin before from/to (and rest of fields) */
  fieldsWrapperClassName?: string;
};

export function BookTripDetailsFields({
  idPrefix,
  value,
  onChange,
  twoColumnFromTo = false,
  tripToggleSize = "compact",
  dateLabel,
  timeLabel,
  error,
  action,
  tripToggleWrapperClassName = "",
  fieldsWrapperClassName = "mt-5",
}: BookTripDetailsFieldsProps) {
  const tripToggleContainer =
    tripToggleSize === "default"
      ? "inline-flex rounded-full border border-slate-200 bg-slate-50 p-1"
      : "inline-flex rounded-full border border-slate-200 bg-slate-50 p-0.5";

  const tripToggleBtn =
    tripToggleSize === "default"
      ? "rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:px-5"
      : "rounded-full px-4 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 sm:px-5 sm:text-sm";

  const fromToRowClass = twoColumnFromTo
    ? "grid gap-4 sm:gap-5 lg:grid-cols-2"
    : "space-y-3.5 sm:space-y-4";

  const fromField = (
    <div>
      <label
        htmlFor={`${idPrefix}-from`}
        className="flex items-center gap-2 text-sm font-medium text-content"
      >
        <MapPin className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
        From (postcode or place)
      </label>
      <input
        id={`${idPrefix}-from`}
        value={value.from}
        onChange={(e) => onChange({ from: e.target.value })}
        type="text"
        placeholder="e.g. SW1A 1AA or Heathrow Airport"
        autoComplete="street-address"
        className={BOOK_TRIP_INPUT_CLASS}
      />
    </div>
  );

  const toField = (
    <div>
      <label
        htmlFor={`${idPrefix}-to`}
        className="flex items-center gap-2 text-sm font-medium text-content"
      >
        <MapPin className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
        To (postcode or place)
      </label>
      <input
        id={`${idPrefix}-to`}
        value={value.to}
        onChange={(e) => onChange({ to: e.target.value })}
        type="text"
        placeholder="e.g. EC1A 1BB or London City Airport"
        autoComplete="street-address"
        className={BOOK_TRIP_INPUT_CLASS}
      />
    </div>
  );

  const gapAfterFromTo = twoColumnFromTo ? "mt-4" : "mt-3.5 sm:mt-4";
  const dateGridGap = twoColumnFromTo
    ? "mt-4 grid gap-4 sm:grid-cols-2 lg:gap-5"
    : "mt-3 grid gap-3 sm:grid-cols-2 sm:gap-4";

  return (
    <>
      <div className={tripToggleWrapperClassName}>
        <div className={tripToggleContainer} role="group" aria-label="Trip type">
          <button
            type="button"
            onClick={() => onChange({ tripType: "one-way" })}
            className={`${tripToggleBtn} ${
              value.tripType === "one-way"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-700 hover:bg-white"
            }`}
          >
            One-way
          </button>
          <button
            type="button"
            onClick={() => onChange({ tripType: "return" })}
            className={`${tripToggleBtn} ${
              value.tripType === "return"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-700 hover:bg-white"
            }`}
          >
            Return
          </button>
        </div>
      </div>

      {error ? (
        <p
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className={fieldsWrapperClassName}>
        <div className={fromToRowClass}>
          {fromField}
          {toField}
        </div>

        <div className={gapAfterFromTo}>
          <label
            htmlFor={`${idPrefix}-via`}
            className="flex items-center gap-2 text-sm font-medium text-content"
          >
            <Plus className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
            Via (optional)
          </label>
          <input
            id={`${idPrefix}-via`}
            value={value.via}
            onChange={(e) => onChange({ via: e.target.value })}
            type="text"
            placeholder="Add a stop along the way"
            className={BOOK_TRIP_INPUT_CLASS}
          />
        </div>

        <div className={dateGridGap}>
          <div>
            <label
              htmlFor={`${idPrefix}-date`}
              className="flex items-center gap-2 text-sm font-medium text-content"
            >
              <Calendar className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              {dateLabel}
            </label>
            <input
              id={`${idPrefix}-date`}
              value={value.date}
              onChange={(e) => onChange({ date: e.target.value })}
              type="date"
              className={BOOK_TRIP_INPUT_CLASS}
            />
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-time`}
              className="flex items-center gap-2 text-sm font-medium text-content"
            >
              <Clock className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              {timeLabel}
            </label>
            <input
              id={`${idPrefix}-time`}
              value={value.time}
              onChange={(e) => onChange({ time: e.target.value })}
              type="time"
              className={BOOK_TRIP_INPUT_CLASS}
            />
          </div>
        </div>

        <div className={dateGridGap}>
          <div>
            <label
              htmlFor={`${idPrefix}-passengers`}
              className="flex items-center gap-2 text-sm font-medium text-content"
            >
              <Users className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              Passengers
            </label>
            <select
              id={`${idPrefix}-passengers`}
              value={value.passengers}
              onChange={(e) =>
                onChange({ passengers: Number(e.target.value) })
              }
              className={BOOK_TRIP_INPUT_CLASS}
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "passenger" : "passengers"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor={`${idPrefix}-luggage`}
              className="flex items-center gap-2 text-sm font-medium text-content"
            >
              <Luggage className="h-4 w-4 shrink-0 text-secondary" aria-hidden />
              Luggage
            </label>
            <select
              id={`${idPrefix}-luggage`}
              value={value.luggage}
              onChange={(e) => onChange({ luggage: Number(e.target.value) })}
              className={BOOK_TRIP_INPUT_CLASS}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n === 0
                    ? "No bags"
                    : `${n} ${n === 1 ? "bag" : "bags"}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6">{action}</div>
    </>
  );
}
