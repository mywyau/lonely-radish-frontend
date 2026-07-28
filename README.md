# Lonely Radish

Lonely Radish is an activity-first dating application for arranging low-pressure,
real-world dates. Members build a structured profile, discover people through
shared interests, express interest, match, and coordinate a date without relying
on an open-ended chat feed.

The repository contains the Nuxt frontend and its Nitro API. PostgreSQL, Auth0,
Supabase Storage, Stripe, Resend, Upstash Redis, and QStash provide the managed
infrastructure around it.

## What the app supports

- Personal and business Auth0 sign-in flows
- Guided profile onboarding with photos, preferences, availability, and interests
- Profile discovery, expressions of interest, matching, blocking, and reporting
- Date proposals, revisions, attendance, and private post-date follow-ups
- Repeat second-chance interest after a match ends
- Personal and business subscriptions through Stripe
- Business venues, date offers, claims, and redemption
- Admin moderation and business-approval queues
- Email notifications and date reminders
- Asynchronous account deletion across Stripe, Auth0, Supabase Storage, and PostgreSQL

## Stack

| Area | Technology |
| --- | --- |
| Web application | Nuxt 3, Vue 3, TypeScript, Tailwind CSS |
| Server API | Nitro/H3 routes in `server/api` |
| Database | PostgreSQL, currently hosted by Supabase |
| Authentication | Auth0 Authorization Code flow |
| Photo storage | Private Supabase Storage bucket |
| Billing | Stripe Checkout, subscriptions, portal, and webhooks |
| Email | Resend |
| Rate limiting/cache | Upstash Redis; an in-memory implementation is used locally when omitted |
| Background delivery | Upstash QStash |
| Hosting | Vercel Nitro preset |
| Tests | Vitest; browser E2E tests live in the separate `lonely-radish-e2e` repository |

## Prerequisites

- Node.js 22 LTS
- npm
- A PostgreSQL database
- An Auth0 Regular Web Application
- A Supabase project if profile-photo uploads are required

Stripe, Resend, Upstash Redis, and QStash can be added after the core personal
flow is running. Stripe falls back to a local mock and Redis falls back to
in-memory storage when their credentials are absent. Auth0 and PostgreSQL are
required for a useful persistent local environment.

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env
   ```

3. At minimum, configure these values in `.env`:

   ```env
   SITE_URL=http://localhost:3000
   DATABASE_URL=postgresql://user:password@host:6543/database?sslmode=require

   AUTH0_DOMAIN=your-tenant.eu.auth0.com
   AUTH0_CLIENT_ID=your-client-id
   AUTH0_CLIENT_SECRET=your-client-secret
   AUTH_SESSION_SECRET=replace-with-a-random-value-of-at-least-32-characters
   ```

   Generate independent signing secrets rather than copying example values:

   ```bash
   openssl rand -hex 32
   ```

4. Configure the Auth0 application:

   | Auth0 setting | Local value |
   | --- | --- |
   | Application type | Regular Web Application |
   | Allowed Callback URLs | `http://localhost:3000/api/auth/callback` |
   | Allowed Logout URLs | `http://localhost:3000` |
   | Allowed Web Origins | `http://localhost:3000` |

   Google sign-in can be enabled as an Auth0 social connection. It uses the same
   application callback and creates the local user on first successful login.

5. Apply the database migrations:

   ```bash
   npm run db:migrate
   ```

   This also installs the managed activity catalogue. The migration runner
   records checksums in `schema_migrations`; never edit a migration that has
   already been applied. Add a new dated SQL migration instead.

