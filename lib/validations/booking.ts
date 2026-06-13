import { z } from "zod";
import { isUkPhoneNumber } from "./auth";
import { MAX_BOOKING_LUGGAGE } from "@/lib/booking/luggage-display";
import { RULE_TYPES, SERVICE_TYPES } from "./enums";

const TIME_HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isTodayOrFutureDate(value: string): boolean {
  const parsed = parseCalendarDate(value);
  if (!parsed) return false;
  return parsed >= startOfToday();
}

function isSameDayOrAfter(pickupDate: string, returnDate: string): boolean {
  const pickup = parseCalendarDate(pickupDate);
  const returnDay = parseCalendarDate(returnDate);
  if (!pickup || !returnDay) return false;
  return returnDay >= pickup;
}

const pickupDateSchema = z
  .string()
  .min(1, "Pickup date is required")
  .refine(isTodayOrFutureDate, "Pickup date must be today or a future date");

const pickupTimeSchema = z
  .string()
  .min(1, "Pickup time is required")
  .regex(TIME_HH_MM_REGEX, "Enter a valid time (HH:MM)");

export const oneWayBookingSchema = z.object({
  pickup_address: z.string().min(3, "Pickup address must be at least 3 characters"),
  dropoff_address: z
    .string()
    .min(3, "Dropoff address must be at least 3 characters"),
  pickup_date: pickupDateSchema,
  pickup_time: pickupTimeSchema,
  passengers: z.coerce
    .number()
    .int("Passengers must be a whole number")
    .min(1, "At least 1 passenger")
    .max(16, "Maximum 16 passengers"),
  service_type: z.enum(SERVICE_TYPES),
  luggage: z.coerce
    .number()
    .int("Luggage must be a whole number")
    .min(0, "Luggage cannot be negative")
    .max(MAX_BOOKING_LUGGAGE, `Maximum ${MAX_BOOKING_LUGGAGE} pieces`),
  notes: z
    .string()
    .max(500, "Notes must be 500 characters or fewer")
    .optional(),
});

export const returnBookingSchema = oneWayBookingSchema
  .extend({
    return_date: z
      .string()
      .min(1, "Return date is required")
      .refine(
        (value) => parseCalendarDate(value) !== null,
        "Enter a valid return date",
      ),
    return_time: z
      .string()
      .min(1, "Return time is required")
      .regex(TIME_HH_MM_REGEX, "Enter a valid time (HH:MM)"),
  })
  .refine(
    (data) => isSameDayOrAfter(data.pickup_date, data.return_date),
    {
      message: "Return date must be on or after the pickup date",
      path: ["return_date"],
    },
  );

export const guestDetailsSchema = z.object({
  customer_name: z
    .string()
    .min(2, "Name must be at least 2 characters"),
  customer_email: z.email({ message: "Enter a valid email address" }),
  customer_phone: z
    .string()
    .min(1, "Phone number is required")
    .refine(isUkPhoneNumber, "Enter a valid UK phone number"),
});

export const priceRuleSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().optional(),
    rule_type: z.enum(RULE_TYPES),
    value: z.coerce.number().positive("Value must be greater than zero"),
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.rule_type === "multiplier") {
      if (data.value < 1.0) {
        ctx.addIssue({
          code: "custom",
          message: "Multiplier must be at least 1.0",
          path: ["value"],
        });
      }
      if (data.value > 5.0) {
        ctx.addIssue({
          code: "custom",
          message: "Multiplier cannot exceed 5.0",
          path: ["value"],
        });
      }
      return;
    }
    if (data.value < 0.01) {
      ctx.addIssue({
        code: "custom",
        message: "Fixed fee must be at least 0.01",
        path: ["value"],
      });
    }
  });

export const basePricingSchema = z.object({
  base_fare: z.coerce.number().min(0.01, "Base fare must be at least 0.01"),
  per_mile: z.coerce.number().min(0.01, "Per mile rate must be at least 0.01"),
  per_minute: z.coerce
    .number()
    .min(0.01, "Per minute rate must be at least 0.01"),
  minimum_fare: z.coerce
    .number()
    .min(0.01, "Minimum fare must be at least 0.01"),
});

