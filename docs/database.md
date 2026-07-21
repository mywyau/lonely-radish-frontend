# Database setup

The application uses PostgreSQL through the server-only `DATABASE_URL`. Auth0 remains the identity provider; its stable `sub` claim is stored as `users.id` and is used by all foreign keys.

## Connect and migrate

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. For a serverless deployment such as Vercel, use the provider's transaction-pooler connection string. Keep a direct connection available for migrations if your provider recommends it.
3. Apply every migration in order:

```sh
npm run db:migrate
```

The runner creates `schema_migrations`, locks concurrent migration runs, verifies checksums, and skips migrations already applied. Do not edit an applied migration; add a new dated SQL file instead.

## Product data

- `users`: Auth0 identity, account role (`member`, `moderator`, or `admin`), timezone, and lifecycle state.
- `profiles`: public dating/activity profile and discoverability state.
- `profile_photos`: up to six ordered image records. Image bytes belong in object storage; this table stores their URLs and metadata.

See `docs/supabase-storage.md` for the private bucket and signed-upload setup.
- `activities`: the managed activity catalogue.
- `profile_activities`: up to ten ordered activities per profile, including self-declared labels.
- `match_preferences`: shared location/age settings plus dating, gender, sexual, racial, and ethnic preferences.
- `availability`: short, ordered availability labels.
- `daily_interests`: up to five outgoing expressions of interest per sender per local calendar day.
- `matches`: one canonical row for a pair after mutual interest.
- `notifications`: private match-ending and post-date outcome notices.
- `date_proposals` and `proposal_times`: structured date coordination without requiring open-ended chat.
- `blocks` and `reports`: safety records.
- `entitlements`, `billing_subscriptions`, and `stripe_events`: subscription state and webhook idempotency.
- `account_deletion_jobs`: asynchronous account-erasure work.

Database constraints enforce the six-photo, ten-activity, three-proposal-time, and one-interest-per-day limits. The API also validates these limits to return useful errors.

## Security model

All product routes require the encrypted Auth0 session and derive the user ID server-side. Client input can never select its own user ID. The public tables have row-level security enabled and direct access revoked from Supabase's `anon` and `authenticated` roles; the Nuxt server connection is the data-access boundary.

Keep `DATABASE_URL` out of client runtime configuration and never prefix it with `NUXT_PUBLIC_`. Use a restricted production database role rather than an owner role after migrations have run.

## Migration files

- `20260611_add_user_names.sql`: establishes the base Auth0 user table.
- `20260720_billing_and_deletion.sql`: billing and deletion support.
- `20260720_product_schema.sql`: profiles, preferences, discovery, matching, planning, and safety.
- `20260720_seed_activities.sql`: initial activity catalogue.
- `20260721_add_onboarding_state.sql`: first-login onboarding completion state.
- `20260721_add_confirmed_proposal_time.sql`: the selected time and confirmation state for accepted date proposals.
- `20260721_add_structured_availability.sql`: weekday and start/end time windows used during date planning.
- `20260721_add_date_follow_ups.sql`: private post-date meet-again choices and mutually revealed notes.
- `20260721_add_match_notifications.sql`: persistent notifications when a match or post-date connection closes.
- `20260722_allow_follow_up_reconsideration.sql`: answer reveal and one-time no-to-yes reconsideration support.
- `20260722_enforce_five_active_matches.sql`: concurrency-safe five-person active match limit.
- `20260723_add_notification_center.sql`: actionable match, planning, and post-date notification types.
- `20260723_prevent_duplicate_interests.sql`: one permanent outgoing interest per pair.
- `20260723_add_match_end_history.sql`: match-ending actor, reason, timestamp, and past-connections history support.
