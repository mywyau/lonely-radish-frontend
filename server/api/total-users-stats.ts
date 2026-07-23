import { db } from "~/server/repositories/db";
import { setHeader } from "h3";

export default defineEventHandler(async (event) => {
  
  setHeader(event, "Cache-Control", "s-maxage=60, stale-while-revalidate=300");

  const { rows } = await db.query<{
    total_users: number;
    paid_users: number;
  }>(
    `
    SELECT
      (SELECT COUNT(*)::int FROM users) AS total_users,
      (
        SELECT COUNT(DISTINCT user_id)::int
        FROM entitlements
        WHERE subscription_status = 'active'
          AND plan IN ('monthly', 'quarterly', 'yearly')
      ) AS paid_users
    `,
  );

  return {
    totalUsers: rows[0]?.total_users ?? 0,
    paidUsers: rows[0]?.paid_users ?? 0,
  };
});
