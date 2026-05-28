import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { readPage } from "./pageTestUtils";

describe("auth and billing page contracts", () => {
  it("auth and access pages keep sign-in and availability messaging", () => {
    const signIn = readPage("please-sign-in.vue");
    const unavailable = readPage("content-not-available.vue");
    const comingSoon = readPage("coming-soon.vue");

    expect(signIn).toContain("title: 'Please sign in · TaroTea'");
    expect(signIn).toContain("Sign in / Create account");

    expect(unavailable).toContain("title: 'Coming soon · TaroTea'");
    expect(unavailable).toContain("Content Not Available");

    expect(comingSoon).toContain("title: 'Coming soon · TaroTea'");
    expect(comingSoon).toContain("Coming soon");
  });

  it("billing and upgrade pages keep checkout recovery calls to action", () => {
    const success = readPage("billing/success.vue");
    const cancel = readPage("billing/cancel.vue");
    const upgrade = readPage("upgrade/index.vue");

    expect(success).toContain("/api/billing/me");
    expect(success).toContain("Payment successful");
    expect(success).toContain("Continue learning");

    expect(cancel).toContain("Payment cancelled");
    expect(cancel).toContain("upgrade('monthly')");

    expect(upgrade).toContain("Upgrade your plan");
    expect(upgrade).toContain('NuxtLink to="/refund-policy"');
    expect(upgrade).toContain("query: { redirect: '/upgrade' }");
    const upgradeComposable = readFileSync(
      resolve(process.cwd(), "composables/useUpgrade.ts"),
      "utf8",
    );
    expect(upgradeComposable).toContain("window.location.replace(res.url)");
  });
  it("account page keeps Stripe return layout recovery safeguards", () => {
    const account = readPage("account/v2/index.vue");

    expect(account).toContain("pageRestoreKey");
    expect(account).toContain("refreshAccountAfterStripeReturn");
    expect(account).toContain(
      'window.addEventListener("pageshow", handlePageShow)',
    );
    expect(account).toContain("min-h-[calc(100dvh-56px)] w-full flex-none");
    expect(account).toContain("w-full min-w-0 rounded-lg");
    expect(account).toContain("window.location.replace(url)");
  });
});
