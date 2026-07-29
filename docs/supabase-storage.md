# Supabase profile-photo storage

## Create the bucket

1. Open the Supabase project dashboard.
2. Go to **Storage** and select **New bucket**.
3. Name it exactly `profile-photos`.
4. Leave **Public bucket** disabled.
5. Set the file-size limit to `1 MB`.
6. Restrict allowed MIME types to `image/webp`.

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

1. The browser accepts a JPEG, PNG, or WebP source image up to 20 MB.
2. It corrects orientation, resizes the image, strips metadata, and creates a full WebP image plus a smaller WebP thumbnail.
3. The server enforces the six-photo limit and creates user-scoped signed upload tokens for both objects.
4. The browser uploads both objects directly to the private bucket. Full images are capped at 1 MB and thumbnails at 200 KB.
5. The server verifies both stored objects before inserting their keys into `profile_photos`.
6. Collection APIs batch-sign thumbnail URLs, while full profile APIs batch-sign the full images. Existing rows without thumbnails continue to use their full image.
7. Deletes remove both Storage objects through the Storage API before deleting their database record.

Storage objects must be deleted through the Storage API rather than by manually deleting rows from `storage.objects`.
