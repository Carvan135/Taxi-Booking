import Stripe from "stripe";
import { reconcilePaymentIntentById } from "@/lib/stripe/reconcile-payment-intent";
import {
  syncBookingsFromPaymentIntent,
  syncBookingsPaymentFailed,
} from "@/lib/stripe/sync-booking-payment";
import { constructStripeWebhookEvent } from "@/lib/stripe/verify-webhook-event";
import { emitBookingConfirmationSafetyNet } from "@/lib/email/booking-events";
import { createServiceRoleClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = constructStripeWebhookEvent(body, signature);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const supabase = createServiceRoleClient();

  try {
    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;

        const { data: operator, error } = await supabase
          .from("operators")
          .select("id, stripe_payouts_enabled")
          .eq("stripe_account_id", account.id)
          .maybeSingle();

        if (error || !operator) {
          console.warn("No operator found for Stripe account:", account.id);
          break;
        }

        const wasAlreadyEnabled = operator.stripe_payouts_enabled === true;
        const nowEnabled = account.payouts_enabled ?? false;

        const row: Record<string, unknown> = {
          stripe_onboarding_complete: account.details_submitted ?? false,
          stripe_payouts_enabled: nowEnabled,
          updated_at: new Date().toISOString(),
        };
        if (!wasAlreadyEnabled && nowEnabled) {
          row.stripe_connected_at = new Date().toISOString();
        }

        await supabase.from("operators").update(row).eq("id", operator.id);

        console.log(`Operator ${operator.id} updated:`, {
          details_submitted: account.details_submitted,
          payouts_enabled: nowEnabled,
        });
        break;
      }

      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        let sync = await syncBookingsFromPaymentIntent(supabase, intent, {
          sendNotifications: true,
        });

        if (!sync.updated && !sync.error) {
          const recovered = await reconcilePaymentIntentById(
            supabase,
            intent.id,
            { sendNotifications: true },
          );
          if (recovered.synced) {
            sync = { updated: true };
          } else if (!recovered.error) {
            console.log("Booking not yet created for intent:", intent.id);
          } else {
            console.error(
              "payment_intent.succeeded reconcile error:",
              recovered.error,
            );
            sync = { updated: false, error: recovered.error };
          }
        }

        if (sync.error) {
          console.error(
            "payment_intent.succeeded booking sync error:",
            sync.error,
          );
          return new Response(`Booking sync failed: ${sync.error}`, {
            status: 500,
          });
        }

        try {
          await emitBookingConfirmationSafetyNet(supabase, intent.id);
        } catch (emailErr) {
          console.error("confirmation email safety net error:", emailErr);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const sync = await syncBookingsPaymentFailed(supabase, intent.id);

        if (sync.error) {
          console.error(
            "payment_intent.payment_failed booking update error:",
            sync.error,
          );
          return new Response(`Booking sync failed: ${sync.error}`, {
            status: 500,
          });
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  } catch (err) {
    console.error("Error handling webhook event:", err);
    return new Response("Webhook handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
