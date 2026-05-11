import { z } from "zod";

/**
 * Compact UK phone check (spaces/hyphens stripped).
 * Accepts common mobile (07 / +447) and geographic (01/02/03 +44) patterns.
 */
export const UK_PHONE_REGEX =
  /^(\+44[1-9]\d{8,10}|0[1-9]\d{8,10})$/;

export function isUkPhoneNumber(value: string): boolean {
  const compact = value.replace(/[\s-]/g, "");
  if (!compact) return false;
  return UK_PHONE_REGEX.test(compact);
}

const optionalUkPhone = z
  .string()
  .optional()
  .refine(
    (val) => val == null || val.trim() === "" || isUkPhoneNumber(val),
    "Enter a valid UK phone number",
  );

export const signUpSchema = z.object({
  email: z.email({ message: "Enter a valid email address" }),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must include at least one uppercase letter")
    .regex(/[0-9]/, "Password must include at least one number"),
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  phone: optionalUkPhone,
  role: z.enum(["customer", "operator"]).default("customer"),
});

export const signInSchema = z.object({
  email: z.email({ message: "Enter a valid email address" }),
  password: z.string().min(1, "Password is required"),
});

/** Client signup form: includes confirm password; omit `confirmPassword` when calling `signUp` server action. */
export const signUpFormSchema = signUpSchema
  .extend({
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;
/** Parsed signup form output (after Zod transforms / defaults). */
export type SignUpFormValues = z.infer<typeof signUpFormSchema>;
/** Raw signup form values before defaults (matches React Hook Form). */
export type SignUpFormInput = z.input<typeof signUpFormSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;

/** Fast customer-only signup (no phone, no role picker). */
export const customerSignUpFormSchema = z
  .object({
    full_name: z.string().min(2, "Full name must be at least 2 characters"),
    email: z.email({ message: "Enter a valid email address" }),
    password: signUpSchema.shape.password,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type CustomerSignUpFormInput = z.input<typeof customerSignUpFormSchema>;
