import { z } from "zod";

import { MAX_BOOKING_LUGGAGE } from "@/lib/booking/luggage-display";
import { BOOKING_TYPES, SERVICE_TYPES } from "@/lib/validations/enums";



export const tripSessionSchema = z.object({

  booking_type: z.enum(BOOKING_TYPES),

  pickup_address: z.string().min(3),

  dropoff_address: z.string().min(3),

  pickup_date: z.string(),

  pickup_time: z.string(),

  passengers: z.number().int().min(1).max(16),

  service_type: z.enum(SERVICE_TYPES),

  luggage: z.number().int().min(0).max(MAX_BOOKING_LUGGAGE),

  notes: z.string().optional(),

  return_date: z.string().optional(),

  return_time: z.string().optional(),

  selected_operator: z.object({

    operator_id: z.string().uuid(),

    business_name: z.string(),

    vehicle_type: z.string(),

    rating: z.number(),

    total_reviews: z.number().int(),

    base_fare: z.number().positive(),

  }),

});



export const customerDetailsSchema = z.object({

  customer_name: z.string().min(2),

  customer_email: z.email(),

  customer_phone: z.string().min(1),

});



export const quoteRouteSchema = z.object({

  distanceMiles: z.number().positive(),

  durationMinutes: z.number().int().positive(),

});



export const quoteTripSchema = z

  .object({

    booking_type: z.enum(BOOKING_TYPES),

    route: quoteRouteSchema,

    pickup_date: z.string().min(1),

    pickup_time: z.string().min(1),

    return_date: z.string().optional(),

    return_time: z.string().optional(),

    pickup_is_airport: z.boolean().default(false),

    dropoff_is_airport: z.boolean().default(false),

  })

  .superRefine((data, ctx) => {

    if (data.booking_type !== "return") return;

    if (!data.return_date?.trim()) {

      ctx.addIssue({

        code: "custom",

        message: "Return date is required",

        path: ["return_date"],

      });

    }

    if (!data.return_time?.trim()) {

      ctx.addIssue({

        code: "custom",

        message: "Return time is required",

        path: ["return_time"],

      });

    }

  });



export const quoteBodySchema = z.object({

  operator_id: z.string().uuid(),

  trip: quoteTripSchema,

});



export const quotesBatchBodySchema = z.object({

  service_type: z.enum(SERVICE_TYPES).optional(),

  trip: quoteTripSchema,

});



export const paymentIntentBodySchema = z.object({
  operator_id: z.string().uuid(),
  trip: quoteTripSchema,
  reuse_payment_intent_id: z.string().min(1).optional(),
  supersede_payment_intent_id: z.string().min(1).optional(),
});



export const createBookingBodySchema = z

  .object({

    payment_intent_id: z.string().min(1),

    operator_id: z.string().uuid(),

    customer_name: z.string().min(2),

    customer_email: z.email(),

    customer_phone: z.string().min(1),

    booking_type: z.enum(BOOKING_TYPES),

    pickup_address: z.string().min(3),

    dropoff_address: z.string().min(3),

    pickup_date: z.string(),

    pickup_time: z.string(),

    return_date: z.string().optional(),

    return_time: z.string().optional(),

    passengers: z.number().int().min(1).max(16),

    service_type: z.enum(SERVICE_TYPES),

    luggage: z.number().int().min(0).max(MAX_BOOKING_LUGGAGE),

    price: z.number().positive(),

    platform_fee: z.number().nonnegative(),

    operator_payout: z.number().nonnegative(),

    notes: z.string().optional(),

    customer_id: z.string().uuid().optional().nullable(),

  })

  .superRefine((data, ctx) => {

    if (data.booking_type !== "return") return;

    if (!data.return_date?.trim()) {

      ctx.addIssue({

        code: "custom",

        message: "Return date is required",

        path: ["return_date"],

      });

    }

    if (!data.return_time?.trim()) {

      ctx.addIssue({

        code: "custom",

        message: "Return time is required",

        path: ["return_time"],

      });

    }

  });


