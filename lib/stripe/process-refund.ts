import type Stripe from "stripe";
import { getStripeServer } from "@/lib/stripe/server";

export type CreateBookingRefundInput = {
  paymentIntentId: string;
  amountPence?: number;
  idempotencyKey?: string;
  reason?: Stripe.RefundCreateParams.Reason;
};

export async function createBookingRefund(
  input: CreateBookingRefundInput,
): Promise<Stripe.Refund> {
  const stripe = getStripeServer();
  const params: Stripe.RefundCreateParams = {
    payment_intent: input.paymentIntentId,
    reason: input.reason ?? "requested_by_customer",
  };

  if (input.amountPence != null) {
    params.amount = input.amountPence;
  }

  const requestOptions: Stripe.RequestOptions = {};
  if (input.idempotencyKey) {
    requestOptions.idempotencyKey = input.idempotencyKey;
  }

  return stripe.refunds.create(params, requestOptions);
}
