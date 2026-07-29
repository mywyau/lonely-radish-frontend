import type { DatabaseClient } from '~/server/repositories/db'

export async function activateMatchOrQueue(client: DatabaseClient, matchId: string) {
  await client.query('savepoint activate_queued_match')
  try {
    await client.query(`update matches set status='active',matched_at=now() where id=$1`, [matchId])
    await client.query('release savepoint activate_queued_match')
    return true
  } catch (error) {
    await client.query('rollback to savepoint activate_queued_match')
    await client.query('release savepoint activate_queued_match')
    if ((error as { code?: string }).code === '23514') return false
    throw error
  }
}
