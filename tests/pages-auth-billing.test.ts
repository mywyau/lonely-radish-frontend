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
    const preferences = readPage("preferences.vue");
    const nav = readFileSync(resolve(process.cwd(), "components/BlankNavBar.vue"), "utf8");

    expect(account).toContain("Mock profile");
    expect(account).toContain("Auth is disabled for now.");
    expect(account).toContain("Save mock profile");
    expect(account).toContain('to="/preferences"');
    expect(preferences).toContain("title: 'Match Preferences · Lonely Radish'");
    expect(preferences).toContain("Save preferences");
    expect(preferences).toContain("Preferences saved locally.");
    expect(nav).toContain("Match preferences");
    expect(account).not.toContain("/api/account/v2/profile");
    expect(account).not.toContain("getAccessToken");
  });
});
