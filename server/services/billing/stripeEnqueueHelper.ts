import { useRuntimeConfig } from "#imports";
import { Client } from "@upstash/qstash";
import type { H3Event } from "h3";

export async function enqueueStripeEventJob(
  event: H3Event,
  job: {
    eventId: string;
    stripeSubscriptionId?: string | null;
    stripeCustomerId?: string | null;
  },
): Promise<void> {
  const config = useRuntimeConfig(event);

  const qstashToken = config.qstashToken as string | undefined;
  const workerBaseUrl = config.public.siteUrl as string | undefined;

  if (!qstashToken) {
    throw new Error("Missing qstashToken runtime config");
  }

  if (!workerBaseUrl) {
    throw new Error("Missing public.siteUrl runtime config");
  }

  const workerUrl = `${workerBaseUrl.replace(/\/+$/, "")}/api/stripe/v2/process-event-v2`;

  const flowKey = job.stripeSubscriptionId
    ? `stripe-subscription:${job.stripeSubscriptionId}`
    : job.stripeCustomerId
      ? `stripe-customer:${job.stripeCustomerId}`
      : "stripe-webhooks";

  const client = new Client({
    token: qstashToken,
  });

  await client.publishJSON({
    url: workerUrl,
    body: {
      eventId: job.eventId,
    },
    retries: 3,
    deduplicationId: job.eventId,
    flowControl: {
      key: flowKey,
      parallelism: 1,
      rate: 120,
      period: "1m",
    },
  });
}
