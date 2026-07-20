import { H3Event } from "h3";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";

export type SessionUser = {
  id: string; // auth0 sub
  email: string;
  stripeCustomerId?: string | null;
  plan?: string | null;
  subscriptionStatus?: string | null;
  deletingAt?: string | null;
  cancelAtPeriodEnd?: boolean | null;
};

export async function getUserFromSession(
  event: H3Event,
): Promise<SessionUser | null> {
  try {
    const auth = await requireUser(event);
    const auth0UserId = auth.sub;
    const { rows } = await db.query(
      `SELECT u.id, u.email, u.stripe_customer_id, u.deleting_at,
              e.plan, e.subscription_status
       FROM users u LEFT JOIN entitlements e ON e.user_id = u.id
       WHERE u.id = $1`,
      [auth0UserId],
    );
    const row = rows[0];
    if (!row) return null;
    return { id: row.id, email: row.email, stripeCustomerId: row.stripe_customer_id,
      plan: row.plan, subscriptionStatus: row.subscription_status, deletingAt: row.deleting_at };
  } catch {
    return null;
  }
}
