import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("core journey recovery", () => {
  it("does not present a discovery outage as an empty match pool", () => {
    const page = read("pages/activities/[slug].vue");
    expect(page).toContain("We couldn’t load anyone just now");
    expect(page).toContain("Try again in a moment.");
    expect(page).toContain('@click="loadCandidates()"');
  });

  it("keeps demo profiles out of production profile routes", () => {
    const page = read("pages/profiles/[slug].vue");
    expect(page).toContain(
      "allowDemoProfile.value = import.meta.dev && status === 404",
    );
    expect(page).toContain("allowDemoProfile.value ? profiles");
    expect(page).toContain('@click="loadProfile"');
    const plan = read("pages/plans/[slug].vue");
    expect(plan).toContain(
      "allowDemoPlan.value = import.meta.dev && status === 404",
    );
    expect(plan).toContain('@click="loadPlanning"');
  });

  it("offers retry actions on core account journeys", () => {
    expect(read("pages/matches/index.vue")).toContain(
      '@click="loadDashboard"',
    );
    expect(read("pages/interests/sent.vue")).toContain(
      '@click="loadSentInterests"',
    );
    expect(read("pages/interests/received.vue")).toContain(
      '@click="loadReceivedInterests"',
    );
    expect(read("pages/notifications.vue")).toContain('@click="load()"');
    expect(read("pages/profile/preview.vue")).toContain(
      '@click="loadPreview"',
    );
  });

  it("keeps incomplete members out of discovery", () => {
    expect(read("server/api/activities/[slug]/people.get.ts")).toContain(
      "u.onboarding_completed_at is not null",
    );
    expect(read("server/api/profiles/[slug].get.ts")).toContain(
      "u.onboarding_completed_at is not null",
    );
  });

  it("tracks aggregate funnel events without member identifiers", () => {
    const analytics = read("utils/productAnalytics.ts");
    expect(analytics).toContain("track(name, properties)");
    const sources = [
      read("pages/onboarding.vue"),
      read("pages/activities/[slug].vue"),
      read("composables/useDailyInterest.ts"),
      read("pages/plans/[slug].vue"),
      read("pages/offers.vue"),
      read("pages/business/redeem.vue"),
    ].join("\n");
    for (const event of [
      "Onboarding Completed",
      "Discovery Loaded",
      "Interest Sent",
      "Date Proposal Sent",
      "Date Confirmed",
      "Offer Claimed",
      "Offer Redeemed",
    ]) {
      expect(sources).toContain(event);
    }
    expect(sources).not.toContain("trackProductEvent('Interest Sent', { profileSlug");
  });
});
