import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readPage } from "./pageTestUtils";

describe("auth and billing page contracts", () => {
  it("provides a real sign-in gate", () => {
    const signIn = readPage("please-sign-in.vue");
    const unavailable = readPage("content-not-available.vue");
    const comingSoon = readPage("coming-soon.vue");

    expect(signIn).toContain("title: 'Sign in · Lonely Radish'");
    expect(signIn).toContain("login(returnTo)");
    expect(signIn).toContain("signup(returnTo)");
    expect(signIn).toContain("Create account");

    expect(unavailable).toContain("title: 'Feature preview · Lonely Radish'");
    expect(unavailable).toContain("This part isn’t ready yet.");

    expect(comingSoon).toContain("title: 'Activity-date preview · Lonely Radish'");
    expect(comingSoon).toContain("Start with something you’d both enjoy doing.");
  });

  it("uses Stripe Checkout and confirms subscription activation", () => {
    const success = readPage("billing/success.vue");
    const cancel = readPage("billing/cancel.vue");
    const upgrade = readPage("upgrade/index.vue");

    expect(success).toContain("Payment received");
    expect(success).toContain("'/api/billing/me'");
    expect(success).toContain("hasPaidAccess");

    expect(cancel).toContain("Payment cancelled");
    expect(cancel).toContain("upgrade('monthly')");
    expect(cancel).toContain('const monthlyPrice = 7.99');
    expect(cancel).toContain('const quarterlyPrice = 19.99');
    expect(cancel).toContain('const yearlyPrice = 55.99');

    expect(upgrade).toContain("Want a little more room?");
    expect(upgrade).toContain('Free and paid plan limits');
    expect(upgrade).toContain('Up to 5 active activity interests');
    expect(upgrade).toContain('Up to 3 active matches');
    expect(upgrade).toContain('Up to 10 active activity interests');
    expect(upgrade).toContain('Up to 5 active matches');
    expect(upgrade).toContain("upgrade('quarterly')");
    expect(upgrade).toContain('Three-month plan');
    expect(upgrade).toContain('Your current plan:')
    expect(upgrade).toMatch(/Current\s+plan/)
    expect(upgrade).toContain("currentPlan === 'free'")
    expect(upgrade).toContain("isCurrentPlan('monthly')")
    expect(upgrade).toContain('onMounted(() => resolve())')
    expect(upgrade).toContain('const showPaidPlans = ref(false)')
    expect(upgrade).toContain(':aria-expanded="showPaidPlans"')
    expect(upgrade).toContain('id="paid-plan-options"')
    expect(upgrade).toContain('v-show="showPaidPlans"')
    expect(upgrade).not.toContain("/please-sign-in");

    const upgradeComposable = readFileSync(
      resolve(process.cwd(), "composables/useUpgrade.ts"),
      "utf8",
    );
    expect(upgradeComposable).toContain('"/api/stripe/checkout"');
    expect(upgradeComposable).toContain('external: true');
    expect(readFileSync(resolve(process.cwd(), "server/api/stripe/checkout.post.ts"), "utf8")).toContain('mode: "subscription"');
    expect(readFileSync(resolve(process.cwd(), "server/api/stripe/checkout.post.ts"), "utf8")).toContain('STRIPE_PRICE_ID_QUARTERLY');
    expect(readFileSync(resolve(process.cwd(), "docs/migrations/20260810_add_quarterly_subscription.sql"), "utf8")).toContain("'quarterly'");
    expect(readFileSync(resolve(process.cwd(), "server/api/stripe/v2/webhook.post.ts"), "utf8")).toContain('processStripeEvent');
  });

  it("protects the account page and saves authenticated profile names", () => {
    const account = readPage("account/v2/index.vue");
    const preferences = readPage("preferences/index.vue");
    const activityPreferences = readPage("preferences/activities.vue");
    const schedulePreferences = readPage("preferences/schedule.vue");
    const datingPreferences = readPage("preferences/dating.vue");
    const photos = readPage("photos.vue");
    const nav = readFileSync(resolve(process.cwd(), "components/BlankNavBar.vue"), "utf8");

    expect(account).toContain(">Profile<");
    expect(account).toContain('middleware: "logged-in"');
    expect(account).toContain("Signed in as {{ user?.email }}");
    expect(account).toContain("Save profile");
    const controls = readPage("account/controls.vue");
    expect(controls).toContain("const planLabel = computed")
    expect(controls).toContain("{{ isPaidPlan ? 'Paid' : 'Free' }}")
    expect(controls).toContain("'/api/stripe/portal'")
    expect(controls.indexOf('Your subscription')).toBeLessThan(controls.indexOf('Take a break'))
    expect(account).toContain('to="/account/controls"')
    expect(account).not.toContain("useMockProfile()");
    expect(account).not.toContain("persistProfile()");
    expect(account).toContain("profile.firstName");
    expect(account).toContain("'/api/profile/basics'")
    expect(account).toContain('Racial or ethnic identity')
    expect(nav).not.toContain("useMockProfile()");
    expect(nav).toContain('name.charAt(0).toLocaleUpperCase()');
    expect(account).not.toContain('>Match preferences</NuxtLink>');
    expect(account).not.toContain('>Profile photos</NuxtLink>');
    expect(preferences).toContain("title: 'Match Preferences · Lonely Radish'");
    expect(preferences).toContain("Save preferences");
    expect(preferences).toContain("Preferences saved.");
    expect(preferences).toContain('id="distance-unit"');
    expect(preferences).toContain('id="minimum-age"');
    expect(preferences).toContain('id="maximum-age"');
    expect(preferences).toContain('preferences.minimumAge');
    expect(preferences).toContain('preferences.maximumAge');
    expect(preferences).toContain('lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]');
    expect(preferences).toContain('<nav aria-label="Match preference sections"');
    expect(preferences).not.toContain('preferences.neighbourhood');
    expect(preferences).toContain('to="/preferences/activities"');
    expect(preferences).toContain('to="/preferences/interests"');
    expect(preferences).toContain('to="/preferences/dating"');
    expect(preferences).toContain('to="/preferences/schedule"');
    expect(preferences.indexOf('id="location-and-age"')).toBeLessThan(preferences.indexOf('to="/preferences/activities"'));
    expect(activityPreferences).toContain("title: 'Activity Interests · Lonely Radish'");
    expect(activityPreferences).toContain("Add your own {{ group.name.toLowerCase() }} activity");
    expect(activityPreferences).toContain("const selectionLimit = ref(5)");
    expect(activityPreferences).toContain("allow up to 10 activity interests");
    expect(activityPreferences).toContain("add up to 3 of your own activities inside each category");
    expect(schedulePreferences).toContain('class="mt-6 grid gap-3 md:grid-cols-2"');
    expect(activityPreferences).toContain("!limitReached.value");
    expect(activityPreferences).toContain("Save activity interests");
    expect(activityPreferences.indexOf('Your interests ({{ selected.length }}/{{ selectionLimit }})')).toBeLessThan(activityPreferences.indexOf('allow up to 10 activity interests'));
    expect(activityPreferences.indexOf('allow up to 10 activity interests')).toBeLessThan(activityPreferences.indexOf('v-for="group in groups"'));
    expect(activityPreferences).toContain("name: 'Sports'");
    expect(activityPreferences).toContain('customCount(group.name)')
    expect(activityPreferences).toContain('activities: selected.value')
    const activityApi = readFileSync(resolve(process.cwd(), 'server/api/preferences/activities.put.ts'), 'utf8')
    expect(activityApi).toContain('hasPaidAccess')
    expect(activityApi).toContain('selectionLimit')
    expect(activityApi).toContain('length > selectionLimit')
    expect(activityApi).toContain('length > 3')
    expect(activityPreferences).toContain("name: 'Gaming'");
    expect(datingPreferences).toContain("title: 'Dating Preferences · Lonely Radish'");
    expect(datingPreferences).toContain("Sexual orientation preference");
    expect(datingPreferences).toContain("Racial and ethnic preferences");
    expect(datingPreferences).toContain("openRaceEthnicityPreferenceLabel");
    expect(datingPreferences).toContain("Save dating preferences");
    expect(photos).toContain("title: 'Profile Photos · Lonely Radish'");
    expect(photos).toContain("Save photo order");
    expect(photos).toContain("uploadToSignedUrl");
    expect(photos).toContain("Photo order saved.");
    expect(nav).toContain("Match preferences");
    expect(nav).toContain('name.charAt(0).toLocaleUpperCase()');
    expect(nav).toContain("await resolve()");
    expect(nav).not.toContain("resolve({ force: true })");
    expect(nav).toContain("Profile photos");
    expect(account).toContain("/api/account/v2/profile");
    expect(account).not.toContain("getAccessToken");
  });
});
