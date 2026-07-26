import { createHmac } from "node:crypto";
import { createError } from "h3";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function validateSecret(secret: string) {
  if (Buffer.byteLength(secret, "utf8") < 32)
    throw new Error("Offer claim secret must contain at least 32 bytes");
}

export function createOfferClaimCode(
  claimId: string,
  tokenVersion: number,
  secret: string,
) {
  validateSecret(secret);
  if (
    !uuidPattern.test(claimId) ||
    !Number.isSafeInteger(tokenVersion) ||
    tokenVersion < 1
  ) {
    throw new Error("Invalid offer claim code payload");
  }
  const bytes = createHmac("sha256", secret)
    .update(`offer-claim:${claimId.toLowerCase()}:${tokenVersion}`)
    .digest();
  let bits = bytes.readBigUInt64BE(0) >> 4n;
  let value = "";
  for (let index = 0; index < 12; index += 1) {
    value = alphabet[Number(bits & 31n)] + value;
    bits >>= 5n;
  }
  return `LR-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
}

export function parseOfferClaimCode(code: string, secret: string) {
  validateSecret(secret);
  const compact = code.trim().toUpperCase().replace(/[\s-]/g, "");
  if (!/^LR[A-HJ-NP-Z2-9]{12}$/.test(compact)) return null;
  const value = compact.slice(2);
  const normalizedCode = `LR-${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
  const codeDigest = createHmac("sha256", secret)
    .update(`offer-claim-code:${normalizedCode}`)
    .digest();
  return { normalizedCode, codeDigest };
}

export function offerClaimCodeDigest(code: string, secret: string) {
  const parsed = parseOfferClaimCode(code, secret);
  if (!parsed) throw new Error("Invalid offer claim code");
  return parsed.codeDigest;
}

export function requireOfferClaimSecret(event: any) {
  const secret = String(useRuntimeConfig(event).offerClaimSecret || "");
  if (Buffer.byteLength(secret, "utf8") < 32) {
    throw createError({
      statusCode: 503,
      statusMessage: "Offer claiming is temporarily unavailable",
    });
  }
  return secret;
}
