import { createHash } from "node:crypto";

const BOT_FAMILIES: Array<[string, RegExp]> = [
  ["googlebot", /googlebot/i],
  ["bingbot", /bingbot/i],
  ["facebookbot", /facebookexternalhit|facebookcatalog/i],
  ["twitterbot", /twitterbot/i],
  ["linkedinbot", /linkedinbot/i],
  ["slackbot", /slackbot/i],
  ["discordbot", /discordbot/i],
  ["crawler", /crawler|spider|crawling/i],
  ["curl", /curl/i],
  ["wget", /wget/i],
  ["python", /python/i],
  ["httpclient", /httpclient/i],
  ["monitoring", /monitoring/i],
  ["bot", /bot/i],
];

const SENSITIVE_KEY_PATTERN =
  /(^|_)(userId|user_id|customerId|customer_id|stripeCustomerId|stripe_customer_id|subscriptionId|subscription_id|stripeSubscriptionId|stripe_subscription_id|sessionKey|session_key|subjectKey|subject_key|ip|forwardedFor|userAgent|referrer)$/i;

export function hashForLog(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  return createHash("sha256")
    .update(String(value))
    .digest("hex")
    .slice(0, 12);
}

export function redactIdentifier(value: unknown): string | null {
  const hash = hashForLog(value);
  return hash ? `redacted:${hash}` : null;
}

export function classifyUserAgent(userAgent: string): string {
  for (const [family, pattern] of BOT_FAMILIES) {
    if (pattern.test(userAgent)) return family;
  }

  return userAgent ? "other" : "missing";
}

export function summarizeUserAgent(userAgent: string) {
  return {
    family: classifyUserAgent(userAgent),
    length: userAgent.length,
    hash: redactIdentifier(userAgent),
  };
}

export function redactLogDetails<T>(details: T): T {
  if (Array.isArray(details)) {
    return details.map((item) => redactLogDetails(item)) as T;
  }

  if (!details || typeof details !== "object") {
    return details;
  }

  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (value instanceof Error) {
      redacted[key] = {
        name: value.name,
        message: value.message,
      };
      continue;
    }

    if (SENSITIVE_KEY_PATTERN.test(key)) {
      redacted[`${key}Hash`] = redactIdentifier(value);
      continue;
    }

    redacted[key] = redactLogDetails(value);
  }

  return redacted as T;
}
