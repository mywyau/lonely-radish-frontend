import type { DatabaseQueryable } from '~/server/repositories/db'
import { pageRows } from '~/server/utils/cursorPagination'

type NotificationCursor = { sortAt: string; tieBreaker: string } | null

export async function listNotifications(
  database: DatabaseQueryable,
  userId: string,
  options: { includeRead?: boolean; cursor?: NotificationCursor; pageSize?: number } = {},
) {
  const includeRead = options.includeRead === true
  const cursor = options.cursor ?? null
  const pageSize = options.pageSize ?? 25
  const { rows } = await database.query(`with notification_page as materialized (
    select n.id,n.kind,n.created_at as "createdAt",n.created_at::text as "sortAt",p.display_name as "actorName",
    connection_message.message,
    coalesce(n.proposal_id,proposal.id) as "proposalId",n.read_at as "readAt"
    from notifications n left join profiles p on p.user_id=n.actor_id
    left join lateral (select man.message from match_apology_notes man
      where man.match_id=n.match_id and man.sender_id=n.actor_id and man.created_at<=n.created_at
      order by man.created_at desc limit 1) connection_message on true
    left join lateral (select dp.id from date_proposals dp where dp.match_id=n.match_id
      and dp.status='accepted' order by dp.created_at desc limit 1) proposal on true
    where n.recipient_id=$1 and ($2::boolean or n.read_at is null)
      and ($3::timestamptz is null or (n.created_at,n.id)<($3::timestamptz,$4::uuid))
    order by n.created_at desc,n.id desc limit $5
  ), unread as (
    select count(*)::int as count from notifications where recipient_id=$1 and read_at is null
  )
  select notification_page.*,unread.count as "unreadCount"
  from unread left join notification_page on true
  order by notification_page."sortAt" desc nulls last,notification_page.id desc`,
  [userId, includeRead, cursor?.sortAt || null, cursor?.tieBreaker || null, pageSize + 1])
  const notificationRows = rows.filter(row => row.id)
  const page = pageRows(notificationRows, pageSize, row => ({ sortAt: row.sortAt, tieBreaker: row.id }))
  return {
    notifications: page.items.map(({ sortAt: _sortAt, unreadCount: _unreadCount, ...row }) => row),
    unreadCount: rows[0]?.unreadCount || 0,
    nextCursor: page.nextCursor,
    hasMore: page.hasMore,
  }
}
