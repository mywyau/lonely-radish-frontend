// server/api/stripe/checkout.post.ts

import { createError, readBody } from "h3";
import { db } from "~/server/repositories/db";
import { getOrCreateStripeCustomer } from "~/server/services/billing/getOrCreateStripeCustomer";
import { stripe } from "~/server/services/billing/stripeClient";
import { requireUser } from "~/server/utils/requireUser";

type Billing = "monthly" | "quarterly" | "yearly";

type CheckoutBody = {
  billing?: Billing;
};

function getAppUrl(): string {
  const appUrl = process.env.SITE_URL?.trim();

  if (!appUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "SITE_URL is not configured",
    });
  }

  return appUrl.replace(/\/+$/, "");
}

function getPriceIdForBilling(billing: Billing): string {
  const priceId = billing === "monthly"
    ? process.env.STRIPE_PRICE_ID_MONTHLY
    : billing === "quarterly"
      ? process.env.STRIPE_PRICE_ID_QUARTERLY
      : process.env.STRIPE_PRICE_ID_YEARLY;

  if (!priceId) {
    throw createError({
      statusCode: 500,
      statusMessage: `Missing Stripe price id for ${billing}`,
    });
  }

  return priceId;
}

function assertBilling(value: unknown): Billing {
  if (value === "monthly" || value === "quarterly" || value === "yearly") {
    return value;
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Invalid billing option",
  });
}

export default defineEventHandler(async (event) => {
  const auth = await requireUser(event);
  const userId = auth.sub;

  const body = (await readBody(event)) as CheckoutBody | undefined;
  const billing = assertBilling(body?.billing);

  const { rows } = await db.query<{ email: string | null; subscriptionStatus: string | null }>(
    `
      select u.email,e.subscription_status as "subscriptionStatus"
      from users u left join entitlements e on e.user_id=u.id
      where u.id = $1
      limit 1
    `,
    [userId],
  );

  const userEmail = rows[0]?.email?.trim();
  if (['active','trialing','past_due','incomplete'].includes(rows[0]?.subscriptionStatus || '')) {
    throw createError({
      statusCode: 409,
      statusMessage: "You already have a subscription. Manage it from your account.",
    });
  }

  if (!userEmail) {
    throw createError({
      statusCode: 400,
      statusMessage: "User email not found",
    });
  }

  const customerId = await getOrCreateStripeCustomer(userId, userEmail);
  const priceId = getPriceIdForBilling(billing);
  const appUrl = getAppUrl();

  const idempotencyKey = crypto.randomUUID();

  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/billing/cancel`,
      metadata: {
        userId,
        plan: billing,
      },
      subscription_data: {
        metadata: {
          userId,
          plan: billing,
        },
      },
    },
    {
      idempotencyKey,
    },
  );

  if (!session.url) {
    throw createError({
      statusCode: 500,
      statusMessage: "Stripe checkout session did not return a URL",
    });
  }

  return { url: session.url };
});
