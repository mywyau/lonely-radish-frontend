import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("business subscriptions", () => {
  it("keeps business accounts, venues, offers and subscriptions separate", () => {
    const migration = read(
      "docs/migrations/20260814_add_business_subscriptions.sql",
    );
    expect(migration).toContain("create table if not exists businesses");
    expect(migration).toContain("create table if not exists business_members");
    expect(migration).toContain("create table if not exists business_venues");
    expect(migration).toContain("create table if not exists business_offers");
    expect(migration).toContain(
      "create table if not exists business_subscriptions",
    );
    expect(migration).toContain("plan in ('standard','featured')");
    expect(migration).toContain("revoke all on table businesses");
  });

  it("uses ownership checks throughout protected business APIs", () => {
    expect(read("server/utils/requireBusiness.ts")).toContain(
      "business_members",
    );
    expect(read("server/api/business/offers/index.post.ts")).toContain(
      "requireBusiness(event)",
    );
    expect(read("server/api/business/venues/index.post.ts")).toContain(
      "requireBusiness(event)",
    );
    expect(read("server/api/business/portal.post.ts")).toContain(
      "requireBusiness(event)",
    );
  });

  it("validates database name constraints before inserting", () => {
    const onboarding = read("server/api/business/index.post.ts");
    expect(onboarding).toContain("Business name must be at least 2 characters");
    expect(onboarding).toContain("Venue name must be at least 2 characters");
    expect(read("pages/business/index.vue")).toContain('minlength="2"');
  });

  it("starts Stripe checkout with isolated business metadata", () => {
    const checkout = read("server/api/business/checkout.post.ts");
    expect(checkout).toContain("subscriptionKind: 'business'");
    expect(checkout).toContain("businessId: business.id");
    expect(checkout).toContain("STRIPE_BUSINESS_PRICE_ID_STANDARD");
    expect(checkout).toContain("STRIPE_BUSINESS_PRICE_ID_FEATURED");
    const processor = read("server/services/billing/processStripeEvent.ts");
    expect(processor).toContain(
      "subscription.metadata?.subscriptionKind === 'business'",
    );
    expect(processor).toContain("upsertBusinessSubscription(subscription)");
  });

  it("enforces free, standard and featured offer limits on the server", () => {
    const offers = read("server/api/business/offers/index.post.ts");
    expect(offers).toMatch(
      /plan\.rows\[0\]\?\.plan === ["']featured["']\s*\? 10/,
    );
    expect(offers).toMatch(
      /plan\.rows\[0\]\?\.plan === ["']standard["']\s*\? 5\s*:\s*1/,
    );
  });

  it("provides onboarding, location, offers and pricing pages", () => {
    const dashboard = read("pages/business/index.vue");
    expect(dashboard).toContain(
      "Create your business profile",
    );
    expect(dashboard.match(/business-action-tile/g)?.length).toBeGreaterThanOrEqual(8);
    expect(dashboard).toContain("transform: translateY(-4px)");
    expect(dashboard).toContain("prefers-reduced-motion: reduce");
    expect(read("pages/business/offers.vue")).toContain("Create an offer");
    expect(read("pages/business/offers.vue")).toContain("Customer preview");
    expect(read("pages/business/offers.vue")).toContain("@click=\"previewOffer = offer\"");
    expect(read("pages/business/offers.vue")).toContain("How your offer will appear");
    expect(read("pages/business/venues.vue")).toContain("Add another location");
    expect(read("pages/business/pricing.vue")).toContain(
      "Business subscriptions",
    );
    const pricing = read("pages/business/pricing.vue");
    expect(pricing).toContain("Every plan includes approved locations");
    expect(pricing).toContain("multi-location campaigns");
    expect(pricing).toContain("One-time redemption codes");
    expect(pricing).not.toContain("One venue");
    expect(pricing).not.toContain("Offer scheduling");
    expect(pricing).not.toContain("as they launch");
    expect(dashboard).not.toContain(
      "Add more offers, multi-location campaigns and priority offer placement",
    );
    expect(read("components/BlankNavBar.vue")).toContain("Business login");
  });

  it("separates business authentication and dating navigation", () => {
    const migration = read(
      "docs/migrations/20260815_add_business_account_type.sql",
    );
    expect(migration).toContain("account_type in ('personal','business')");
    expect(migration).toContain("set account_type='business'");
    const login = read("server/api/auth/login.get.ts");
    expect(login).toContain("query.intent === 'business'");
    const callback = read("server/api/auth/callback.get.ts");
    expect(callback).toContain("account_type === 'business'");
    expect(callback).toContain("returnTo.startsWith('/business')");
    const auth = read("composables/useAuth.ts");
    expect(auth).toContain("intent=business&mode=switch");
    expect(auth).toContain("intent=business&mode=signup");
    const app = read("app.vue");
    expect(app).toContain('<BusinessNavBar v-if="businessShell');
    const businessNav = read("components/BusinessNavBar.vue");
    expect(businessNav).toMatch(/label:\s*['"]Dashboard['"]/);
    expect(businessNav).toMatch(/label:\s*['"]Offers['"]/);
    expect(businessNav).toMatch(/to:\s*['"]\/business\/redeem['"]/);
    expect(businessNav).not.toContain("Matches & plans");
    expect(businessNav).not.toContain("Match preferences");
    expect(read("middleware/account-mode.global.ts")).toContain(
      "accountType.value === 'business'",
    );
    const businessOnly = read("middleware/business-only.ts");
    expect(businessOnly).toContain("sessionMode.value === 'business'");
    expect(businessOnly).toContain("!hasBusiness.value");
    expect(businessOnly).not.toContain("'/api/account/mode'");
    expect(businessOnly).toContain("to.path !== '/business'");
    expect(businessOnly).toContain("onboarding:'required'");
    expect(read("pages/business/index.vue")).toMatch(
      /Complete your\s+business profile before using the rest of the business portal\./,
    );
    const personalNav = read("components/BlankNavBar.vue");
    expect(personalNav.indexOf("<template v-else>")).toBeLessThan(
      personalNav.indexOf(">Business login"),
    );
  });
});
