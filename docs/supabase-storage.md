# Supabase profile-photo storage

## Create the bucket

1. Open the Supabase project dashboard.
2. Go to **Storage** and select **New bucket**.
3. Name it exactly `profile-photos`.
4. Leave **Public bucket** disabled.
5. Set the file-size limit to `5 MB`.
6. Restrict allowed MIME types to `image/jpeg`, `image/png`, and `image/webp`.

No browser-facing Storage RLS policies are required for this implementation. The Auth0-authenticated Nuxt server creates signed upload and viewing URLs, verifies ownership, and performs deletion using the service-role key. Signed upload tokens do not expose that key.

## Configure environment variables

Find the project URL and API keys under the Supabase project's API settings, then add:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SECRET_KEY=sb_secret_your-server-only-key
NUXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

`SUPABASE_SECRET_KEY` is secret and must only be configured in the server/deployment environment. Never rename it with a `NUXT_PUBLIC_` prefix or commit it to Git. The implementation also accepts the legacy `SUPABASE_SERVICE_ROLE_KEY`, but new Supabase projects should use a current `sb_secret_...` key.

Add the same variables in the production hosting environment and redeploy. The `DATABASE_URL` remains separate and continues to connect the PostgreSQL tables.

## How uploads work

1. The authenticated browser sends file type and size to the Nuxt server.
2. The server enforces the six-photo and 5 MB limits and creates a user-scoped signed upload token.
3. The browser uploads directly to the private bucket.
4. The server verifies the stored object before inserting its key into `profile_photos`.
5. Profile APIs exchange stored keys for one-hour signed viewing URLs.
6. Deletes remove the Storage object through the Storage API before deleting its database record.

Storage objects must be deleted through the Storage API rather than by manually deleting rows from `storage.objects`.
