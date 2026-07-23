// server/api/billing/me.get.ts

import { createError } from "h3";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";

type EntitlementRow = {
  plan: string | null;
  subscription_status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
};

type LatestStripeEventRow = {
  status: string;
  event_type: string;
  received_at: string;
  processed_at: string | null;
};

function hasPaidAccess(plan: string | null, subscriptionStatus: string | null): boolean {
  if (!plan) return false;
  if (plan !== "monthly" && plan !== "quarterly" && plan !== "yearly") return false;

  return subscriptionStatus === "active" || subscriptionStatus === "trialing";
}

function isActivating(plan: string | null, subscriptionStatus: string | null): boolean {
  if (hasPaidAccess(plan, subscriptionStatus)) return false;

  return (
    subscriptionStatus === "incomplete" ||
    subscriptionStatus === "past_due"
  );
}

export default defineEventHandler(async (event) => {
    
  const auth = await requireUser(event);
  const userId = auth.sub;

  const entitlementResult = await db.query<EntitlementRow>(
    `
      select
        plan,
        subscription_status,
        cancel_at_period_end,
        current_period_start,
        current_period_end,
        canceled_at
      from entitlements
      where user_id = $1
      limit 1
    `,
    [userId],
  );

  const entitlement = entitlementResult.rows[0];

  if (!entitlement) {
    throw createError({
      statusCode: 404,
      statusMessage: "Entitlement not found",
    });
  }

  const latestEventResult = await db.query<LatestStripeEventRow>(
    `
      select
        status,
        event_type,
        received_at,
        processed_at
      from stripe_events
      where user_id = $1
      order by received_at desc
      limit 1
    `,
    [userId],
  );

  const latestStripeEvent = latestEventResult.rows[0] ?? null;

  const paidAccess = hasPaidAccess(
    entitlement.plan,
    entitlement.subscription_status,
  );

  return {
    plan: entitlement.plan ?? "free",
    subscriptionStatus: entitlement.subscription_status,
    cancelAtPeriodEnd: Boolean(entitlement.cancel_at_period_end),
    currentPeriodStart: entitlement.current_period_start,
    currentPeriodEnd: entitlement.current_period_end,
    canceledAt: entitlement.canceled_at,
    hasPaidAccess: paidAccess,
    isActivating: isActivating(
      entitlement.plan,
      entitlement.subscription_status,
    ),
    latestStripeEvent,
  };
});
