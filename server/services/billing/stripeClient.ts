import Stripe from "stripe";

function createMockStripe() {
  if (process.env.NODE_ENV !== "test") {
    console.warn("[stripe] Missing STRIPE_SECRET_KEY; using mock Stripe client");
  }

  return {
    checkout: {
      sessions: {
        async create() {
          return {
            id: "cs_mock_local",
            url: "/billing/success?mock=1",
          };
        },
      },
    },
    billingPortal: {
      sessions: {
        async create() {
          return {
            id: "bps_mock_local",
            url: "/account/v2?mockBillingPortal=1",
          };
        },
      },
    },
    customers: {
      async create() {
        return {
          id: "cus_mock_local",
        };
      },
    },
    subscriptions: {
      async retrieve(id: string) {
        return {
          id,
          customer: "cus_mock_local",
          status: "active",
          items: {
            data: [],
          },
          cancel_at_period_end: false,
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        };
      },
      async list() {
        return {
          data: [],
        };
      },
      async cancel(id: string) {
        return {
          id,
          status: "canceled",
        };
      },
    },
    webhooks: {
      constructEvent(rawBody: Buffer | string) {
        const parsed = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

        try {
          return JSON.parse(parsed);
        } catch {
          return {
            id: "evt_mock_local",
            type: "mock.local",
            data: {
              object: {},
            },
          };
        }
      },
    },
  };
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })
  : createMockStripe();
