// // https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  compatibilityDate: "2026-07-27",
  modules: ["@nuxtjs/tailwindcss"],

  // image: false, // ⛔ force-disable Nuxt Image

  nitro: {
    preset: "vercel",
    routeRules: {
      // HTML pages
      "/**": {
        headers: {
          "Cache-Control": "no-cache",
          "Content-Security-Policy": [
            "default-src 'self'",
            "base-uri 'self'",
            "connect-src 'self' https://*.supabase.co https://*.vercel-insights.com",
            "font-src 'self' data:",
            "form-action 'self' https://*.auth0.com",
            "frame-ancestors 'none'",
            "img-src 'self' data: blob: https:",
            "media-src 'self' blob:",
            "object-src 'none'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "worker-src 'self' blob:",
            "upgrade-insecure-requests",
          ].join("; "),
          "Permissions-Policy": "camera=(self), geolocation=(), microphone=()",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
        },
      },

      // Static Nuxt assets (hashed, safe to cache)
      "/_nuxt/**": {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
    },
  },

  features: {
    // Keep production CSS in hashed assets instead of embedding the whole app's
    // stylesheet in every HTML response. This also makes client navigation use
    // the same versioned styles as a full page load.
    inlineStyles: false,
  },

  runtimeConfig: {
    auth0ClientSecret: process.env.AUTH0_CLIENT_SECRET,
    authSessionSecret:
      process.env.AUTH_SESSION_SECRET || process.env.AUTH0_CLIENT_SECRET,
    offerClaimSecret:
      process.env.OFFER_CLAIM_SECRET ||
      (process.env.NODE_ENV !== "production"
        ? process.env.AUTH_SESSION_SECRET || process.env.AUTH0_CLIENT_SECRET
        : undefined),
    qstashUrl: process.env.QSTASH_URL,
    qstashCurrentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
    qstashNextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
    qstashToken: process.env.QSTASH_TOKEN,
    public: {
      appVersion: process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString(),
      cdnBase: process.env.NUXT_PUBLIC_CDN_BASE,
      auth0Domain: process.env.AUTH0_DOMAIN,
      auth0ClientId: process.env.AUTH0_CLIENT_ID,
      auth0Audience: process.env.AUTH0_AUDIENCE,
      siteUrl: process.env.SITE_URL || "http://localhost:3000",
      supabaseUrl:
        process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  },

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      meta: [
        {
          name: "theme-color",
          content: "#FBF7F1",
        },
      ],
      link: [
        {
          rel: "icon",
          type: "image/png",
          href: "/favicon-32x32.png",
        },
        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
        },
      ],
    },
  },
});
