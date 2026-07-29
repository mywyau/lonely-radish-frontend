import type { Entitlement, MeState, MeUser } from "~/types/auth/entitlements";

export function useMeStateV2() {
  const state = useState<MeState>("meStateV2", () => ({
    status: "loading",
  }));
  const resolved = useState<boolean>("meResolvedV2", () => false);

  const resolve = async ({ force = false } = {}) => {
    if (resolved.value && !force) return;
    if (process.server) return;
    const previous = state.value;
    state.value = { status: "loading" };
    try {
      state.value = { status: "logged-in", user: await $fetch<MeUser>("/api/meV2") };
    } catch (error: any) {
      const status = error?.statusCode || error?.response?.status || error?.data?.statusCode;
      const code = error?.data?.data?.code || error?.data?.code;
      if (code === "ACCOUNT_SUSPENDED" && useRoute().path !== "/account/suspended") {
        state.value = { status: "logged-out" };
        await navigateTo("/account/suspended");
      } else if (status === 401) {
        state.value = { status: "logged-out" };
      } else if (previous.status === "logged-in") {
        state.value = previous;
      } else {
        state.value = {
          status: "unavailable",
          message: "We could not verify your session. Check your connection and try again.",
        };
      }
    } finally {
      resolved.value = state.value.status !== "unavailable";
    }
  };

  const authReady = computed(() => state.value.status !== "loading");
  const isLoading = computed(() => state.value.status === "loading");
  const isLoggedIn = computed(() => state.value.status === "logged-in");
  const isLoggedOut = computed(() => state.value.status === "logged-out");
  const isUnavailable = computed(() => state.value.status === "unavailable");
  const user = computed<MeUser | null>(() => state.value.status === "logged-in" ? state.value.user : null);
  const entitlement = computed<Entitlement | null>(() => user.value?.entitlement ?? null);
  const isCanceling = computed(() => entitlement.value?.cancel_at_period_end === true);
  const currentPeriodEnd = computed<Date | null>(() => entitlement.value?.current_period_end ? new Date(entitlement.value.current_period_end) : null);

  return {
    state,
    authReady,
    isLoading,
    isLoggedIn,
    isLoggedOut,
    isUnavailable,
    user,
    entitlement,
    isCanceling,
    currentPeriodEnd,
    resolve,
  };
}
