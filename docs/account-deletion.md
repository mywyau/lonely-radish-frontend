# Account deletion

Account deletion starts with `DELETE /api/account/v2`, requiring an authenticated session and the confirmation text `delete`. The endpoint creates an idempotent deletion job and publishes it to QStash. The signed worker then:

1. Cancels active Stripe subscriptions.
2. Deletes the Auth0 identity.
3. Removes private Supabase Storage profile photos.
4. Deletes the local `users` row, cascading through product and billing data.

## Production setup

- Set `SITE_URL` to the public HTTPS application origin. QStash cannot deliver to localhost.
- Create an Auth0 Machine-to-Machine application authorized for the Auth0 Management API with `delete:users`.
- Set `AUTH0_MGMT_CLIENT_ID`, `AUTH0_MGMT_CLIENT_SECRET`, and `AUTH0_MGMT_AUDIENCE`.
- Create an Upstash QStash account and set `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, and `QSTASH_NEXT_SIGNING_KEY`.
- Keep the Supabase service-role credential configured so private profile images can be removed.

Failed jobs remain recorded with their error and are not silently treated as completed. Retrying the public deletion request republishes a pending job that has not started; failed jobs should be reviewed before an administrator retries them.
