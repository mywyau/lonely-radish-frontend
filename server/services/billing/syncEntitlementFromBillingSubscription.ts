import { db } from "~/server/repositories/db";

type BillingSubscriptionRow = {
  user_id: string;
  plan: string;
  subscription_status: string;
  cancel_at_period_end: boolean;
  current_period_start: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
};

function toEntitlementPlan(
  subscriptionStatus: string,
  plan: string,
): "free" | "monthly" | "quarterly" | "yearly" {
  const hasPaidAccess =
    subscriptionStatus === "active" || subscriptionStatus === "trialing";

  if (!hasPaidAccess) {
    return "free";
  }

  if (plan === "monthly" || plan === "quarterly" || plan === "yearly") {
    return plan;
  }

  throw new Error(`Invalid billing plan for entitlement sync: ${plan}`);
}

export async function syncEntitlementFromBillingSubscription(
  billingSubscription: BillingSubscriptionRow,
) {
  const entitlementPlan = toEntitlementPlan(
    billingSubscription.subscription_status,
    billingSubscription.plan,
  );

  await db.query(
    `
      update entitlements
      set
        plan = $1,
        subscription_status = $2,
        cancel_at_period_end = $3,
        current_period_start = $4,
        current_period_end = $5,
        canceled_at = $6
      where user_id = $7
    `,
    [
      entitlementPlan,
      billingSubscription.subscription_status,
      billingSubscription.cancel_at_period_end,
      billingSubscription.current_period_start,
      billingSubscription.current_period_end,
      billingSubscription.canceled_at,
      billingSubscription.user_id,
    ],
  );
}
