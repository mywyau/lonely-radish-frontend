// // https://nuxt.com/docs/api/configuration/nuxt-config

export default defineNuxtConfig({
  modules: ["@nuxtjs/tailwindcss"],

  // image: false, // ⛔ force-disable Nuxt Image

  nitro: {
    preset: "vercel",
    routeRules: {
      // HTML pages
      "/**": {
        headers: {
          "Cache-Control": "no-cache",
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

  vite: {
    build: {
      cssCodeSplit: false,
    },
  },

  runtimeConfig: {
    auth0ClientSecret: process.env.AUTH0_CLIENT_SECRET,
    authSessionSecret: process.env.AUTH_SESSION_SECRET || process.env.AUTH0_CLIENT_SECRET,
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
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      supabasePublishableKey: process.env.NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  },

  app: {
    head: {
      htmlAttrs: {
        lang: "en",
      },
      titleTemplate: (titleChunk) => {
        return titleChunk
          ? `${titleChunk} · Lonely Radish`
          : "Lonely Radish · Coffee-date dating";
      },
      meta: [
        {
          name: "description",
          content:
            "A casual dating app for low-pressure coffee dates, clear availability, and thoughtful introductions.",
        },
        {
          property: "og:site_name",
          content: "Lonely Radish",
        },
        {
          property: "og:type",
          content: "website",
        },
        {
          name: "twitter:card",
          content: "summary_large_image",
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
