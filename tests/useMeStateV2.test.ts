import { describe, expect, it, vi } from "vitest";
import { computed as vueComputed, ref } from "vue";
import { useMeStateV2 } from "../composables/useMeStateV2";

vi.stubGlobal("useState", (_key: string, init: () => any) => ref(init()));
vi.stubGlobal("computed", vueComputed);

describe("useMeStateV2 mock state", () => {
  it("provides a logged-in demo user without remote auth", async () => {
    const { state, authReady, isLoggedIn, isLoggedOut, user, entitlement, resolve } =
      useMeStateV2();

    expect(state.value.status).toBe("logged-in");
    expect(authReady.value).toBe(true);
    expect(isLoggedIn.value).toBe(true);
    expect(isLoggedOut.value).toBe(false);
    expect(user.value.email).toBe("demo@lonelyradish.app");
    expect(entitlement.value.plan).toBe("free");

    await resolve();

    expect(state.value.status).toBe("logged-in");
  });
});
