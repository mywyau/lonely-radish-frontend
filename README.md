# TaroTea 🍵

TaroTea is a focused web app for learning **real, spoken Cantonese** through vocabulary, audio, and interactive quizzes.

The goal is not academic Cantonese, but the words and phrases you actually hear and use in daily life.

---

## Features

- 📚 Structured vocabulary by level and topic
- 🧠 Word quizzes and audio listening quizzes
- 🔊 Native Cantonese audio
- 🔐 Auth0 authentication (Google login)
- 💳 Stripe subscriptions (Free / Pro)
- 🗑️ Full account deletion with data and billing cleanup

---

## Tech Stack

- **Frontend:** Nuxt 3 + Vue + Tailwind CSS
- **Backend:** Nuxt server routes (Nitro)
- **Auth:** Auth0 (JWT-based)
- **Billing:** Stripe Checkout + Billing Portal
- **Database:** PostgreSQL (Supabase)
- **Content delivery:** Vocabulary JSON and audio served from CDN

---

## Architecture Overview

- Auth0 user ID (`sub`) is the primary user identifier
- Users are created on first login
- Vocabulary data is stored as JSON and fetched from a CDN
- Stripe is the source of truth for billing
- Entitlements are mirrored locally for fast access checks

---

## Account Deletion

Users can permanently delete their account.

Deletion flow:
1. User confirms deletion
2. Stripe subscriptions are canceled
3. App data is deleted
4. Auth0 user is removed

If billing cancellation fails, deletion is blocked and must be retried.

---

## Local Development

### Authentication configuration

Authentication uses Auth0's Authorization Code flow for a Regular Web Application.
Copy `.env.example` to `.env`, then configure these Auth0 application URLs:

- Allowed Callback URL: `${SITE_URL}/api/auth/callback`
- Allowed Logout URL: `${SITE_URL}`
- Allowed Web Origin: `${SITE_URL}`

Keep `AUTH0_CLIENT_SECRET` and `AUTH_SESSION_SECRET` server-side. Neither belongs in
`runtimeConfig.public` or a `NUXT_PUBLIC_*` variable.

### 1) Clean local build artifacts

```bash
rm -rf .nuxt node_modules .output
```

### 2) Install dependencies

```bash
npm install
```

### 3) Run development server

```bash
npm run dev
```

### 4) Build for production

```bash
npm run build
```

### 5) Preview production build

```bash
npm run preview
```

---

## Data Seeding

### Seed topic words

```bash
npx tsx scripts/seed-topics.ts
```

### Seed level words

```bash
npx tsx scripts/seed-levels.ts
```

---

## Project Status

🚧 Actively developed. This project is evolving and features may change.

---

## Philosophy

- Keep the app simple and calm
- Teach natural Cantonese, not textbook grammar
- Respect user data: no dark patterns, easy deletion
