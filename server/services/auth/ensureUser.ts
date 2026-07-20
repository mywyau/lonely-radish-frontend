import { db } from '~/server/repositories/db'

export async function ensureUser(userId: string, email: string) {
  const client = await db.connect()
  try {
    await client.query('BEGIN')
    await client.query(
      `insert into users (id, email) values ($1, $2)
       on conflict (id) do update set email = excluded.email`,
      [userId, email],
    )
    await client.query(
      `insert into entitlements (user_id, plan, subscription_status)
       values ($1, 'free', 'no_subscription') on conflict (user_id) do nothing`,
      [userId],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
