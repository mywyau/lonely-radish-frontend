import type { Entitlement, MeState, MeUser } from "~/types/auth/entitlements";

const mockEntitlement: Entitlement = {
  plan: "free",
  subscription_status: "active",
  cancel_at_period_end: false,
};

const mockUser: MeUser = {
  id: "local-demo-user",
  email: "demo@lonelyradish.app",
  firstName: "Maya",
  lastName: "Lee",
  entitlement: mockEntitlement,
};

export function useMeStateV2() {
  const state = useState<MeState>("meStateV2", () => ({
    status: "logged-in",
    user: mockUser,
  }));

  const resolve = async () => {
    state.value = {
      status: "logged-in",
      user: mockUser,
    };
  };

  const authReady = computed(() => true);
  const isLoading = computed(() => false);
  const isLoggedIn = computed(() => true);
  const isLoggedOut = computed(() => false);
  const user = computed<MeUser>(() => mockUser);
  const entitlement = computed<Entitlement>(() => mockEntitlement);
  const isCanceling = computed(() => false);
  const currentPeriodEnd = computed<Date | null>(() => null);

  return {
    state,
    authReady,
    isLoading,
    isLoggedIn,
    isLoggedOut,
    user,
    entitlement,
    isCanceling,
    currentPeriodEnd,
    resolve,
  };
}
