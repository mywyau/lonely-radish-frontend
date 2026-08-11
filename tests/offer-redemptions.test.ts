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

  it("starts with private claim records before later date-scoped policy migrations", () => {
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

  it("allows one redemption per offer and confirmed couple date", () => {
    const migration = read(
      "docs/migrations/20260822_offer_once_per_confirmed_date.sql",
    );
    const claim = read("server/api/offers/[id]/claim.post.ts");
    const claims = read("server/api/offer-claims/index.get.ts");
    const page = read("pages/offers.vue");
    expect(migration).toContain(
      "business_offer_claims_offer_proposal_unique",
    );
    expect(migration).toContain("on business_offer_claims(offer_id,proposal_id)");
    expect(migration).toContain(
      "drop constraint if exists business_offer_claims_offer_id_claimant_user_id_key",
    );
    expect(claim).toContain('text(body.proposalId, "Confirmed date", 80, true)');
    expect(claim).toContain("where offer_id=$1 and proposal_id=$2");
    expect(claim).toContain(
      "This offer has already been used for this confirmed date",
    );
    expect(claims).toContain("proposal.status='accepted'");
    expect(page).toContain("once per confirmed couple date");
    expect(page).toContain("Your date has the active redemption code");
  });

  it("uses personal-account checks, rate limits, and atomic redemption", () => {
    const claim = read("server/api/offers/[id]/claim.post.ts");
    const redeem = read("server/api/business/offer-claims/redeem.post.ts");
    expect(claim).toContain("requirePersonalUser(event)");
    expect(claim).toContain("enforceRateLimit");
    expect(claim).toContain("pg_advisory_xact_lock");
    expect(redeem).toContain("requireBusiness(event)");
    expect(redeem).toContain("redeemOfferClaim");
  });

  it("allows a code only at a participating active venue", () => {
    const redeem = read("server/services/offerRedemption.ts");
    const endpoint = read("server/api/business/offer-claims/redeem.post.ts");
    const page = read("pages/business/redeem.vue");
    expect(endpoint).toContain('text(body.venueId, "Venue"');
    expect(redeem).toContain("o.venue_scope='all'");
    expect(redeem).toContain("o.venue_scope='selected'");
    expect(redeem).toContain("redeemed_venue_id=$3");
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

  it("keeps a large offer catalogue compact, filtered, and paginated", () => {
    const page = read("pages/offers.vue");
    const api = read("server/api/offers/index.get.ts");
    expect(page).toContain("Search offers");
    expect(page).toContain("View details");
    expect(page).toContain("Load more offers");
    expect(page).toContain("pinnedClaims");
    expect(page).toContain("revealClaimQr");
    expect(api).toContain("decodeCursor");
    expect(api).toContain("pageRows");
    expect(api).toContain("pageSize = 20");
    expect(api).toContain("discountType");
    expect(api).toContain("location");
  });

  it("lets members attach an offer to one of their confirmed dates", () => {
    const matches = read("pages/matches/index.vue");
    const memberPage = read("pages/offers.vue");
    const claims = read("server/api/offer-claims/index.get.ts");
    const matchesApi = read("server/api/matches/index.get.ts");
    expect(matches).toContain("`/offers?proposal=${match.proposalId}`");
    expect(matches).toContain("Attach an offer");
    expect(memberPage).toContain("Attach this offer");
    expect(memberPage).toContain("Replace attached offer");
    expect(memberPage).toContain("attachedToCurrentDate");
    expect(claims).toContain('proposal_id as "proposalId"');
    expect(matchesApi).toContain('c.proposal_id=limited."proposalId"');
    expect(matchesApi).toContain('as "attachedOfferTitle"');
    expect(read("server/api/offers/[id]/claim.post.ts")).toContain(
      "set proposal_id=null",
    );
  });

  it("keeps member identity out of business redemption responses", () => {
    const history = read("server/api/business/offer-claims/index.get.ts");
    expect(history).not.toContain("claimant_user_id");
    expect(history).not.toContain("proposal_id");
    expect(read("pages/business/redeem.vue")).toContain("What you can see");
  });
});
