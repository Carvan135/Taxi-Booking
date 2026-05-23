import { z } from "zod";

export const bookingReviewSchema = z.object({
  rating: z.coerce
    .number()
    .int("Rating must be a whole number")
    .min(1, "Select a rating from 1 to 5")
    .max(5, "Select a rating from 1 to 5"),
  comment: z
    .string()
    .trim()
    .max(2000, "Review must be 2000 characters or fewer")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export type BookingReviewInput = z.infer<typeof bookingReviewSchema>;
