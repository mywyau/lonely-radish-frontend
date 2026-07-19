import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readPage } from "./pageTestUtils";

describe("mock access and billing page contracts", () => {
  it("replaces auth gates with prototype screens", () => {
    const signIn = readPage("please-sign-in.vue");
    const unavailable = readPage("content-not-available.vue");
    const comingSoon = readPage("coming-soon.vue");

    expect(signIn).toContain("title: 'Mock onboarding · Lonely Radish'");
    expect(signIn).toContain("Auth disabled for prototype");

    expect(unavailable).toContain("title: 'Feature preview · Lonely Radish'");
    expect(unavailable).toContain("Premium dating tools are mocked for now.");

    expect(comingSoon).toContain("title: 'Activity-date preview · Lonely Radish'");
    expect(comingSoon).toContain("Browse matches built around something you both want to do.");
  });

  it("keeps billing and upgrade flows local to the prototype", () => {
    const success = readPage("billing/success.vue");
    const cancel = readPage("billing/cancel.vue");
    const upgrade = readPage("upgrade/index.vue");

    expect(success).toContain("Payment successful");
    expect(success).toContain("No real payment or auth check was performed.");

    expect(cancel).toContain("Payment cancelled");
    expect(cancel).toContain("upgrade('monthly')");

    expect(upgrade).toContain("Upgrade your plan");
    expect(upgrade).not.toContain("/please-sign-in");

    const upgradeComposable = readFileSync(
      resolve(process.cwd(), "composables/useUpgrade.ts"),
      "utf8",
    );
    expect(upgradeComposable).toContain('path: "/billing/success"');
  });

  it("account page uses local mock data instead of protected API calls", () => {
    const account = readPage("account/v2/index.vue");
    const preferences = readPage("preferences/index.vue");
    const activityPreferences = readPage("preferences/activities.vue");
    const datingPreferences = readPage("preferences/dating.vue");
    const photos = readPage("photos.vue");
    const nav = readFileSync(resolve(process.cwd(), "components/BlankNavBar.vue"), "utf8");

    expect(account).toContain(">Profile<");
    expect(account).toContain("Auth is disabled for now.");
    expect(account).toContain("Save profile");
    expect(account).toContain('to="/preferences"');
    expect(account).toContain('to="/photos"');
    expect(preferences).toContain("title: 'Match Preferences · Lonely Radish'");
    expect(preferences).toContain("Save preferences");
    expect(preferences).toContain("Preferences saved locally.");
    expect(preferences).toContain('id="distance-unit"');
    expect(preferences).toContain('type="range"');
    expect(preferences).toContain('preferences.minimumAge');
    expect(preferences).toContain('preferences.maximumAge');
    expect(preferences).not.toContain('preferences.neighbourhood');
    expect(preferences).toContain('to="/preferences/activities"');
    expect(preferences).toContain('to="/preferences/dating"');
    expect(activityPreferences).toContain("title: 'Activity Interests · Lonely Radish'");
    expect(activityPreferences).toContain("Add your own activity");
    expect(activityPreferences).toContain("Save activity interests");
    expect(activityPreferences).toContain("name: 'Sports'");
    expect(activityPreferences).toContain("name: 'Gaming'");
    expect(datingPreferences).toContain("title: 'Dating Preferences · Lonely Radish'");
    expect(datingPreferences).toContain("Sexual preference");
    expect(datingPreferences).toContain("Racial and ethnic preferences");
    expect(datingPreferences).toContain("No racial or ethnic preference");
    expect(datingPreferences).toContain("Save dating preferences");
    expect(photos).toContain("title: 'Profile Photos · Lonely Radish'");
    expect(photos).toContain("Save mock photos");
    expect(photos).toContain("URL.createObjectURL");
    expect(photos).toContain("Photos saved locally.");
    expect(nav).toContain("Match preferences");
    expect(nav).toContain("Profile photos");
    expect(account).not.toContain("/api/account/v2/profile");
    expect(account).not.toContain("getAccessToken");
  });
});
