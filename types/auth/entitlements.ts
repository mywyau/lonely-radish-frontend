export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface Entitlement {
  plan: "free" | "monthly" | "quarterly" | "yearly";
  subscription_status: SubscriptionStatus;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
  canceled_at?: string;
}

export interface MeUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  entitlement: Entitlement;
}

export interface AppBootstrap {
  user: MeUser;
  accountType: "personal" | "business";
  sessionMode: "personal" | "business";
  hasBusiness: boolean;
  isAdmin: boolean;
  onboardingComplete: boolean;
  matchCount: number;
  unreadNotificationCount: number;
  activeMatchLimit: number;
  refreshedAt: string;
}

export type MeState =
  | { status: "loading" }
  | { status: "logged-out" }
  | { status: "unavailable"; message: string }
  | { status: "logged-in"; user: MeUser; bootstrap: AppBootstrap };
