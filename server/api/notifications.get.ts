import { getQuery, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { decodeCursor, pageRows } from '~/server/utils/cursorPagination'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const includeRead = getQuery(event).includeRead === 'true'
  const cursor = decodeCursor(getQuery(event).cursor)
  const pageSize = 25
  const { rows } = await db.query(`select n.id,n.kind,n.created_at as "createdAt",n.created_at::text as "sortAt",p.display_name as "actorName",
    apology.message,
    coalesce(n.proposal_id,proposal.id) as "proposalId",n.read_at as "readAt"
    from notifications n left join profiles p on p.user_id=n.actor_id
    left join match_apology_notes apology on apology.match_id=n.match_id and apology.sender_id=n.actor_id
    left join lateral (select dp.id from date_proposals dp where dp.match_id=n.match_id
      and dp.status='accepted' order by dp.created_at desc limit 1) proposal on true
    where n.recipient_id=$1 and ($2::boolean or n.read_at is null)
      and ($3::timestamptz is null or (n.created_at,n.id)<($3::timestamptz,$4::uuid))
    order by n.created_at desc,n.id desc limit $5`, [sub,includeRead,cursor?.sortAt || null,cursor?.tieBreaker || null,pageSize+1])
  const unread = await db.query('select count(*)::int as count from notifications where recipient_id=$1 and read_at is null', [sub])
  const page = pageRows(rows, pageSize, row => ({ sortAt: row.sortAt, tieBreaker: row.id }))
  return { notifications: page.items.map(({ sortAt: _sortAt, ...row }) => row), unreadCount: unread.rows[0]?.count || 0, nextCursor: page.nextCursor, hasMore: page.hasMore }
})
