import type Stripe from "stripe";
import { db } from "~/server/repositories/db";
import { getBillingSubscriptionByStripeSubscriptionId } from "~/server/services/billing/getBillingSubscriptionByStripeSubscriptionId";
import { stripe } from "~/server/services/billing/stripeClient";
import { syncEntitlementFromBillingSubscription } from "~/server/services/billing/syncEntitlementFromBillingSubscription";
import { upsertBillingSubscription } from "~/server/services/billing/upsertBillingSubscription";

type ProcessStripeEventResult =
  | { ok: true; alreadyProcessed: true }
  | { ok: true; alreadyProcessing: true }
  | { ok: true; processed: true; eventType: string }
  | { ok: false; failed: true; eventType?: string; message: string };

type StripeEventRow = {
  event_id: string;
  event_type: string;
  status: string;
  payload: Stripe.Event;
};

async function markStripeEventProcessing(
  eventId: string,
): Promise<"claimed" | "already_processed" | "already_processing" | "missing"> {
  const { rows } = await db.query<{ status: string }>(
    `
      update stripe_events
      set
        status = 'processing',
        error_message = null
      where event_id = $1
        and status in ('received', 'failed')
      returning status
    `,
    [eventId],
  );

  if (rows[0]) {
    return "claimed";
  }

  const existing = await db.query<{ status: string }>(
    `
      select status
      from stripe_events
      where event_id = $1
      limit 1
    `,
    [eventId],
  );

  const status = existing.rows[0]?.status;

  if (!status) return "missing";
  if (status === "processed") return "already_processed";
  if (status === "processing") return "already_processing";

  return "missing";
}

async function markStripeEventProcessed(eventId: string) {
  await db.query(
    `
      update stripe_events
      set
        status = 'processed',
        processed_at = now(),
        error_message = null
      where event_id = $1
    `,
    [eventId],
  );
}

async function markStripeEventFailed(eventId: string, message: string) {
  await db.query(
    `
      update stripe_events
      set
        status = 'failed',
        error_message = $2
      where event_id = $1
    `,
    [eventId, message],
  );
}

function isSupportedStripeEventType(eventType: string): boolean {
  switch (eventType) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
    case "invoice.paid":
    case "invoice.payment_failed":
      return true;
    default:
      return false;
  }
}

function isSubscriptionEventType(eventType: string): boolean {
  switch (eventType) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return true;
    default:
      return false;
  }
}

function isInvoiceEventType(eventType: string): boolean {
  switch (eventType) {
    case "invoice.paid":
    case "invoice.payment_failed":
      return true;
    default:
      return false;
  }
}

function isCheckoutSessionEventType(eventType: string): boolean {
  return eventType === "checkout.session.completed";
}

function extractSubscriptionIdFromCheckoutSession(
  session: Stripe.Checkout.Session,
): string | null {
  if (typeof session.subscription === "string") {
    return session.subscription;
  }

  if (session.subscription && typeof session.subscription.id === "string") {
    return session.subscription.id;
  }

  return null;
}

function extractSubscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  if (typeof invoice.subscription === "string") {
    return invoice.subscription;
  }

  const parent = invoice.parent as
    | {
        type?: string;
        subscription_details?: { subscription?: string };
      }
    | undefined;

  if (
    parent?.type === "subscription_details" &&
    typeof parent.subscription_details?.subscription === "string"
  ) {
    return parent.subscription_details.subscription;
  }

  const firstLine = invoice.lines?.data?.[0] as
    | {
        parent?: {
          subscription_item_details?: {
            subscription?: string;
          };
        };
      }
    | undefined;

  if (
    typeof firstLine?.parent?.subscription_item_details?.subscription ===
    "string"
  ) {
    return firstLine.parent.subscription_item_details.subscription;
  }

  return null;
}

async function reconcileSubscriptionById(stripeSubscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

  await upsertBillingSubscription(subscription);

  const billingSubscription =
    await getBillingSubscriptionByStripeSubscriptionId(stripeSubscriptionId);

  if (!billingSubscription) {
    throw new Error(
      `Billing subscription not found after upsert: ${stripeSubscriptionId}`,
    );
  }

  await syncEntitlementFromBillingSubscription(billingSubscription);
}

export async function processStripeEvent(
  eventId: string,
): Promise<ProcessStripeEventResult> {
  const claimResult = await markStripeEventProcessing(eventId);

  if (claimResult === "already_processed") {
    return {
      ok: true,
      alreadyProcessed: true,
    };
  }

  if (claimResult === "already_processing") {
    return {
      ok: true,
      alreadyProcessing: true,
    };
  }

  if (claimResult === "missing") {
    return {
      ok: false,
      failed: true,
      message: `Stripe event not found: ${eventId}`,
    };
  }

  const { rows } = await db.query(
    `
      select event_id, event_type, status, payload
      from stripe_events
      where event_id = $1
      limit 1
    `,
    [eventId],
  );

  const row = rows[0] as StripeEventRow | undefined;

  if (!row) {
    return {
      ok: false,
      failed: true,
      message: `Stripe event not found after claim: ${eventId}`,
    };
  }

  const stripeEvent = row.payload;
  const eventType = stripeEvent.type;

  try {
    if (!isSupportedStripeEventType(eventType)) {
      await markStripeEventProcessed(eventId);

      return {
        ok: true,
        processed: true,
        eventType,
      };
    }

    if (isCheckoutSessionEventType(eventType)) {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const stripeSubscriptionId =
        extractSubscriptionIdFromCheckoutSession(session);

      if (!stripeSubscriptionId) {
        if (session.mode !== "subscription") {
          await markStripeEventProcessed(eventId);

          return {
            ok: true,
            processed: true,
            eventType,
          };
        }

        throw new Error(
          `Could not extract subscription id from checkout session event ${eventId}`,
        );
      }

      await reconcileSubscriptionById(stripeSubscriptionId);
    }

    if (isSubscriptionEventType(eventType)) {
      const subscription = stripeEvent.data.object as Stripe.Subscription;
      await reconcileSubscriptionById(subscription.id);
    }

    if (isInvoiceEventType(eventType)) {
      const invoice = stripeEvent.data.object as Stripe.Invoice;
      const stripeSubscriptionId = extractSubscriptionIdFromInvoice(invoice);

      if (!stripeSubscriptionId) {
        throw new Error(
          `Could not extract subscription id from invoice event ${eventId}`,
        );
      }

      await reconcileSubscriptionById(stripeSubscriptionId);
    }

    await markStripeEventProcessed(eventId);

    return {
      ok: true,
      processed: true,
      eventType,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown processing error";

    await markStripeEventFailed(eventId, message);

    return {
      ok: false,
      failed: true,
      eventType,
      message,
    };
  }
}