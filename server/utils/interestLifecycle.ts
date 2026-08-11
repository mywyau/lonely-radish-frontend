import type { DatabaseQueryable } from '~/server/repositories/db'

export const interestLifetimeDays = 14

type InterestExpiryScope = {
  senderId?: string
  recipientId?: string
}

/**
 * Close overdue interests and remove their actionable notification.
 *
 * This is intentionally lazy: every path that reads, accepts, or creates an
 * interest runs the small indexed update, so expiry does not depend on a cron
 * job. The pending-interest counter trigger releases inbox capacity.
 */
export async function expirePendingInterests(
  database: DatabaseQueryable,
  scope: InterestExpiryScope = {},
) {
  const values: string[] = []
  const filters = [
    'resolved_at is null',
    `created_at<=now()-interval '${interestLifetimeDays} days'`,
  ]
  if (scope.senderId) {
    values.push(scope.senderId)
    filters.push(`sender_id=$${values.length}`)
  }
  if (scope.recipientId) {
    values.push(scope.recipientId)
    filters.push(`recipient_id=$${values.length}`)
  }

  const result = await database.query<{ id: string }>(`with expired as (
      update daily_interests set resolution='expired',resolved_at=now()
      where ${filters.join(' and ')}
      returning id,sender_id,recipient_id
    ), removed_notifications as (
      delete from notifications n using expired e
      where n.kind='interest_received' and n.recipient_id=e.recipient_id
        and n.actor_id=e.sender_id
      returning n.id
    )
    select id from expired`, values)
  return result.rowCount
}
