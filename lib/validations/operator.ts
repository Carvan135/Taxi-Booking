import { z } from "zod";
import { fleetVehicleTypesFieldSchema } from "@/lib/validations/operatorProfile";
import { signUpSchema } from "./auth";

function isFutureCalendarDate(value: string): boolean {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;
  const expiry = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return expiry > today;
}

const licenseFileSchema = z.custom<File>(
  (val): val is File =>
    typeof File !== "undefined" &&
    val instanceof File &&
    val.size > 0 &&
    val.size <= 10 * 1024 * 1024,
  { message: "Upload a PDF or image up to 10MB" },
);

export const operatorOnboardingSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  business_name: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.email({ message: "Enter a valid email address" }),
  phone: z
    .string()
    .min(1, "Phone is required")
    .refine(
      (value) => {
        const compact = value.replace(/[\s-()]/g, "");
        return /^\+?[1-9]\d{7,14}$/.test(compact);
      },
      "Enter a valid phone number (include country code if possible)",
    ),
  fleet_vehicle_types: fleetVehicleTypesFieldSchema,
  vehicle_registration: z
    .string()
    .min(2)
    .transform((s) => s.trim().toUpperCase())
    .pipe(
      z
        .string()
        .regex(
          /^[A-Z0-9\s]{2,}$/,
          "Use at least 2 uppercase letters or digits (spaces allowed)",
        ),
    ),
  license_number: z.string().min(3, "License number must be at least 3 characters"),
  license_expiry: z
    .string()
    .min(1, "License expiry is required")
    .refine(isFutureCalendarDate, "License expiry must be a future date"),
  base_price: z.coerce
    .number({ message: "Base price must be a number" })
    .positive("Base price must be positive")
    .min(1, "Base price must be at least 1"),
  terms_accepted: z.literal(true, {
    message: "You must accept the terms and conditions",
  }),
});

/** Operator business details submitted after account creation (server-validated). */
export const operatorApplicationSchema = operatorOnboardingSchema.pick({
  business_name: true,
  fleet_vehicle_types: true,
  vehicle_registration: true,
  license_number: true,
  license_expiry: true,
  base_price: true,
});

/** Full onboarding form including license file upload (client-only field). */
export const operatorOnboardingFormSchema = operatorOnboardingSchema.extend({
  license_document: licenseFileSchema,
});

export type OperatorOnboardingFormData = z.infer<
  typeof operatorOnboardingSchema
>;

export type OperatorOnboardingClientValues = z.infer<
  typeof operatorOnboardingFormSchema
>;

/** Operator account creation + Step 1 details (includes password). */
export const operatorSignUpFormSchema = operatorOnboardingFormSchema.extend({
  password: signUpSchema.shape.password,
});

export type OperatorSignUpFormInput = z.input<typeof operatorSignUpFormSchema>;
