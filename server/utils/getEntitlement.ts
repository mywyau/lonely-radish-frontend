import { db, type DatabaseQueryable } from "~/server/repositories/db";
import type { Entitlement } from "~/types/auth/entitlements";

export async function getUserEntitlement(
  userId: string,
  database: DatabaseQueryable = db,
): Promise<Entitlement | null> {
  const { rows } = await database.query<Entitlement>(
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
