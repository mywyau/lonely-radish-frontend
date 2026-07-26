import { createError } from "h3";
import { db } from "~/server/repositories/db";
import { requireUser } from "~/server/utils/requireUser";

export async function requirePersonalUser(event: any) {
  const { sub } = await requireUser(event);
  const { rows } = await db.query(
    `select account_type as "accountType",account_status as "accountStatus",
    onboarding_completed_at as "onboardingCompletedAt" from users where id=$1`,
    [sub],
  );
  const user = rows[0];
  if (!user || user.accountType !== "personal" || !user.onboardingCompletedAt) {
    throw createError({
      statusCode: 403,
      statusMessage: "A completed personal dating account is required",
    });
  }
  if (!["active", "paused"].includes(user.accountStatus)) {
    throw createError({
      statusCode: 403,
      statusMessage: "This account cannot claim offers",
    });
  }
  return { sub, accountStatus: user.accountStatus as string };
}