6. Start Nuxt:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000). A basic server check is
   available at [http://localhost:3000/api/health](http://localhost:3000/api/health).

## Important environment isolation

Do not use the production `DATABASE_URL`, Supabase project, Stripe account, or
Auth0 tenant for routine local development. A local login will create and update
real records in whichever services `.env` references.

Use at least:

- a separate development PostgreSQL database or Supabase project;
- Auth0 localhost URLs and preferably a separate Auth0 application or tenant;
- Stripe test-mode keys and prices;
- a separate Supabase Storage bucket/project for test photos;
- separate Vercel environment variables for Preview and Production.

## Full provider setup

### PostgreSQL

Set the server-only `DATABASE_URL`, then run:

```bash
npm run db:migrate
```

For Vercel, use the provider's serverless/transaction-pooler connection string.
Use a separate direct connection for migrations if your provider recommends it.
The Auth0 `sub` value is stored as `users.id` and is the stable identifier used
by related tables.

See [docs/database.md](docs/database.md) for the schema and security model.

### Supabase profile photos

Create a private bucket named exactly `profile-photos` with:

- a `5 MB` file-size limit;
- `image/jpeg`, `image/png`, and `image/webp` MIME types;
- public access disabled.

Configure:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-server-only-key
NUXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The secret key must remain server-side. Photo bytes are uploaded with signed
tokens; PostgreSQL stores only object keys and metadata. See
[docs/supabase-storage.md](docs/supabase-storage.md).

`SUPABASE_SERVICE_ROLE_KEY` is accepted as a legacy alternative to
`SUPABASE_SECRET_KEY`; new environments should use the latter.

### Location search

Set `OPENCAGE_API_KEY` to enable server-side postcode geocoding. Do not expose
this as a `NUXT_PUBLIC_*` variable.

### Stripe

Use Stripe test mode locally. Create recurring prices for the personal monthly,
three-month, and yearly plans, plus the business standard and featured plans:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_MONTHLY=price_...
STRIPE_PRICE_ID_QUARTERLY=price_...
STRIPE_PRICE_ID_YEARLY=price_...
STRIPE_BUSINESS_PRICE_ID_STANDARD=price_...
STRIPE_BUSINESS_PRICE_ID_FEATURED=price_...
```

The webhook destination is:

```text
https://your-app.example/api/stripe/v2/webhook
```

For local webhook testing, forward Stripe CLI events to:

```bash
stripe listen --forward-to localhost:3000/api/stripe/v2/webhook
```

Copy the displayed signing secret into `STRIPE_WEBHOOK_SECRET`. Development
processes accepted events inline; production sends them to QStash.

### Upstash Redis

Configure Redis in shared or production environments so rate limits and cache
state survive process restarts:

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

Without these values, development uses a process-local in-memory substitute.
That substitute is not suitable for multiple instances or durable rate limits.

### Resend

Configure a verified sending domain and:

```env
RESEND_API_KEY=re_...
EMAIL_FROM=Lonely Radish <notifications@your-domain.example>
EMAIL_REPLY_TO=contact@your-domain.example
APP_BASE_URL=http://localhost:3000
```

`APP_BASE_URL` should normally match `SITE_URL`.

### QStash

QStash delivers production Stripe jobs, notification emails, date reminders,
and account-deletion work:

```env
QSTASH_TOKEN=...
QSTASH_CURRENT_SIGNING_KEY=...
QSTASH_NEXT_SIGNING_KEY=...
```

`SITE_URL` must be the exact public HTTPS origin used as the QStash destination.
QStash cannot deliver to localhost. The signed processing routes are:

- `POST /api/stripe/v2/process-event-v2`
- `POST /api/email/process`
- `POST /api/reminders/process`
- `POST /api/account/v2/worker-delete`

See [docs/account-deletion.md](docs/account-deletion.md) before enabling account
deletion in production.

### Auth0 account deletion

Deleting an Auth0 identity requires a separate Machine-to-Machine application
authorized for the Auth0 Management API `delete:users` permission:

```env
AUTH0_MGMT_CLIENT_ID=...
AUTH0_MGMT_CLIENT_SECRET=...
AUTH0_MGMT_AUDIENCE=https://your-tenant.eu.auth0.com/api/v2/
```

## Useful commands

```bash
# Development server
npm run dev

# Apply pending database migrations
npm run db:migrate

# Run the test suite once
npm test -- --run

# Run tests in watch mode
npm run test:watch

# Production compile
npm run build

# Preview the compiled application
npm run preview
```

If generated Nuxt files become stale, stop the development server and remove
`.nuxt` and `.output`, then restart. Reinstalling `node_modules` should not be a
routine first step.

## Production deployment

The app is configured for Vercel.

1. Create a Vercel project from this repository.
2. Add production environment variables from `.env.example`; never upload `.env`.
3. Set `SITE_URL` and `APP_BASE_URL` to the production HTTPS origin.
4. Add the production callback, logout, and web-origin URLs in Auth0.
5. Run `npm run db:migrate` against the production database before code that
   requires new columns reaches users.
6. Configure the Stripe webhook and QStash destinations.
7. Deploy and verify `/api/health`, sign-in, onboarding, photo upload, and a
   Stripe test-mode checkout before accepting real users.

Production startup is fail-closed. Missing database, Auth0, Redis, Supabase,
Stripe, QStash, Resend, postcode-geocoding, offer-code, or account-deletion
credentials stop the Nitro application rather than enabling local mocks.
`/api/health` returns HTTP `503` until PostgreSQL is reachable and the latest
required migration has been recorded. It reports only configuration state and
never returns credential values.

Vercel Preview deployments should use isolated preview/development providers.
Do not let preview builds mutate the production database.

## Architecture and repository layout

```text
components/          Shared Vue UI
composables/         Client-side state and product workflows
docs/                Operational notes and ordered SQL migrations
middleware/          Authentication and account-mode route guards
pages/               Nuxt application routes
server/api/          Authenticated Nitro API routes and workers
server/repositories/ PostgreSQL and Redis clients
server/services/     Authentication and billing services
server/utils/        Validation, storage, safety, email, and deletion helpers
tests/               Vitest contract and behavior tests
utils/               Shared client/server product constants
```

The browser does not connect directly to the product tables. Nitro derives the
user ID from the encrypted Auth0 session and performs database access through
server routes. Public Supabase credentials are used only where appropriate;
database credentials, storage admin keys, Auth0 secrets, Stripe secrets, and
QStash signing keys must never enter public runtime configuration.

`NUXT_PUBLIC_CDN_BASE` is an optional public runtime value reserved for a future
asset CDN. `QSTASH_URL` also remains in runtime configuration for compatibility,
but the current QStash SDK clients do not require it.

## Admin access

Admin pages are protected by the authenticated user's `users.role`. After the
user has signed in once and created a database row, promote an intended
administrator directly in a controlled database session:

```sql
update users
set role = 'admin'
where email = 'admin@example.com';
```

Do not expose an API that lets users assign their own role. Non-admin requests
to `/api/admin/me` correctly return `403`.

## Current status

Lonely Radish is under active MVP development. Before a public launch, use
isolated environments, exercise the safety/moderation paths, verify background
jobs and account deletion end-to-end, and run the separate E2E suite against a
non-production environment.
