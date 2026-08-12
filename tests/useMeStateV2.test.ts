import { describe, expect, it, vi } from "vitest";
import { computed as vueComputed, ref } from "vue";
import { useMeStateV2 } from "../composables/useMeStateV2";

vi.stubGlobal("useState", (_key: string, init: () => any) => ref(init()));
vi.stubGlobal("computed", vueComputed);

describe("useMeStateV2 authenticated state", () => {
  it("resolves the signed-in user from the protected me endpoint", async () => {
    Object.defineProperty(process, "server", { value: false, configurable: true });
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({
      user: { id: "auth0|user", email: "member@example.com", firstName: "Maya", lastName: "Lee",
        entitlement: { plan: "free", subscription_status: "active", cancel_at_period_end: false } },
      accountType: "personal", sessionMode: "personal", hasBusiness: false, isAdmin: false,
      onboardingComplete: true, matchCount: 2, unreadNotificationCount: 3, activeMatchLimit: 5,
      refreshedAt: new Date().toISOString(),
    }));
    const { state, authReady, isLoggedIn, isLoggedOut, user, entitlement, matchCount,
      unreadNotificationCount, adjustMatchCount, adjustUnreadNotificationCount, resolve } =
      useMeStateV2();

    expect(state.value.status).toBe("loading");
    expect(authReady.value).toBe(false);

    await resolve();

    expect(state.value.status).toBe("logged-in");
    expect(isLoggedIn.value).toBe(true);
    expect(isLoggedOut.value).toBe(false);
    expect(user.value?.email).toBe("member@example.com");
    expect(entitlement.value?.plan).toBe("free");
    expect(matchCount.value).toBe(2);
    expect(unreadNotificationCount.value).toBe(3);
    adjustMatchCount(1);
    adjustUnreadNotificationCount(-1);
    expect(matchCount.value).toBe(3);
    expect(unreadNotificationCount.value).toBe(2);
    await resolve();
    expect($fetch).toHaveBeenCalledTimes(1);
    expect($fetch).toHaveBeenCalledWith("/api/bootstrap");
  });

  it("treats only a 401 response as logged out", async () => {
    Object.defineProperty(process, "server", { value: false, configurable: true });
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue({ response: { status: 401 } }));
    const { state, isLoggedOut, isUnavailable, resolve } = useMeStateV2();

    await resolve();

    expect(state.value.status).toBe("logged-out");
    expect(isLoggedOut.value).toBe(true);
    expect(isUnavailable.value).toBe(false);
  });

  it("does not turn a temporary backend failure into a logout", async () => {
    Object.defineProperty(process, "server", { value: false, configurable: true });
    vi.stubGlobal("$fetch", vi.fn().mockRejectedValue({ response: { status: 503 } }));
    const { state, isLoggedOut, isUnavailable, resolve } = useMeStateV2();

    await resolve();

    expect(state.value.status).toBe("unavailable");
    expect(isLoggedOut.value).toBe(false);
    expect(isUnavailable.value).toBe(true);
  });
});
