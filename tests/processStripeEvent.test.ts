import { beforeEach, describe, expect, it, vi } from "vitest";

const dbQueryMock = vi.fn();
const stripeSubscriptionRetrieveMock = vi.fn();
const upsertBillingSubscriptionMock = vi.fn();
const getBillingSubscriptionByStripeSubscriptionIdMock = vi.fn();
const syncEntitlementFromBillingSubscriptionMock = vi.fn();

vi.mock("~/server/repositories/db", () => ({
  db: {
    query: dbQueryMock,
  },
}));

vi.mock("~/server/services/billing/stripeClient", () => ({
  stripe: {
    subscriptions: {
      retrieve: stripeSubscriptionRetrieveMock,
    },
  },
}));

vi.mock("~/server/services/billing/upsertBillingSubscription", () => ({
  upsertBillingSubscription: upsertBillingSubscriptionMock,
}));

vi.mock(
  "~/server/services/billing/getBillingSubscriptionByStripeSubscriptionId",
  () => ({
    getBillingSubscriptionByStripeSubscriptionId:
      getBillingSubscriptionByStripeSubscriptionIdMock,
  }),
);

vi.mock(
  "~/server/services/billing/syncEntitlementFromBillingSubscription",
  () => ({
    syncEntitlementFromBillingSubscription:
      syncEntitlementFromBillingSubscriptionMock,
  }),
);

const { processStripeEvent } = await import(
  "../server/services/billing/processStripeEvent"
);

describe("processStripeEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reconciles the subscription from a completed checkout session", async () => {
    const stripeSubscription = {
      id: "sub_123",
      metadata: { userId: "user_123", plan: "monthly" },
    };
    const billingSubscription = {
      user_id: "user_123",
      plan: "monthly",
      subscription_status: "active",
      cancel_at_period_end: false,
      current_period_start: "2026-05-01T00:00:00.000Z",
      current_period_end: "2026-06-01T00:00:00.000Z",
      canceled_at: null,
    };

    dbQueryMock
      .mockResolvedValueOnce({ rows: [{ status: "processing" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            event_id: "evt_checkout",
            event_type: "checkout.session.completed",
            status: "processing",
            payload: {
              id: "evt_checkout",
              type: "checkout.session.completed",
              data: {
                object: {
                  id: "cs_test_123",
                  object: "checkout.session",
                  subscription: "sub_123",
                },
              },
            },
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });
    stripeSubscriptionRetrieveMock.mockResolvedValue(stripeSubscription);
    getBillingSubscriptionByStripeSubscriptionIdMock.mockResolvedValue(
      billingSubscription,
    );

    const result = await processStripeEvent("evt_checkout");

    expect(result).toEqual({
      ok: true,
      processed: true,
      eventType: "checkout.session.completed",
    });
    expect(stripeSubscriptionRetrieveMock).toHaveBeenCalledWith("sub_123");
    expect(upsertBillingSubscriptionMock).toHaveBeenCalledWith(
      stripeSubscription,
    );
    expect(getBillingSubscriptionByStripeSubscriptionIdMock).toHaveBeenCalledWith(
      "sub_123",
    );
    expect(syncEntitlementFromBillingSubscriptionMock).toHaveBeenCalledWith(
      billingSubscription,
    );
    expect(dbQueryMock).toHaveBeenLastCalledWith(
      expect.stringContaining("status = 'processed'"),
      ["evt_checkout"],
    );
  });

  it("ignores non-subscription checkout sessions", async () => {
    dbQueryMock
      .mockResolvedValueOnce({ rows: [{ status: "processing" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            event_id: "evt_checkout_payment",
            event_type: "checkout.session.completed",
            status: "processing",
            payload: {
              id: "evt_checkout_payment",
              type: "checkout.session.completed",
              data: {
                object: {
                  id: "cs_test_payment",
                  object: "checkout.session",
                  mode: "payment",
                  subscription: null,
                },
              },
            },
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await processStripeEvent("evt_checkout_payment");

    expect(result).toEqual({
      ok: true,
      processed: true,
      eventType: "checkout.session.completed",
    });
    expect(stripeSubscriptionRetrieveMock).not.toHaveBeenCalled();
    expect(dbQueryMock).toHaveBeenLastCalledWith(
      expect.stringContaining("status = 'processed'"),
      ["evt_checkout_payment"],
    );
  });

  it("marks checkout sessions without a subscription as failed", async () => {
    dbQueryMock
      .mockResolvedValueOnce({ rows: [{ status: "processing" }] })
      .mockResolvedValueOnce({
        rows: [
          {
            event_id: "evt_checkout_missing_subscription",
            event_type: "checkout.session.completed",
            status: "processing",
            payload: {
              id: "evt_checkout_missing_subscription",
              type: "checkout.session.completed",
              data: {
                object: {
                  id: "cs_test_missing_subscription",
                  object: "checkout.session",
                  mode: "subscription",
                  subscription: null,
                },
              },
            },
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const result = await processStripeEvent(
      "evt_checkout_missing_subscription",
    );

    expect(result).toEqual({
      ok: false,
      failed: true,
      eventType: "checkout.session.completed",
      message:
        "Could not extract subscription id from checkout session event evt_checkout_missing_subscription",
    });
    expect(stripeSubscriptionRetrieveMock).not.toHaveBeenCalled();
    expect(dbQueryMock).toHaveBeenLastCalledWith(
      expect.stringContaining("status = 'failed'"),
      [
        "evt_checkout_missing_subscription",
        "Could not extract subscription id from checkout session event evt_checkout_missing_subscription",
      ],
    );
  });
});
