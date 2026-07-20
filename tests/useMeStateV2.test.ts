import { describe, expect, it, vi } from "vitest";
import { computed as vueComputed, ref } from "vue";
import { useMeStateV2 } from "../composables/useMeStateV2";

vi.stubGlobal("useState", (_key: string, init: () => any) => ref(init()));
vi.stubGlobal("computed", vueComputed);

describe("useMeStateV2 authenticated state", () => {
  it("resolves the signed-in user from the protected me endpoint", async () => {
    Object.defineProperty(process, "server", { value: false, configurable: true });
    vi.stubGlobal("$fetch", vi.fn().mockResolvedValue({
      id: "auth0|user", email: "member@example.com", firstName: "Maya", lastName: "Lee",
      entitlement: { plan: "free", subscription_status: "active", cancel_at_period_end: false },
    }));
    const { state, authReady, isLoggedIn, isLoggedOut, user, entitlement, resolve } =
      useMeStateV2();

    expect(state.value.status).toBe("loading");
    expect(authReady.value).toBe(false);

    await resolve();

    expect(state.value.status).toBe("logged-in");
    expect(isLoggedIn.value).toBe(true);
    expect(isLoggedOut.value).toBe(false);
    expect(user.value?.email).toBe("member@example.com");
    expect(entitlement.value?.plan).toBe("free");
    expect($fetch).toHaveBeenCalledWith("/api/meV2");
  });
});
