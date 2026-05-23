"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { shouldConfirmEarlyStartJourney } from "@/components/operator/StartJourneyConfirmModal";
import type { Booking } from "@/types";

type StartJourneyBooking = Pick<
  Booking,
  "id" | "reference" | "pickup_date" | "pickup_time"
>;

type StartJourneyActionOptions = {
  onSuccess?: () => void | Promise<void>;
  onError?: (message: string) => void;
};

export function useStartJourneyAction(options?: StartJourneyActionOptions) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [earlyStartBooking, setEarlyStartBooking] = useState<Booking | null>(
    null,
  );
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const executeStart = useCallback(async (bookingId: string) => {
    setBusyId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/start-journey`, {
        method: "POST",
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not start journey");
      await optionsRef.current?.onSuccess?.();
      return { ok: true as const };
    } catch (e) {
      const error = e instanceof Error ? e.message : "Could not start journey";
      optionsRef.current?.onError?.(error);
      return { ok: false as const, error };
    } finally {
      setBusyId(null);
    }
  }, []);

  const requestStart = useCallback(
    (booking: StartJourneyBooking & Partial<Booking>) => {
      if (shouldConfirmEarlyStartJourney(booking)) {
        setEarlyStartBooking(booking as Booking);
        return;
      }
      void executeStart(booking.id);
    },
    [executeStart],
  );

  const confirmEarlyStart = useCallback(async () => {
    if (!earlyStartBooking) return { ok: false as const, error: "No booking" };
    const result = await executeStart(earlyStartBooking.id);
    if (result.ok) setEarlyStartBooking(null);
    return result;
  }, [earlyStartBooking, executeStart]);

  const closeEarlyStartModal = useCallback(() => {
    if (!busyId) setEarlyStartBooking(null);
  }, [busyId]);

  return {
    busyId,
    earlyStartBooking,
    requestStart,
    confirmEarlyStart,
    closeEarlyStartModal,
    isEarlyStartModalOpen: earlyStartBooking !== null,
  };
}
