"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Settings } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { AdminPolicyDocumentsCard } from "@/components/admin/AdminPolicyDocumentsCard";
import { BOOK_TRIP_INPUT_CLASS } from "@/components/booking/booking-form-styles";
import { Button } from "@/components/ui/Button";
import {
  usePlatformSettings,
  useUpdatePlatformSetting,
} from "@/hooks/queries/usePlatformSettings";
import {
  cancellationSettingsSchema,
  commissionSettingsSchema,
  completionSettingsSchema,
  payoutSettingsSchema,
  smsSettingsSchema,
  type CancellationSettingsFormInput,
  type CommissionSettingsFormInput,
  type CompletionSettingsFormInput,
  type PayoutSettingsFormInput,
  type SmsSettingsFormInput,
} from "@/lib/validations";
import type { PlatformSetting } from "@/types";

const KEYS = {
  commission: "commission_percentage",
  payoutDelay: "payout_delay_hours",
  payoutEarly: "payout_early_release_enabled",
  autoCompleteHours: "auto_complete_hours",
  autoCompleteWarningHours: "auto_complete_warning_hours",
  cancellationCutoff: "cancellation_cutoff_hours",
  cancellationFullRefund: "cancellation_full_refund_hours",
  partialRefund: "partial_refund_enabled",
  smsEnabled: "sms_reminders_enabled",
  smsHoursBefore: "sms_reminder_hours_before",
} as const;

const DEFAULTS = {
  commission: 15,
  payoutDelay: 48,
  payoutEarly: true,
  autoCompleteHours: 24,
  autoCompleteWarningHours: 2,
  cancellationCutoff: 24,
  cancellationFullRefund: 24,
  partialRefund: true,
  smsEnabled: true,
  smsHoursBefore: 2,
} as const;

