// server/services/billing/upsertBillingSubscription.ts

import type Stripe from "stripe";
import { db } from "~/server/repositories/db";

export type BillingPlan = "monthly" | "quarterly" | "yearly";
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

function toBillingPlan(value: string | undefined): BillingPlan {
  if (value === "monthly" || value === "quarterly" || value === "yearly") {
    return value;
  }

  throw new Error(`Invalid or missing billing plan metadata: ${value}`);
}

function toSubscriptionStatus(value: string): SubscriptionStatus {
  switch (value) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return value;
    default:
      throw new Error(`Unhandled Stripe subscription status: ${value}`);
  }
}

function toIsoOrNull(unixSeconds?: number | null): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

export async function upsertBillingSubscription(
  subscription: Stripe.Subscription,
) {
  const userId = subscription.metadata?.userId;
  const stripeCustomerId =
    typeof subscription.customer === "string" ? subscription.customer : null;

  if (!userId) {
    throw new Error(
      `Subscription ${subscription.id} missing metadata.userId`,
    );
  }

  if (!stripeCustomerId) {
    throw new Error(
      `Subscription ${subscription.id} missing string customer id`,
    );
  }

  const plan = toBillingPlan(subscription.metadata?.plan);
  const status = toSubscriptionStatus(subscription.status);

  const item = subscription.items?.data?.[0];

  const currentPeriodStart = toIsoOrNull(item?.current_period_start ?? null);
  const currentPeriodEnd = toIsoOrNull(item?.current_period_end ?? null);
  const canceledAt = toIsoOrNull(subscription.canceled_at ?? null);

  const latestInvoiceId =
    typeof subscription.latest_invoice === "string"
      ? subscription.latest_invoice
      : null;

  await db.query(
    `
      insert into billing_subscriptions (
        stripe_subscription_id,
        user_id,
        stripe_customer_id,
        plan,
        subscription_status,
        cancel_at_period_end,
        current_period_start,
        current_period_end,
        canceled_at,
        latest_invoice_id,
        created_at,
        updated_at
      )
      values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        now(),
        now()
      )
      on conflict (stripe_subscription_id)
      do update set
        user_id = excluded.user_id,
        stripe_customer_id = excluded.stripe_customer_id,
        plan = excluded.plan,
        subscription_status = excluded.subscription_status,
        cancel_at_period_end = excluded.cancel_at_period_end,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        canceled_at = excluded.canceled_at,
        latest_invoice_id = excluded.latest_invoice_id,
        updated_at = now()
    `,
    [
      subscription.id,
      userId,
      stripeCustomerId,
      plan,
      status,
      Boolean(subscription.cancel_at_period_end),
      currentPeriodStart,
      currentPeriodEnd,
      canceledAt,
      latestInvoiceId,
    ],
  );
}
