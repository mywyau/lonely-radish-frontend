import { createError, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireAdmin } from '~/server/utils/requireAdmin'
import { objectBody, text } from '~/server/utils/productValidation'

const entityTypes = new Set(['business','venue','offer'])
const decisions = new Set(['pending','approved','rejected'])

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const body = objectBody(await readBody(event))
  const entityType = text(body.entityType, 'Review type', 20, true)!
  const entityId = text(body.entityId, 'Review target', 50, true)!
  const decision = text(body.decision, 'Decision', 20, true)!
  const note = text(body.note, 'Review note', 500)
  if (!entityTypes.has(entityType) || !decisions.has(decision)) {
    throw createError({ statusCode: 400, statusMessage: 'Choose a valid review decision' })
  }
  const client = await db.connect()
  try {
    await client.query('begin')
    let result
    if (entityType === 'business') {
      const status = decision === 'approved' ? 'active' : decision === 'rejected' ? 'suspended' : 'pending'
      result = await client.query(`update businesses set status=$2,reviewed_by=$3,
        reviewed_at=case when $2='pending' then null else now() end,updated_at=now()
        where id=$1 returning id,status`, [entityId,status,admin.sub])
    } else if (entityType === 'venue') {
      const status = decision === 'approved' ? 'active' : decision === 'rejected' ? 'paused' : 'pending'
      result = await client.query(`update business_venues set status=$2,reviewed_by=$3,
        reviewed_at=case when $2='pending' then null else now() end,updated_at=now()
        where id=$1 returning id,status`, [entityId,status,admin.sub])
    } else {
      result = await client.query(`update business_offers set approval_status=$2,reviewed_by=$3,
        reviewed_at=case when $2='pending' then null else now() end,
        rejection_note=case when $2='rejected' then $4 else null end,updated_at=now()
        where id=$1 returning id,approval_status as "approvalStatus"`, [entityId,decision,admin.sub,note])
    }
    if (!result.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Review target not found' })
    await client.query(`insert into admin_review_events(reviewer_id,entity_type,entity_id,decision,note)
      values($1,$2,$3,$4,$5)`, [admin.sub,entityType,entityId,decision,note])
    await client.query('commit')
    return { review: result.rows[0] }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
})
