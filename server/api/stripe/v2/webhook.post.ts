import { createError, getHeader, readRawBody } from "h3";
import { enqueueStripeEventJob } from "~/server/services/billing/stripeEnqueueHelper";
import { stripe } from "~/server/services/billing/stripeClient";
import { insertStripeEvent } from "~/server/services/billing/stripeEventRepository";
import { processStripeEvent } from "~/server/services/billing/processStripeEvent";
import { redactIdentifier } from "~/server/utils/logging/redact";
import type Stripe from "stripe";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export default defineEventHandler(async (event) => {
  const requestId = crypto.randomUUID();

  const signature = getHeader(event, "stripe-signature");
  const rawBody = await readRawBody(event);

  if (!signature || !rawBody) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing Stripe signature or request body",
    });
  }

  if (!webhookSecret) {
    console.error("[STRIPE_V2] Missing STRIPE_WEBHOOK_SECRET", { requestId });

    throw createError({
      statusCode: 500,
      statusMessage: "Stripe webhook secret not configured",
    });
  }

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("[STRIPE_V2] Webhook signature verification failed", {
      requestId,
      error,
    });

    throw createError({
      statusCode: 400,
      statusMessage: "Invalid Stripe signature",
    });
  }

  try {
    const result = await insertStripeEvent(stripeEvent);

    if (!result.inserted) {
      console.log("[STRIPE_V2] Duplicate event ignored", {
        requestId,
        eventId: stripeEvent.id,
        eventType: stripeEvent.type,
      });

      return {
        received: true,
        duplicate: true,
      };
    }

    if (import.meta.dev) {
      await processStripeEvent(stripeEvent.id);
    } else {
      await enqueueStripeEventJob(event, {
        eventId: stripeEvent.id,
        stripeSubscriptionId: result.stripeSubscriptionId,
        stripeCustomerId: result.stripeCustomerId,
      });
    }

    console.log("[STRIPE_V2] Event stored and queued", {
      requestId,
      eventId: stripeEvent.id,
      eventType: stripeEvent.type,
      stripeSubscriptionHash: redactIdentifier(result.stripeSubscriptionId),
      stripeCustomerHash: redactIdentifier(result.stripeCustomerId),
      userHash: redactIdentifier(result.userId),
    });

    return {
      received: true,
      queued: true,
    };
  } catch (error) {
    console.error("[STRIPE_V2] Failed to persist or queue Stripe event", {
      requestId,
      eventId: stripeEvent.id,
      eventType: stripeEvent.type,
      error,
    });

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to persist or queue Stripe event",
    });
  }
});
