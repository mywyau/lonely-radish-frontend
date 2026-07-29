import { randomUUID } from "node:crypto";
import { defineEventHandler, getHeader, getRequestURL, setHeader } from "h3";
import { redactIdentifier, summarizeUserAgent } from "~/server/utils/logging/redact";
import { startServerRequest } from "~/server/utils/telemetry";
import { normalizeTelemetryRoute } from "~/server/utils/telemetryConfig";

const SENSITIVE_PATH_PREFIXES = [
  "/api/auth",
  "/api/stripe",
  "/api/account",
  "/api/billing",
  "/api/worker",
];

const TRAFFIC_SAMPLE_RATE = 0.02;

function shouldSkipPath(pathname: string): boolean {
  return (
    pathname.startsWith("/_nuxt") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap")
  );
}

function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default defineEventHandler((event) => {
  const startedAt = Date.now();
  const url = getRequestURL(event);

  if (shouldSkipPath(url.pathname)) {
    return;
  }

  const method = event.node.req.method || "GET";
  const incomingRequestId = getHeader(event, "x-request-id");
  const requestId = incomingRequestId && /^[a-zA-Z0-9._:-]{1,128}$/.test(incomingRequestId)
    ? incomingRequestId
    : randomUUID();
  setHeader(event, "x-request-id", requestId);
  const telemetry = startServerRequest(method, Object.fromEntries(event.headers.entries()));
  let completed = false;

  const finish = (statusCode: number) => {
    if (completed) return;
    completed = true;
    const durationMs = Date.now() - startedAt;
    const route = event.context.matchedRoute?.path || normalizeTelemetryRoute(url.pathname);
    telemetry.finish(route, statusCode, durationMs);
    const userAgent = getHeader(event, "user-agent") || "";
    const referrer = getHeader(event, "referer") || null;
    const forwardedFor = getHeader(event, "x-forwarded-for") || null;

    const sensitivePath = isSensitivePath(url.pathname);
    const isError = statusCode >= 400;
    const isSlow = durationMs >= 2500;
    const sampled = Math.random() < TRAFFIC_SAMPLE_RATE;

    if (!isError && !sensitivePath && !isSlow && !sampled) {
      return;
    }

    console.log(
      JSON.stringify({
        event: "request_telemetry",
        method,
        path: route,
        statusCode,
        durationMs,
        requestId,
        sensitivePath,
        isSlow,
        ipHash: redactIdentifier(forwardedFor),
        referrerHash: redactIdentifier(referrer),
        userAgentSummary: summarizeUserAgent(userAgent),
        timestamp: new Date().toISOString(),
      }),
    );
  };

  event.node.res.once("finish", () => finish(event.node.res.statusCode || 200));
  event.node.res.once("close", () => finish(event.node.res.writableEnded
    ? event.node.res.statusCode || 200
    : 499));
});
