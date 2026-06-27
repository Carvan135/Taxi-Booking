"use client";

import { Loader2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { BOOK_TRIP_INPUT_CLASS } from "@/components/booking/booking-form-styles";
import {
  autocomplete,
  getPlaceDetails,
  type GeoPlace,
  type PlaceSuggestion,
} from "@/lib/maps/geoapify-client";

const DEBOUNCE_MS = 400;

type AddressAutocompleteInputProps = {
  id: string;
  label: React.ReactNode;
  placeholder: string;
  value: string;
  selectedPlace: GeoPlace | null;
  onValueChange: (value: string) => void;
  onPlaceSelect: (place: GeoPlace | null) => void;
  error?: string;
  disabled?: boolean;
};

function createSessionToken(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AddressAutocompleteInput({
  id,
  label,
  placeholder,
  value,
  selectedPlace,
  onValueChange,
  onPlaceSelect,
  error,
  disabled = false,
}: AddressAutocompleteInputProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionTokenRef = useRef<string>(createSessionToken());
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = createSessionToken();
  }, []);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    if (selectedPlace && selectedPlace.label === query) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    const timer = window.setTimeout(() => {
      void autocomplete(query, sessionTokenRef.current)
        .then((results) => {
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setActiveIndex(-1);
        })
        .catch(() => {
          setSuggestions([]);
          setIsOpen(false);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, selectedPlace]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handleSelect = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setResolveError(null);
      setIsResolving(true);
      setIsOpen(false);

      try {
        const place = await getPlaceDetails(
          suggestion.placeId,
          sessionTokenRef.current,
        );
        resetSession();

        if (!place) {
          setResolveError("Could not load that address. Try another suggestion.");
          return;
        }

        onValueChange(place.label);
        onPlaceSelect(place);
        setSuggestions([]);
      } catch {
        setResolveError("Could not load that address. Try again.");
      } finally {
        setIsResolving(false);
      }
    },
    [onPlaceSelect, onValueChange, resetSession],
  );

  const handleInputChange = (next: string) => {
    onValueChange(next);
    setResolveError(null);
    if (selectedPlace && next !== selectedPlace.label) {
      onPlaceSelect(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      void handleSelect(suggestions[activeIndex]!);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  };

  const displayError = error ?? resolveError ?? undefined;
  const showSpinner = isLoading || isResolving;

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-content">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          value={value}
          disabled={disabled || isResolving}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={displayError ? "true" : "false"}
          className={BOOK_TRIP_INPUT_CLASS}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
        {showSpinner ? (
          <Loader2
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-content/40"
            aria-hidden
          />
        ) : null}
      </div>

      {isOpen && suggestions.length > 0 ? (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <ul id={listId} role="listbox" className="max-h-56 overflow-auto py-1">
            {suggestions.map((suggestion, index) => (
              <li
                key={`${suggestion.placeId}-${index}`}
                role="option"
                aria-selected={index === activeIndex}
              >
                <button
                  type="button"
                  className={`flex w-full flex-col px-3 py-2.5 text-left text-sm transition hover:bg-sky-50 ${
                    index === activeIndex ? "bg-sky-50" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void handleSelect(suggestion)}
                >
                  <span className="font-medium text-content">{suggestion.label}</span>
                  {suggestion.isAirport ? (
                    <span className="mt-0.5 text-xs font-medium text-secondary">Airport</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400">
            Powered by Google
          </p>
        </div>
      ) : null}

      {displayError ? (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {displayError}
        </p>
      ) : null}
    </div>
  );
}
