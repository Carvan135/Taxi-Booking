import { getStripeServer } from "@/lib/stripe/server";

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 20;

/** Wait for Stripe PI to leave processing (succeeded or failed terminal states). */
export async function pollPaymentIntentUntilSettled(
  paymentIntentId: string,
): Promise<{ status: string; succeeded: boolean }> {
  const stripe = getStripeServer();

  for (let i = 0; i < MAX_POLLS; i++) {
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "processing") {
      return {
        status: intent.status,
        succeeded: intent.status === "succeeded",
      };
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  return { status: "processing", succeeded: false };
}
