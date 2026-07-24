import { setHeader } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'
import { useAuthSession } from '~/server/utils/authSession'

export default defineEventHandler(async (event) => {
  setHeader(event,'Cache-Control','private, no-store')
  const { sub } = await requireUser(event)
  const session = await useAuthSession(event)
  const { rows } = await db.query(`select u.account_type as "accountType",
    exists(select 1 from business_members bm where bm.user_id=u.id) as "hasBusiness"
    from users u where u.id=$1`, [sub])
  return { accountType: rows[0]?.accountType || 'personal', hasBusiness: rows[0]?.hasBusiness === true,
    sessionMode: session.data.user?.mode || 'personal' }
})
