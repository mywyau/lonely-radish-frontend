import { createError } from 'h3'
import { db } from '~/server/repositories/db'
import { requireUser } from '~/server/utils/requireUser'

interface BusinessAccess {
  id: string
  name: string
  slug: string
  status: string
  contactEmail: string
  role: string
}

export type BusinessContext = BusinessAccess & { userId: string }

export async function requireBusiness(event: any, businessId?: string): Promise<BusinessContext> {
  const { sub } = await requireUser(event)
  const { rows } = await db.query<BusinessAccess>(`select b.id,b.name,b.slug,b.status,b.contact_email as "contactEmail",bm.role
    from business_members bm join businesses b on b.id=bm.business_id
    where bm.user_id=$1 and ($2::uuid is null or b.id=$2::uuid)
    order by bm.created_at limit 1`, [sub,businessId || null])
  if (!rows[0]) throw createError({ statusCode: 403, statusMessage: 'Business access required' })
  return { userId: sub, ...rows[0] }
}
