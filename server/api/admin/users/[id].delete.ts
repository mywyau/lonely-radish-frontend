import { assertMethod, createError, getRouterParam, readBody, setResponseStatus } from 'h3'
import { db } from '~/server/repositories/db'
import { queueAccountDeletion } from '~/server/services/accountDeletion'
import { requireAdmin } from '~/server/utils/requireAdmin'
import { text } from '~/server/utils/productValidation'
import { enforceRateLimit } from '~/server/utils/rate-limiting/rateLimit'

type DeleteBody = {
  confirmEmail?: string
  reason?: string
  reportId?: string
}

export default defineEventHandler(async (event) => {
  assertMethod(event, 'DELETE')
  const admin = await requireAdmin(event)
  await enforceRateLimit(`rl:admin-account-delete:${admin.sub}`, 5, 60)
  const userId = getRouterParam(event, 'id')?.trim()
  if (!userId) throw createError({ statusCode: 400, statusMessage: 'Account ID is required' })

  const body = await readBody<DeleteBody>(event)
  const confirmEmail = text(body?.confirmEmail, 'Confirmation email', 254, true)!
  const reason = text(body?.reason, 'Deletion reason', 1000, true)!
  const reportId = text(body?.reportId, 'Report ID', 50)
  if (reason.length < 10) throw createError({ statusCode: 400, statusMessage: 'Add a deletion reason of at least 10 characters' })
  if (reportId && !/^[0-9a-f-]{36}$/i.test(reportId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid report ID' })
  }
  if (reportId) {
    const relatedReport = await db.query('select 1 from reports where id=$1 and reported_id=$2', [reportId, userId])
    if (!relatedReport.rows[0]) throw createError({ statusCode: 404, statusMessage: 'Related report not found for this account' })
  }

  const result = await queueAccountDeletion(userId, {
    source: 'admin',
    requestedBy: admin.sub,
    reason,
    reportId: reportId || null,
    retryFailed: true,
    expectedEmail: confirmEmail,
    membersOnly: true,
  })
  setResponseStatus(event, 202)
  return result
})
