import { Receiver } from "@upstash/qstash";
import { redactIdentifier } from "~/server/utils/logging/redact";
import { createError, defineEventHandler, getHeader, readRawBody } from "h3";

import { db } from "~/server/repositories/db";
import { stripe } from "~/server/services/billing/stripeClient";
import { deleteAuth0User } from "@/server/utils/auth0";
import { deleteUserData } from "@/server/utils/deleteUserData";

type WorkerBody = {
  jobId: number;
  userId: string;
};

type JobRow = {
  id: number | string;
  user_id: string;
  status: "pending" | "processing" | "failed" | "completed";
  attempt_count: number | string;
};

type UserRow = {
  id: string;
  stripe_customer_id: string | null;
};

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
  event: Parameters<typeof defineEventHandler>[0],
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

function parseWorkerBody(rawBody: string): WorkerBody {
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

export default defineEventHandler(async (event) => {
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

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const claimRes = await client.query<JobRow>(
      `
      UPDATE account_deletion_jobs
      SET status = 'processing',
          attempt_count = attempt_count + 1,
          started_at = NOW(),
          last_error = NULL
      WHERE id = $1
        AND user_id = $2
        AND status IN ('pending', 'failed')
      RETURNING id, user_id, status, attempt_count
      `,
      [body.jobId, body.userId]
    );

    if (claimRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return {
        success: true,
        skipped: true,
      };
    }

    await client.query(
      `
      UPDATE users
      SET deletion_status = 'processing'
      WHERE id = $1
      `,
      [body.userId]
    );

    const userRes = await client.query<UserRow>(
      `
      SELECT id, stripe_customer_id
      FROM users
      WHERE id = $1
      `,
      [body.userId]
    );

    if (userRes.rowCount === 0) {
      throw new Error("User not found");
    }

    const user = userRes.rows[0];

    await client.query("COMMIT");

    // 1. Cancel Stripe first
    if (user.stripe_customer_id) {
      const subs = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
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
    await deleteUserData(body.userId);

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

    await db.query(
      `
      UPDATE account_deletion_jobs
      SET status = 'failed',
          last_error = $2
      WHERE id = $1
      `,
      [body.jobId, message]
    );

    await db.query(
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
  } finally {
    client.release();
  }
});