function settingsByKey(rows: PlatformSetting[]): Record<string, string> {
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function parseCommission(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 50 ? n : DEFAULTS.commission;
}

function parsePayoutDelay(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 168
    ? Math.round(n)
    : DEFAULTS.payoutDelay;
}

function parseEarlyRelease(value: string | undefined): boolean {
  if (value === undefined) return DEFAULTS.payoutEarly;
  return value === "true";
}

function parseAutoCompleteHours(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 168
    ? Math.round(n)
    : DEFAULTS.autoCompleteHours;
}

function parseAutoCompleteWarningHours(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 72
    ? Math.round(n)
    : DEFAULTS.autoCompleteWarningHours;
}

function parseCancellationHours(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 168
    ? Math.round(n)
    : fallback;
}

function parseSmsHoursBefore(value: string | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 && n <= 24
    ? Math.round(n)
    : DEFAULTS.smsHoursBefore;
}

function parseSmsEnabled(value: string | undefined): boolean {
  if (value === undefined) return DEFAULTS.smsEnabled;
  return value === "true";
}

function commissionPreviewText(percent: number): string {
  const platform = (100 * percent) / 100;
  const operator = 100 - platform;
  return `Current: ${percent}% — on a £100 booking, platform earns £${platform.toFixed(0)}, operator receives £${operator.toFixed(0)}`;
}

export function AdminSettingsPage() {
  const { data: rows = [], isLoading, isError, error } = usePlatformSettings();
  const updateSetting = useUpdatePlatformSetting();
  const [toast, setToast] = useState<string | null>(null);
  const [commissionSaving, setCommissionSaving] = useState(false);
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [cancellationSaving, setCancellationSaving] = useState(false);
  const [smsSaving, setSmsSaving] = useState(false);

  const map = useMemo(() => settingsByKey(rows), [rows]);
  const savedCommission = parseCommission(map[KEYS.commission]);
  const savedPayoutDelay = parsePayoutDelay(map[KEYS.payoutDelay]);
  const savedPayoutEarly = parseEarlyRelease(map[KEYS.payoutEarly]);

  const commissionForm = useForm<CommissionSettingsFormInput>({
    resolver: zodResolver(commissionSettingsSchema),
    defaultValues: { commission_percentage: DEFAULTS.commission },
  });

  const payoutForm = useForm<PayoutSettingsFormInput>({
    resolver: zodResolver(payoutSettingsSchema),
    defaultValues: {
      payout_delay_hours: DEFAULTS.payoutDelay,
      payout_early_release_enabled: DEFAULTS.payoutEarly,
    },
  });

  const completionForm = useForm<CompletionSettingsFormInput>({
    resolver: zodResolver(completionSettingsSchema),
    defaultValues: {
      auto_complete_hours: DEFAULTS.autoCompleteHours,
      auto_complete_warning_hours: DEFAULTS.autoCompleteWarningHours,
    },
  });

  const cancellationForm = useForm<CancellationSettingsFormInput>({
    resolver: zodResolver(cancellationSettingsSchema),
    defaultValues: {
      cancellation_cutoff_hours: DEFAULTS.cancellationCutoff,
      cancellation_full_refund_hours: DEFAULTS.cancellationFullRefund,
      partial_refund_enabled: DEFAULTS.partialRefund,
    },
  });

  const smsForm = useForm<SmsSettingsFormInput>({
    resolver: zodResolver(smsSettingsSchema),
    defaultValues: {
      sms_reminder_hours_before: DEFAULTS.smsHoursBefore,
      sms_reminders_enabled: DEFAULTS.smsEnabled,
    },
  });

  useEffect(() => {
    if (rows.length === 0) return;
    commissionForm.reset({
      commission_percentage: savedCommission,
    });
    payoutForm.reset({
      payout_delay_hours: savedPayoutDelay,
      payout_early_release_enabled: savedPayoutEarly,
    });
    completionForm.reset({
      auto_complete_hours: parseAutoCompleteHours(map[KEYS.autoCompleteHours]),
      auto_complete_warning_hours: parseAutoCompleteWarningHours(
        map[KEYS.autoCompleteWarningHours],
      ),
    });
    cancellationForm.reset({
      cancellation_cutoff_hours: parseCancellationHours(
        map[KEYS.cancellationCutoff],
        DEFAULTS.cancellationCutoff,
      ),
      cancellation_full_refund_hours: parseCancellationHours(
        map[KEYS.cancellationFullRefund],
        DEFAULTS.cancellationFullRefund,
      ),
      partial_refund_enabled:
        map[KEYS.partialRefund] === undefined
          ? DEFAULTS.partialRefund
          : map[KEYS.partialRefund] === "true",
    });
    smsForm.reset({
      sms_reminder_hours_before: parseSmsHoursBefore(map[KEYS.smsHoursBefore]),
      sms_reminders_enabled: parseSmsEnabled(map[KEYS.smsEnabled]),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when DB values load
  }, [rows.length, savedCommission, savedPayoutDelay, savedPayoutEarly]);

  const watchedCommission = commissionForm.watch("commission_percentage");
  const previewPercent = useMemo(() => {
    const n = Number(watchedCommission);
    if (!Number.isFinite(n)) return savedCommission;
    return Math.min(50, Math.max(1, n));
  }, [watchedCommission, savedCommission]);

  const watchedPayoutDelay = payoutForm.watch("payout_delay_hours");

  function showSuccess(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3200);
  }

  const onSaveCommission = commissionForm.handleSubmit(async (values) => {
    setCommissionSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: KEYS.commission,
        value: String(values.commission_percentage),
      });
      showSuccess("Commission settings saved.");
    } catch (e) {
      commissionForm.setError("root", {
        message:
          e instanceof Error ? e.message : "Could not save commission settings.",
      });
    } finally {
      setCommissionSaving(false);
    }
  });

  const onSaveCompletion = completionForm.handleSubmit(async (values) => {
    setCompletionSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: KEYS.autoCompleteHours,
        value: String(values.auto_complete_hours),
      });
      await updateSetting.mutateAsync({
        key: KEYS.autoCompleteWarningHours,
        value: String(values.auto_complete_warning_hours),
      });
      showSuccess("Booking completion settings saved.");
    } catch (e) {
      completionForm.setError("root", {
        message:
          e instanceof Error
            ? e.message
            : "Could not save completion settings.",
      });
    } finally {
      setCompletionSaving(false);
    }
  });

  const onSaveCancellation = cancellationForm.handleSubmit(async (values) => {
    setCancellationSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: KEYS.cancellationCutoff,
        value: String(values.cancellation_cutoff_hours),
      });
      await updateSetting.mutateAsync({
        key: KEYS.cancellationFullRefund,
        value: String(values.cancellation_full_refund_hours),
      });
      await updateSetting.mutateAsync({
        key: KEYS.partialRefund,
        value: values.partial_refund_enabled ? "true" : "false",
      });
      showSuccess("Cancellation policy saved.");
    } catch (e) {
      cancellationForm.setError("root", {
        message:
          e instanceof Error
            ? e.message
            : "Could not save cancellation settings.",
      });
    } finally {
      setCancellationSaving(false);
    }
  });

  const onSavePayout = payoutForm.handleSubmit(async (values) => {
    setPayoutSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: KEYS.payoutDelay,
        value: String(values.payout_delay_hours),
      });
      await updateSetting.mutateAsync({
        key: KEYS.payoutEarly,
        value: values.payout_early_release_enabled ? "true" : "false",
      });
      showSuccess("Payout settings saved.");
    } catch (e) {
      payoutForm.setError("root", {
        message:
          e instanceof Error ? e.message : "Could not save payout settings.",
      });
    } finally {
      setPayoutSaving(false);
    }
  });

  const onSaveSms = smsForm.handleSubmit(async (values) => {
    setSmsSaving(true);
    try {
      await updateSetting.mutateAsync({
        key: KEYS.smsEnabled,
        value: values.sms_reminders_enabled ? "true" : "false",
      });
      await updateSetting.mutateAsync({
        key: KEYS.smsHoursBefore,
        value: String(values.sms_reminder_hours_before),
      });
      showSuccess("SMS reminder settings saved.");
    } catch (e) {
      smsForm.setError("root", {
        message:
          e instanceof Error ? e.message : "Could not save SMS settings.",
      });
    } finally {
      setSmsSaving(false);
    }
  });

  return (
    <div className="min-h-full bg-[#F9FAFB] px-4 py-8 sm:px-6 lg:px-8">
      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}

      <div className="mx-auto max-w-3xl">
        <header className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-secondary">
            <Settings className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
              Platform Settings
            </h1>
            <p className="mt-1 text-sm text-[#6B7280]">
              Commission, payouts, completion, cancellation, SMS, and policy PDFs
            </p>
          </div>
        </header>

        {isLoading ? (
          <p className="mt-10 flex items-center gap-2 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading settings…
          </p>
        ) : null}

        {isError ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error?.message ?? "Could not load platform settings."}
          </p>
        ) : null}

        {!isLoading && !isError ? (
          <div className="mt-8 space-y-6">
            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Commission Settings
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                This percentage is deducted from every booking as platform
                revenue
              </p>

              <form
                onSubmit={onSaveCommission}
                className="mt-5 space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="commission_percentage"
                    className="text-sm font-medium text-[#111827]"
                  >
                    Commission percentage
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      id="commission_percentage"
                      type="number"
                      min={1}
                      max={50}
                      step={0.5}
                      className={`${BOOK_TRIP_INPUT_CLASS} max-w-[140px] mt-0`}
                      {...commissionForm.register("commission_percentage", {
                        valueAsNumber: true,
                      })}
                    />
                    <span className="text-sm font-medium text-[#6B7280]">%</span>
                  </div>
                  {commissionForm.formState.errors.commission_percentage
                    ?.message ? (
                    <p className="mt-1.5 text-sm text-red-600" role="alert">
                      {
                        commissionForm.formState.errors.commission_percentage
                          .message
                      }
                    </p>
                  ) : null}
                </div>

                <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-950 ring-1 ring-sky-100">
                  {commissionPreviewText(previewPercent)}
                </p>

                {commissionForm.formState.errors.root?.message ? (
                  <p className="text-sm text-red-600" role="alert">
                    {commissionForm.formState.errors.root.message}
                  </p>
                ) : null}

                <Button type="submit" loading={commissionSaving}>
                  Save commission
                </Button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Payout Settings
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Payouts are released to operators{" "}
                {Number.isFinite(Number(watchedPayoutDelay))
                  ? Number(watchedPayoutDelay)
                  : savedPayoutDelay}{" "}
                hours after booking completion
              </p>

              <form
                onSubmit={onSavePayout}
                className="mt-5 space-y-5"
                noValidate
              >
                <div>
                  <label
                    htmlFor="payout_delay_hours"
                    className="text-sm font-medium text-[#111827]"
                  >
                    Payout delay (hours)
                  </label>
                  <input
                    id="payout_delay_hours"
                    type="number"
                    min={1}
                    max={168}
                    step={1}
                    className={`${BOOK_TRIP_INPUT_CLASS} max-w-[160px]`}
                    {...payoutForm.register("payout_delay_hours", {
                      valueAsNumber: true,
                    })}
                  />
                  {payoutForm.formState.errors.payout_delay_hours?.message ? (
                    <p className="mt-1.5 text-sm text-red-600" role="alert">
                      {payoutForm.formState.errors.payout_delay_hours.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">
                      Payout early release
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      Allow admins to release operator payouts before the delay
                      period ends
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      {...payoutForm.register("payout_early_release_enabled")}
                    />
                    <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                  </label>
                </div>

                {payoutForm.formState.errors.root?.message ? (
                  <p className="text-sm text-red-600" role="alert">
                    {payoutForm.formState.errors.root.message}
                  </p>
                ) : null}

                <Button type="submit" loading={payoutSaving}>
                  Save payout settings
                </Button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Booking completion
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Model B: operator marks delivered, customer confirms or auto-completes
              </p>

              <form
                onSubmit={onSaveCompletion}
                className="mt-5 space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="auto_complete_hours"
                    className="text-sm font-medium text-[#111827]"
                  >
                    Auto-complete timer (hours)
                  </label>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    How long after the operator marks complete before
                    auto-completion runs
                  </p>
                  <input
                    id="auto_complete_hours"
                    type="number"
                    min={1}
                    max={168}
                    className={`${BOOK_TRIP_INPUT_CLASS} max-w-[160px] mt-1.5`}
                    {...completionForm.register("auto_complete_hours", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div>
                  <label
                    htmlFor="auto_complete_warning_hours"
                    className="text-sm font-medium text-[#111827]"
                  >
                    Warning notification (hours before)
                  </label>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    Customer receives a warning this many hours before
                    auto-completion
                  </p>
                  <input
                    id="auto_complete_warning_hours"
                    type="number"
                    min={1}
                    max={72}
                    className={`${BOOK_TRIP_INPUT_CLASS} max-w-[160px] mt-1.5`}
                    {...completionForm.register("auto_complete_warning_hours", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                {completionForm.formState.errors.root?.message ? (
                  <p className="text-sm text-red-600" role="alert">
                    {completionForm.formState.errors.root.message}
                  </p>
                ) : null}
                <Button type="submit" loading={completionSaving}>
                  Save completion settings
                </Button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                Cancellation & refunds
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Shown to customers when they cancel and used by admins when
                resolving disputes
              </p>

              <form
                onSubmit={onSaveCancellation}
                className="mt-5 space-y-4"
                noValidate
              >
                <div>
                  <label
                    htmlFor="cancellation_cutoff_hours"
                    className="text-sm font-medium text-[#111827]"
                  >
                    Cancellation cutoff (hours before pickup)
                  </label>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    Customers cannot cancel online inside this window
                  </p>
                  <input
                    id="cancellation_cutoff_hours"
                    type="number"
                    min={1}
                    max={168}
                    className={`${BOOK_TRIP_INPUT_CLASS} max-w-[160px] mt-1.5`}
                    {...cancellationForm.register("cancellation_cutoff_hours", {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <div>
                  <label
                    htmlFor="cancellation_full_refund_hours"
                    className="text-sm font-medium text-[#111827]"
                  >
                    Full refund window (hours before pickup)
                  </label>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    Pickups further out than this qualify for a full refund
                    message
                  </p>
                  <input
                    id="cancellation_full_refund_hours"
                    type="number"
                    min={1}
                    max={168}
                    className={`${BOOK_TRIP_INPUT_CLASS} max-w-[160px] mt-1.5`}
                    {...cancellationForm.register(
                      "cancellation_full_refund_hours",
                      { valueAsNumber: true },
                    )}
                  />
                </div>
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">
                      Partial refunds on disputes
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      Admins can record partial refunds when resolving disputes
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      {...cancellationForm.register("partial_refund_enabled")}
                    />
                    <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                  </label>
                </div>
                {cancellationForm.formState.errors.root?.message ? (
                  <p className="text-sm text-red-600" role="alert">
                    {cancellationForm.formState.errors.root.message}
                  </p>
                ) : null}
                <Button type="submit" loading={cancellationSaving}>
                  Save cancellation policy
                </Button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#111827]">
                SMS reminders
              </h2>
              <p className="mt-1 text-sm text-[#6B7280]">
                Text customers before pickup using their booking phone number
              </p>

              <form
                onSubmit={onSaveSms}
                className="mt-5 space-y-4"
                noValidate
              >
                <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#111827]">
                      Enable SMS reminders
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B7280]">
                      Sends one reminder per confirmed booking leg
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      {...smsForm.register("sms_reminders_enabled")}
                    />
                    <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-secondary peer-focus-visible:ring-2 peer-focus-visible:ring-secondary peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5" />
                  </label>
                </div>

                <div>
                  <label
                    htmlFor="sms_reminder_hours_before"
                    className="text-sm font-medium text-[#111827]"
                  >
                    Hours before pickup
                  </label>
                  <p className="mt-0.5 text-xs text-[#6B7280]">
                    Customers will receive a text reminder this many hours
                    before their scheduled pickup time
                  </p>
                  <input
                    id="sms_reminder_hours_before"
                    type="number"
                    min={1}
                    max={24}
                    step={1}
                    className={`${BOOK_TRIP_INPUT_CLASS} max-w-[160px] mt-1.5`}
                    {...smsForm.register("sms_reminder_hours_before", {
                      valueAsNumber: true,
                    })}
                  />
                  {smsForm.formState.errors.sms_reminder_hours_before?.message ? (
                    <p className="mt-1.5 text-sm text-red-600" role="alert">
                      {smsForm.formState.errors.sms_reminder_hours_before.message}
                    </p>
                  ) : null}
                </div>

                {smsForm.formState.errors.root?.message ? (
                  <p className="text-sm text-red-600" role="alert">
                    {smsForm.formState.errors.root.message}
                  </p>
                ) : null}

                <Button type="submit" loading={smsSaving}>
                  Save SMS settings
                </Button>
              </form>
            </section>

            <AdminPolicyDocumentsCard onToast={showSuccess} />

            <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              Policy changes apply immediately to new cancellation checks.
              Commission and payout rules apply to new bookings.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