export const predefinedPriceRuleSchema = z
  .object({
    rule_key: z.string().min(1),
    value: z.coerce.number().positive("Value must be greater than zero"),
    is_active: z.boolean().default(false),
    time_start: z.string().optional(),
    time_end: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.rule_key === "out_of_hours" && data.is_active) {
      if (!data.time_start?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Start time is required",
          path: ["time_start"],
        });
      }
      if (!data.time_end?.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "End time is required",
          path: ["time_end"],
        });
      }
    }

    const isMultiplier =
      data.rule_key === "out_of_hours" || data.rule_key === "weekend";
    if (isMultiplier) {
      if (data.value < 1.0) {
        ctx.addIssue({
          code: "custom",
          message: "Multiplier must be at least 1.0",
          path: ["value"],
        });
      }
      if (data.value > 5.0) {
        ctx.addIssue({
          code: "custom",
          message: "Multiplier cannot exceed 5.0",
          path: ["value"],
        });
      }
    } else if (data.value < 0.01) {
      ctx.addIssue({
        code: "custom",
        message: "Fixed fee must be at least 0.01",
        path: ["value"],
      });
    }
  });

export const platformSettingsSchema = z.object({
  commission_percentage: z.coerce
    .number()
    .min(1, "Commission must be at least 1%")
    .max(50, "Commission cannot exceed 50%"),
  payout_delay_hours: z.coerce
    .number()
    .int("Payout delay must be a whole number of hours")
    .min(1, "Payout delay must be at least 1 hour")
    .max(168, "Payout delay cannot exceed 168 hours (1 week)"),
  payout_early_release_enabled: z.boolean(),
  auto_complete_hours: z.coerce
    .number()
    .int()
    .min(1, "Must be at least 1 hour")
    .max(168, "Cannot exceed 168 hours"),
  auto_complete_warning_hours: z.coerce
    .number()
    .int()
    .min(1, "Must be at least 1 hour")
    .max(72, "Cannot exceed 72 hours"),
  cancellation_cutoff_hours: z.coerce
    .number()
    .int()
    .min(1, "Must be at least 1 hour")
    .max(168, "Cannot exceed 168 hours"),
  cancellation_full_refund_hours: z.coerce
    .number()
    .int()
    .min(1, "Must be at least 1 hour")
    .max(168, "Cannot exceed 168 hours"),
  partial_refund_enabled: z.boolean(),
});

export type OneWayBookingFormData = z.infer<typeof oneWayBookingSchema>;
export type OneWayBookingFormInput = z.input<typeof oneWayBookingSchema>;
export type ReturnBookingFormData = z.infer<typeof returnBookingSchema>;
export type ReturnBookingFormInput = z.input<typeof returnBookingSchema>;
export type GuestDetailsFormData = z.infer<typeof guestDetailsSchema>;
export type GuestDetailsFormInput = z.input<typeof guestDetailsSchema>;
export type PriceRuleFormData = z.infer<typeof priceRuleSchema>;
export type PriceRuleFormInput = z.input<typeof priceRuleSchema>;
export type BasePricingFormData = z.infer<typeof basePricingSchema>;
export type BasePricingFormInput = z.input<typeof basePricingSchema>;
export type PredefinedPriceRuleFormData = z.infer<
  typeof predefinedPriceRuleSchema
>;
export type PredefinedPriceRuleFormInput = z.input<
  typeof predefinedPriceRuleSchema
>;
export type PlatformSettingsFormData = z.infer<typeof platformSettingsSchema>;
export type PlatformSettingsFormInput = z.input<typeof platformSettingsSchema>;

export const commissionSettingsSchema = platformSettingsSchema.pick({
  commission_percentage: true,
});

export const payoutSettingsSchema = platformSettingsSchema.pick({
  payout_delay_hours: true,
  payout_early_release_enabled: true,
});

export const completionSettingsSchema = platformSettingsSchema.pick({
  auto_complete_hours: true,
  auto_complete_warning_hours: true,
});

export const cancellationSettingsSchema = platformSettingsSchema.pick({
  cancellation_cutoff_hours: true,
  cancellation_full_refund_hours: true,
  partial_refund_enabled: true,
});

export type CompletionSettingsFormData = z.infer<typeof completionSettingsSchema>;
export type CompletionSettingsFormInput = z.input<typeof completionSettingsSchema>;

export type CommissionSettingsFormData = z.infer<typeof commissionSettingsSchema>;
export type CommissionSettingsFormInput = z.input<typeof commissionSettingsSchema>;
export type PayoutSettingsFormData = z.infer<typeof payoutSettingsSchema>;
export type PayoutSettingsFormInput = z.input<typeof payoutSettingsSchema>;
export type CancellationSettingsFormData = z.infer<
  typeof cancellationSettingsSchema
>;
export type CancellationSettingsFormInput = z.input<
  typeof cancellationSettingsSchema
>;
