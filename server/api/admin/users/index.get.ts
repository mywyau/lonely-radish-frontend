import { getQuery, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireAdmin } from '~/server/utils/requireAdmin'
import { decodeCursor, pageRows } from '~/server/utils/cursorPagination'
import { text } from '~/server/utils/productValidation'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)
  const search = text(query.q, 'Member search', 100)
  const cursor = decodeCursor(query.cursor)
  const pageSize = 25
  const { rows } = await db.query(`select u.id,u.email,u.first_name as "firstName",u.last_name as "lastName",
    u.role,u.account_type as "accountType",u.account_status as "accountStatus",u.created_at as "createdAt",
    p.display_name as "displayName",p.slug,
    latest.id as "deletionJobId",latest.status as "deletionJobStatus",
    latest.last_error as "deletionLastError",latest.request_source as "deletionRequestSource",
    latest.created_at as "deletionRequestedAt"
    from users u left join profiles p on p.user_id=u.id
    left join lateral (select j.id,j.status,j.last_error,j.request_source,j.created_at
      from account_deletion_jobs j where j.user_id=u.id order by j.created_at desc limit 1) latest on true
    where ($1::text is null or concat_ws(' ',u.email,u.first_name,u.last_name,p.display_name,p.slug) ilike '%'||$1||'%')
      and ($2::timestamptz is null or (u.created_at,u.id)<($2,$3))
    order by u.created_at desc,u.id desc limit $4`,
  [search, cursor?.sortAt || null, cursor?.tieBreaker || null, pageSize + 1])
  const page = pageRows(rows, pageSize, row => ({
    sortAt: new Date(row.createdAt).toISOString(),
    tieBreaker: row.id,
  }))
  return { users: page.items, nextCursor: page.nextCursor, hasMore: page.hasMore }
})
