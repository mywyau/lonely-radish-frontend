import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("multi-venue offer campaigns", () => {
  it("models campaign applicability without duplicating offers", () => {
    const migration = read(
      "docs/migrations/20260819_add_multi_venue_offers.sql",
    );
    expect(migration).toContain("venue_scope in ('single','selected','all')");
    expect(migration).toContain(
      "create table if not exists business_offer_venues",
    );
    expect(migration).toContain("foreign key (offer_id,business_id)");
    expect(migration).toContain("foreign key (venue_id,business_id)");
    expect(migration).toContain(
      "select id,business_id,venue_id from business_offers",
    );
    expect(migration).toContain("redeemed_venue_id");
  });

  it("validates ownership and writes selected locations transactionally", () => {
    const create = read("server/api/business/offers/index.post.ts");
    expect(create).toContain("const venueScopes = new Set");
    for (const scope of ["single", "selected", "all"])
      expect(create).toContain(`"${scope}"`);
    expect(create).toContain("id=any($2::uuid[])");
    expect(create).toContain("business_offer_venues");
    expect(create).toMatch(/venueScope !== ["']all["']/);
    expect(create).toMatch(/client\.query\(["']begin["']\)/);
    expect(create).toContain("pg_advisory_xact_lock");
  });

  it("includes every future approved venue dynamically for all-location campaigns", () => {
    const discovery = read("server/api/offers/index.get.ts");
    const claim = read("server/api/offers/[id]/claim.post.ts");
    for (const source of [discovery, claim]) {
      expect(source).toContain("o.venue_scope='all'");
      expect(source).toContain("v.status='active'");
      expect(source).toContain("business_offer_venues");
    }
    expect(discovery).toContain("preview_position<=5");
    expect(discovery).toContain('"locationCount"');
  });

  it("records and reports the branch that actually redeemed the claim", () => {
    const redeem = read("server/api/business/offer-claims/redeem.post.ts");
    const history = read("server/api/business/offer-claims/index.get.ts");
    expect(redeem).toContain("redeemed_venue_id=$3");
    expect(redeem).toContain("venue_name=$4");
    expect(history).toContain("coalesce(c.redeemed_venue_id,o.venue_id)");
  });

  it("lets approved owners and managers add branches without publishing them immediately", () => {
    const endpoint = read("server/api/business/venues/index.post.ts");
    expect(endpoint).toMatch(/business\.status !== ["']active["']/);
    expect(endpoint).toContain("const managingRoles = new Set");
    expect(endpoint).toContain('"owner"');
    expect(endpoint).toContain('"manager"');
    expect(endpoint).toContain("enforceRateLimit");
    expect(endpoint).toContain("insert into business_venues");
    expect(endpoint).not.toContain("values($1,$2,$3,$4,$5,$6,'active')");
    expect(read("pages/business/venues.vue")).toContain(
      "submitted for venue approval",
    );
  });

  it("offers one, selected, and all-location choices in the merchant UI", () => {
    const page = read("pages/business/offers.vue");
    expect(page).toContain("One location");
    expect(page).toContain("Selected locations");
    expect(page).toContain("All locations");
    expect(page).toContain("Includes future approved branches automatically");
    expect(read("components/BusinessNavBar.vue")).toContain("/business/venues");
  });
});
