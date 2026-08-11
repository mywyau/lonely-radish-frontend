import { createError } from "h3";
import { useAuthSession } from "./authSession";
import { assertAccountAccessAllowed, resolveAccountAccess } from "~/server/utils/accountAccess";

type AuthUser = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  mode?: "personal" | "business";
};

export async function requireUser(event: any): Promise<AuthUser> {
  const session = await useAuthSession(event);
  if (!session.data.user?.sub) throw createError({ statusCode: 401, statusMessage: "Unauthenticated" });
  assertAccountAccessAllowed(await resolveAccountAccess(session.data.user.sub));
  return {
    sub: session.data.user.sub,
    email: session.data.user.email,
    email_verified: session.data.user.emailVerified,
    mode: session.data.user.mode,
  };
}
