import {
  assertMethod,
  createError,
  defineEventHandler,
  readBody,
  setResponseStatus,
} from "h3";
import { Client as QStashClient } from "@upstash/qstash";

import { db } from "~/server/repositories/db";
import { getUserFromSession } from "@/server/utils/auth";
import { useAuthSession } from "~/server/utils/authSession";
import { redactIdentifier } from "~/server/utils/logging/redact";

type DeleteBody = {
  confirm?: string;
};

type ExistingJobRow = {
  id: number | string;
  status: "pending" | "processing" | "failed" | "completed";
  started_at: string | null;
};

const qstash = new QStashClient({
  token: process.env.QSTASH_TOKEN!,
});

export default defineEventHandler(async (event) => {

  assertMethod(event, "DELETE");

  const user = await getUserFromSession(event);

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthenticated",
    });
  }

  const body = await readBody<DeleteBody>(event);

  if (body?.confirm?.trim().toLowerCase() !== "delete") {
    throw createError({
      statusCode: 400,
      statusMessage: "Confirmation text did not match",
    });
  }

  const siteUrl = process.env.SITE_URL;
  if (!siteUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "SITE_URL is not configured",
    });
  }

  const workerUrl = `${siteUrl}/api/account/v2/worker-delete`;

  const client = await db.connect();

  let jobId: number | null = null;
  let alreadyInProgress = false;
  let createdNewJob = false;
  let shouldPublish = false;
  let jobStatus: ExistingJobRow["status"] | "pending" = "pending";

  try {
    await client.query("BEGIN");

    const lockRes = await client.query(
      `
      UPDATE users
      SET deleting_at = NOW(),
          deletion_requested_at = NOW(),
          deletion_status = 'pending'
      WHERE id = $1
        AND deleting_at IS NULL
        AND deleted_at IS NULL
      RETURNING id
      `,
      [user.id]
    );

    if (lockRes.rowCount > 0) {
      // Fresh deletion request
      const jobRes = await client.query(
        `
        INSERT INTO account_deletion_jobs (
          user_id,
          status,
          attempt_count,
          created_at
        )
        VALUES ($1, 'pending', 0, NOW())
        RETURNING id
        `,
        [user.id]
      );

      jobId = Number(jobRes.rows[0].id);
      createdNewJob = true;
      shouldPublish = true;
      jobStatus = "pending";
    } else {
      // User already in delete flow
      alreadyInProgress = true;

      const existingJobRes = await client.query<ExistingJobRow>(
        `
        SELECT id, status, started_at
        FROM account_deletion_jobs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [user.id]
      );

      if (existingJobRes.rowCount > 0) {
        const existingJob = existingJobRes.rows[0];
        jobId = Number(existingJob.id);
        jobStatus = existingJob.status;

        // Only republish if it is pending and has never started.
        if (existingJob.status === "pending" && !existingJob.started_at) {
          shouldPublish = true;
        }

        // Do NOT auto-republish failed jobs from the public endpoint.
        // Do NOT publish processing/completed jobs either.
      } else {
        // Repair case: user is marked deleting but no job exists
        const repairJobRes = await client.query(
          `
          INSERT INTO account_deletion_jobs (
            user_id,
            status,
            attempt_count,
            created_at
          )
          VALUES ($1, 'pending', 0, NOW())
          RETURNING id
          `,
          [user.id]
        );

        jobId = Number(repairJobRes.rows[0].id);
        createdNewJob = true;
        shouldPublish = true;
        jobStatus = "pending";
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  if (jobId !== null && shouldPublish) {
    try {
      const publishResult = await qstash.publishJSON({
        url: workerUrl,
        body: {
          jobId,
          userId: user.id,
        },
        deduplicationId: `account_delete_${jobId}`,
      });

      console.log("Published account deletion job", {
        userHash: redactIdentifier(user.id),
        jobId,
        workerUrl,
        alreadyInProgress,
        createdNewJob,
        publishResult,
      });
    } catch (err) {
      console.error("Failed to publish account deletion job", {
        userHash: redactIdentifier(user.id),
        jobId,
        workerUrl,
        error: err,
      });

      throw createError({
        statusCode: 500,
        statusMessage: "Failed to queue account deletion",
      });
    }
  }

  // Stop an account marked for deletion from continuing to use the app even if
  // the background worker has not yet removed the Auth0 identity.
  await (await useAuthSession(event)).clear();

  setResponseStatus(event, 202);

  return {
    success: true,
    queued: shouldPublish,
    alreadyInProgress,
    createdNewJob,
    jobId,
    status: jobStatus,
  };
});
