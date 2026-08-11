import { Receiver } from "@upstash/qstash";
import { redactIdentifier } from "~/server/utils/logging/redact";
import { createError, defineEventHandler, getHeader, readRawBody } from "h3";
import type { H3Event } from "h3";

import { db } from "~/server/repositories/db";
import { stripe } from "~/server/services/billing/stripeClient";
import { claimAccountDeletionJob } from "~/server/services/accountDeletionWorker";
import { deleteAuth0User } from "@/server/utils/auth0";
import { deleteUserData } from "@/server/utils/deleteUserData";
import { invalidateAccountAccess } from "@/server/utils/accountAccess";
import type { AccountDeletionWorkerRequest, AccountDeletionWorkerResponse } from "~/types/api/accountDeletion";

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw createError({
      statusCode: 500,
      statusMessage: `Missing env var: ${name}`,
    });
  }

  return value;
}

function getReceiver() {
  return new Receiver({
    currentSigningKey: requiredEnv("QSTASH_CURRENT_SIGNING_KEY"),
    nextSigningKey: requiredEnv("QSTASH_NEXT_SIGNING_KEY"),
  });
}

function getWorkerUrl(): string {
  return `${requiredEnv("SITE_URL").replace(/\/+$/, "")}/api/account/v2/worker-delete`;
}

async function verifyQStashRequest(
  event: H3Event,
  rawBody: string,
): Promise<void> {
  const signature = getHeader(event, "upstash-signature");
  const upstashRegion = getHeader(event, "upstash-region") ?? undefined;

  if (!signature) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing QStash signature",
    });
  }

  const isValid = await getReceiver().verify({
    signature,
    body: rawBody,
    url: getWorkerUrl(),
    upstashRegion,
  });

  if (!isValid) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid QStash signature",
    });
  }
}

function parseWorkerBody(rawBody: string): AccountDeletionWorkerRequest {
  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid JSON body",
    });
  }

  if (!body || typeof body !== "object") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid worker payload",
    });
  }

  const jobId = (body as { jobId?: unknown }).jobId;
  const userId = (body as { userId?: unknown }).userId;

  if (typeof jobId !== "number" || !Number.isFinite(jobId) || jobId <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid jobId",
    });
  }

  if (typeof userId !== "string" || !userId.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing or invalid userId",
    });
  }

  return {
    jobId,
    userId: userId.trim(),
  };
}

export default defineEventHandler(async (event): Promise<AccountDeletionWorkerResponse> => {
  const rawBody = await readRawBody(event, "utf8");

  if (!rawBody) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing request body",
    });
  }

  await verifyQStashRequest(event, rawBody);

  const body = parseWorkerBody(rawBody);

  if (!body?.jobId || !body?.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing jobId or userId",
    });
  }

  let claimed = false;

  try {
    const work = await claimAccountDeletionJob(db, body);
    if (work.state === 'completed') return { success: true, completed: true, skipped: true };
    if (work.state === 'skipped') return { success: true, skipped: true };
    claimed = true;
    const { user, ownedBusinesses } = work;
    if (ownedBusinesses.some(business => business.has_other_members)) {
      throw new Error("Transfer ownership or remove the other business members before deleting this account");
    }

    // 1. Cancel Stripe first
    const stripeCustomerIds = [...new Set([
      user?.stripe_customer_id,
      ...ownedBusinesses.map(business => business.stripe_customer_id),
    ].filter((value): value is string => Boolean(value)))];

    for (const stripeCustomerId of stripeCustomerIds) {
      const subs = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 100,
      });

      for (const sub of subs.data) {
        if (sub.status !== "canceled") {
          try {
            await stripe.subscriptions.cancel(sub.id);
          } catch (err: any) {
            const message = String(err?.message ?? "");
            if (!message.toLowerCase().includes("no such subscription")) {
              throw err;
            }
          }
        }
      }
    }

    // 2. Delete Auth0 before deleting local DB data
    await deleteAuth0User(body.userId);

    // 3. Delete local app data last
    if (user) {
      await deleteUserData(body.userId, ownedBusinesses.map(business => business.id));
    }
    await invalidateAccountAccess(body.userId);

    // 4. Mark job completed
    await db.query(
      `
      UPDATE account_deletion_jobs
      SET status = 'completed',
          completed_at = NOW(),
          last_error = NULL
      WHERE id = $1
      `,
      [body.jobId]
    );

    return {
      success: true,
      completed: true,
    };
  } catch (err: any) {
    const message = String(err?.message ?? err);

    if (claimed) await db.query(
      `
      UPDATE account_deletion_jobs
      SET status = 'failed',
          last_error = $2
      WHERE id = $1
      `,
      [body.jobId, message]
    );

    if (claimed) await db.query(
      `
      UPDATE users
      SET deletion_status = 'failed'
      WHERE id = $1
      `,
      [body.userId]
    );

    console.error("Account deletion job failed", {
      jobId: body.jobId,
      userHash: redactIdentifier(body.userId),
      error: err,
    });

    throw err;
  }
});
