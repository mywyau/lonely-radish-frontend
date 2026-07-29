import { getQuery, setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { signedPhotoUrls } from '~/server/utils/supabaseStorage'
import { decodeCursor, pageRows } from '~/server/utils/cursorPagination'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'private, no-store')
  const { sub } = await requireUser(event)
  const cursor = decodeCursor(getQuery(event).cursor)
  const pageSize = 25
  const { rows } = await db.query(`select p.slug,p.display_name as name,b.created_at as "blockedAt",b.created_at::text as "sortAt",
    photo.storage_key as "photoStorageKey",photo.public_url as "legacyPhotoUrl"
    from blocks b
    join profiles p on p.user_id=b.blocked_id
    left join lateral (select coalesce(thumbnail_storage_key,storage_key) as storage_key,public_url from profile_photos
      where user_id=b.blocked_id order by position limit 1) photo on true
    where b.blocker_id=$1 and ($2::timestamptz is null or (b.created_at,p.slug)<($2::timestamptz,$3::text))
    order by b.created_at desc,p.slug desc limit $4`, [sub,cursor?.sortAt || null,cursor?.tieBreaker || null,pageSize+1])
  const page = pageRows(rows, pageSize, row => ({ sortAt: row.sortAt, tieBreaker: row.slug }))
  const photoUrls = await signedPhotoUrls(page.items.map(row => row.photoStorageKey).filter(Boolean))
  const blockedUsers = page.items.map(row => ({
    slug: row.slug, name: row.name, blockedAt: row.blockedAt,
    photoUrl: row.photoStorageKey ? photoUrls.get(row.photoStorageKey) : row.legacyPhotoUrl || null,
  }))
  return { blockedUsers, nextCursor: page.nextCursor, hasMore: page.hasMore }
})
