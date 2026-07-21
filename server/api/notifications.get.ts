import { getQuery, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const includeRead = getQuery(event).includeRead === 'true'
  const { rows } = await db.query(`select n.id,n.kind,n.created_at as "createdAt",p.display_name as "actorName",
    coalesce(n.proposal_id,proposal.id) as "proposalId",n.read_at as "readAt"
    from notifications n left join profiles p on p.user_id=n.actor_id
    left join lateral (select dp.id from date_proposals dp where dp.match_id=n.match_id
      and dp.status='accepted' order by dp.created_at desc limit 1) proposal on true
    where n.recipient_id=$1 and ($2::boolean or n.read_at is null) order by n.created_at desc limit 50`, [sub,includeRead])
  const unread = await db.query('select count(*)::int as count from notifications where recipient_id=$1 and read_at is null', [sub])
  return { notifications: rows, unreadCount: unread.rows[0]?.count || 0 }
})
