import { createError } from "h3";
import { useAuthSession } from "./authSession";
import { db } from "~/server/repositories/db";

type AuthUser = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  mode?: "personal" | "business";
};

export async function requireUser(event: any): Promise<AuthUser> {
  const session = await useAuthSession(event);
  if (!session.data.user?.sub) throw createError({ statusCode: 401, statusMessage: "Unauthenticated" });
  const { rows } = await db.query(`with restored as (
    update users set account_status='active',moderation_suspended_until=null,
      moderation_updated_at=now(),moderation_updated_by=null,updated_at=now()
    where id=$1 and account_status='suspended'
      and moderation_suspended_until is not null and moderation_suspended_until<=now()
    returning id
  )
  select u.account_status as "accountStatus",u.moderation_suspended_until as "suspendedUntil",
    exists(select 1 from restored) as restored from users u where u.id=$1`, [session.data.user.sub]);
  const account = rows[0];
  if (account?.restored) {
    await db.query(`insert into moderation_actions(target_user_id,action,note)
      values($1,'auto_restore','Temporary suspension expired')`, [session.data.user.sub]);
    await db.query(`insert into notifications(recipient_id,kind)
      values($1,'account_restored')`, [session.data.user.sub]);
  }
  if (account?.accountStatus === "suspended") {
    throw createError({
      statusCode: 403,
      statusMessage: account.suspendedUntil ? "Account temporarily suspended" : "Account suspended",
      data: { code: "ACCOUNT_SUSPENDED", suspendedUntil: account.suspendedUntil || null },
    });
  }
  if (account?.accountStatus === "deleting") {
    throw createError({
      statusCode: 403,
      statusMessage: "Account deletion is in progress",
      data: { code: "ACCOUNT_DELETING" },
    });
  }
  return {
    sub: session.data.user.sub,
    email: session.data.user.email,
    email_verified: session.data.user.emailVerified,
    mode: session.data.user.mode,
  };
}
