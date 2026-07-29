import { db } from "~/server/repositories/db";
import type { Entitlement } from "~/types/auth/entitlements";

export async function getUserEntitlement(
  userId: string,
): Promise<Entitlement | null> {
  const { rows } = await db.query<Entitlement>(
    `
    SELECT
      plan,
      subscription_status,
      cancel_at_period_end,
      current_period_start,
      current_period_end,
      canceled_at
    FROM entitlements
    WHERE user_id = $1
    LIMIT 1
    `,
    [userId],
  );

  return rows[0] ?? null;
}
