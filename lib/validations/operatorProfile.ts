import { z } from "zod";
import { OPERATOR_FLEET_VEHICLE_TYPES } from "@/lib/operator/fleet-vehicle-types";
import { isUkPhoneNumber } from "./auth";

const fleetVehicleTypeEnum = z.enum(OPERATOR_FLEET_VEHICLE_TYPES);

export const fleetVehicleTypesFieldSchema = z
  .array(fleetVehicleTypeEnum)
  .min(1, "Select at least one vehicle type");

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

export const operatorProfileVehicleTypes = OPERATOR_FLEET_VEHICLE_TYPES;

export const operatorProfileFormSchema = z.object({
  business_name: z.string().min(2, "Business name is required"),
  vehicle_registration: z
    .string()
    .min(2, "Registration number is required")
    .transform((s) => s.trim().toUpperCase()),
  email: z.email({ message: "Enter a valid email address" }),
  phone: z
    .string()
    .min(1, "Phone is required")
    .refine(
      (value) => {
        const compact = value.replace(/[\s-()]/g, "");
        return /^\+?[1-9]\d{7,14}$/.test(compact) || isUkPhoneNumber(value);
      },
      "Enter a valid phone number",
    ),
  business_address: z
    .string()
    .max(500, "Address is too long")
    .default("")
    .transform((s) => s.trim()),
  business_description: z
    .string()
    .max(5000, "Description is too long")
    .default("")
    .transform((s) => s.trim()),
  fleet_vehicle_types: fleetVehicleTypesFieldSchema,
  license_number: z.string().min(3, "License number must be at least 3 characters"),
  license_expiry: z
    .string()
    .min(1, "License expiry is required")
    .refine(isFutureCalendarDate, "License expiry must be a future date"),
  fleet_vehicle_count: z.coerce
    .number({ message: "Enter a number" })
    .int()
    .min(1, "At least 1 vehicle")
    .max(999, "Too many vehicles"),
});

export type OperatorProfileFormValues = z.infer<typeof operatorProfileFormSchema>;
