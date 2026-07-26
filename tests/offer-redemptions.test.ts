import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createOfferClaimCode,
  parseOfferClaimCode,
} from "../server/utils/offerClaimCode";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");
const secret = "offer-claim-test-secret-with-more-than-thirty-two-bytes";
const claimId = "2b7bb0e2-384c-4fe1-8e17-1e2edb495c5f";

describe("offer claims and redemptions", () => {
  it("creates human-friendly codes with keyed lookup digests", () => {
    const code = createOfferClaimCode(claimId, 3, secret);
    expect(code).toMatch(
      /^LR-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/,
    );
    expect(
      parseOfferClaimCode(code.toLowerCase().replaceAll("-", " "), secret)
        ?.normalizedCode,
    ).toBe(code);
    expect(
      parseOfferClaimCode(code, `${secret}-different`)?.codeDigest,
    ).not.toEqual(parseOfferClaimCode(code, secret)?.codeDigest);
    expect(parseOfferClaimCode("not-a-code", secret)).toBeNull();
  });

  it("requires a strong server-side signing secret", () => {
    expect(() => createOfferClaimCode(claimId, 1, "short")).toThrow(
      "at least 32 bytes",
    );
  });

  it("stores one private claim per member and offer", () => {
    const migration = read("docs/migrations/20260818_add_offer_claims.sql");
    expect(migration).toContain("unique (offer_id,claimant_user_id)");
    expect(migration).toContain("code_digest bytea not null unique");
    expect(migration).toContain(
      "alter table business_offer_claims enable row level security",
    );
    expect(migration).toContain(
      "claimant_user_id text not null references users(id) on delete cascade",
    );
  });

  it("uses personal-account checks, rate limits, and atomic redemption", () => {
    const claim = read("server/api/offers/[id]/claim.post.ts");
    const redeem = read("server/api/business/offer-claims/redeem.post.ts");
    expect(claim).toContain("requirePersonalUser(event)");
    expect(claim).toContain("enforceRateLimit");
    expect(claim).toContain("pg_advisory_xact_lock");
    expect(redeem).toContain("requireBusiness(event)");
    expect(redeem).toContain("for update of c");
    expect(redeem).toContain("set status='redeemed'");
  });

  it("allows a code only at the offer's assigned venue", () => {
    const redeem = read("server/api/business/offer-claims/redeem.post.ts");
    const page = read("pages/business/redeem.vue");
    expect(redeem).toContain('text(body.venueId, "Venue"');
    expect(redeem).toContain("and v.id=$3 and v.status='active'");
    expect(page).toContain("venueId: selectedVenueId.value");
    expect(page).toContain("This device is redeeming for");
    expect(read("pages/business/index.vue")).toContain('to="/business/redeem"');
  });

  it("provides QR display and camera scanning with manual fallback", () => {
    const memberPage = read("pages/offers.vue");
    const businessPage = read("pages/business/redeem.vue");
    expect(memberPage).toContain("import('qrcode')");
    expect(memberPage).toContain("Ask the venue to scan this code");
    expect(businessPage).toContain("import('qr-scanner')");
    expect(businessPage).toContain("preferredCamera: 'environment'");
    expect(businessPage).toContain("Camera frames stay on this device");
    expect(businessPage).toContain("or enter manually");
  });

  it("keeps member identity out of business redemption responses", () => {
    const history = read("server/api/business/offer-claims/index.get.ts");
    expect(history).not.toContain("claimant_user_id");
    expect(history).not.toContain("proposal_id");
    expect(read("pages/business/redeem.vue")).toContain("Privacy by design");
  });
});
