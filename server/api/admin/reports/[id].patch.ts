import { createError, getRouterParam, readBody } from 'h3'
import { db } from '~/server/repositories/db'
import { requireAdmin } from '~/server/utils/requireAdmin'
import { objectBody, text } from '~/server/utils/productValidation'

const decisions = new Set([
  'reviewing',
  'dismiss',
  'warning',
  'suspend_7_days',
  'suspend_30_days',
  'suspend_permanent',
  'restore',
])
const punitive = new Set(['warning', 'suspend_7_days', 'suspend_30_days', 'suspend_permanent'])

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const reportId = getRouterParam(event, 'id')
  const body = objectBody(await readBody(event))
  const decision = text(body.decision, 'Moderation decision', 30, true)!
  const note = text(body.note, 'Resolution note', 1000)
  if (!decisions.has(decision)) throw createError({ statusCode: 400, statusMessage: 'Choose a valid moderation decision' })
  if (decision !== 'reviewing' && (!note || note.length < 10)) {
    throw createError({ statusCode: 400, statusMessage: 'Add a resolution note of at least 10 characters' })
  }

  const client = await db.connect()
  try {
    await client.query('begin')
    const reportResult = await client.query(`select r.id,r.reported_id as "reportedId",u.role,u.account_status as "accountStatus"
      from reports r join users u on u.id=r.reported_id where r.id=$1 for update of r,u`, [reportId])
    const report = reportResult.rows[0]
    if (!report) throw createError({ statusCode: 404, statusMessage: 'Report not found' })
    if (punitive.has(decision) && report.reportedId === admin.sub) {
      throw createError({ statusCode: 403, statusMessage: 'You cannot take moderation action against your own account' })
    }
    if (punitive.has(decision) && report.role !== 'member') {
      throw createError({ statusCode: 403, statusMessage: 'Administrator and moderator accounts require an independent review process' })
    }
    if (decision === 'restore' && report.accountStatus !== 'suspended') {
      throw createError({ statusCode: 409, statusMessage: 'This account is not currently suspended' })
    }

    let reportStatus = 'resolved'
    let expiresAt: string | null = null
    let notificationKind: string | null = null
    if (decision === 'reviewing') reportStatus = 'reviewing'
    if (decision === 'dismiss') reportStatus = 'dismissed'
    if (decision === 'warning') notificationKind = 'moderation_warning'
    if (decision === 'suspend_7_days') {
      expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
      notificationKind = 'account_suspended'
    }
    if (decision === 'suspend_30_days') {
      expiresAt = new Date(Date.now() + 30 * 86400000).toISOString()
      notificationKind = 'account_suspended'
    }
    if (decision === 'suspend_permanent') notificationKind = 'account_suspended'
    if (decision === 'restore') notificationKind = 'account_restored'

    if (decision.startsWith('suspend_')) {
      await client.query(`update users set account_status='suspended',moderation_suspended_until=$2,
        moderation_updated_at=now(),moderation_updated_by=$3,updated_at=now() where id=$1`,
      [report.reportedId, expiresAt, admin.sub])
    } else if (decision === 'restore') {
      await client.query(`update users set account_status='active',moderation_suspended_until=null,
        moderation_updated_at=now(),moderation_updated_by=$2,updated_at=now()
        where id=$1 and account_status<>'deleting'`, [report.reportedId, admin.sub])
    }

    await client.query(`update reports set status=$2,reviewed_by=$3,
      reviewed_at=case when $2='reviewing' then null else now() end,
      resolution=case when $2='reviewing' then null else $4 end where id=$1`,
    [reportId, reportStatus, admin.sub, note])
    await client.query(`insert into moderation_actions(report_id,target_user_id,actor_id,action,note,expires_at)
      values($1,$2,$3,$4,$5,$6)`, [reportId, report.reportedId, admin.sub, decision, note, expiresAt])
    if (notificationKind) {
      await client.query(`insert into notifications(recipient_id,kind) values($1,$2)`,
        [report.reportedId, notificationKind])
    }
    await client.query('commit')
    return { reportId, status: reportStatus, decision, suspendedUntil: expiresAt }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
})
