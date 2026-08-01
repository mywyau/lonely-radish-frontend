import { Client as QStashClient } from '@upstash/qstash'
import { createError } from 'h3'
import { db } from '~/server/repositories/db'
import { redactIdentifier } from '~/server/utils/logging/redact'

type JobStatus = 'pending' | 'processing' | 'failed' | 'completed'

type ExistingJobRow = {
  id: number | string
  status: JobStatus
  started_at: string | null
}

type QueueOptions = {
  source: 'self' | 'admin'
  requestedBy: string
  reason?: string | null
  reportId?: string | null
  retryFailed?: boolean
  expectedEmail?: string
  membersOnly?: boolean
}

function required(name: 'SITE_URL' | 'QSTASH_TOKEN') {
  const value = process.env[name]?.trim()
  if (!value) throw createError({ statusCode: 500, statusMessage: `${name} is not configured` })
  return value
}

export async function queueAccountDeletion(userId: string, options: QueueOptions) {
  const workerUrl = `${required('SITE_URL').replace(/\/+$/, '')}/api/account/v2/worker-delete`
  const client = await db.connect()
  let jobId: number | null = null
  let alreadyInProgress = false
  let createdNewJob = false
  let shouldPublish = false
  let jobStatus: JobStatus = 'pending'

  try {
    await client.query('BEGIN')
    const targetResult = await client.query<{
      id: string
      email: string
      role: string
      deleting_at: string | null
      deleted_at: string | null
    }>(`select id,email,role,deleting_at,deleted_at from users where id=$1 for update`, [userId])
    const target = targetResult.rows[0]
    if (!target || target.deleted_at) throw createError({ statusCode: 404, statusMessage: 'Account not found' })
    if (options.source === 'admin' && target.id === options.requestedBy) {
      throw createError({ statusCode: 403, statusMessage: 'You cannot delete your own account from the administration area' })
    }
    if (options.membersOnly && target.role !== 'member') {
      throw createError({ statusCode: 403, statusMessage: 'Administrator and moderator accounts require an independent review process' })
    }
    if (options.expectedEmail && target.email.trim().toLowerCase() !== options.expectedEmail.trim().toLowerCase()) {
      throw createError({ statusCode: 400, statusMessage: 'Confirmation email did not match the account' })
    }

    if (!target.deleting_at) {
      await client.query(`update users set account_status='deleting',deleting_at=now(),
        deletion_requested_at=now(),deletion_status='pending',updated_at=now() where id=$1`, [userId])
    } else {
      alreadyInProgress = true
    }

    const existingResult = await client.query<ExistingJobRow>(`select id,status,started_at
      from account_deletion_jobs where user_id=$1 order by created_at desc limit 1`, [userId])
    const existing = existingResult.rows[0]

    if (!existing || (existing.status === 'failed' && options.retryFailed === true)) {
      const inserted = await client.query<{ id: number | string }>(`insert into account_deletion_jobs
        (user_id,status,attempt_count,requested_by,request_source,request_reason,report_id,created_at)
        values($1,'pending',0,$2,$3,$4,$5,now()) returning id`,
      [userId, options.requestedBy, options.source, options.reason || null, options.reportId || null])
      jobId = Number(inserted.rows[0].id)
      createdNewJob = true
      shouldPublish = true
      jobStatus = 'pending'
    } else {
      jobId = Number(existing.id)
      jobStatus = existing.status
      shouldPublish = existing.status === 'pending' && !existing.started_at
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  if (jobId !== null && shouldPublish) {
    try {
      const publishResult = await new QStashClient({ token: required('QSTASH_TOKEN') }).publishJSON({
        url: workerUrl,
        body: { jobId, userId },
        deduplicationId: `account_delete_${jobId}`,
      })
      console.log('Published account deletion job', {
        userHash: redactIdentifier(userId), jobId, workerUrl, alreadyInProgress,
        createdNewJob, requestSource: options.source, publishResult,
      })
    } catch (error) {
      await db.query(`update account_deletion_jobs set last_error=$2 where id=$1 and status='pending'`,
        [jobId, String((error as Error)?.message || error)])
      console.error('Failed to publish account deletion job', {
        userHash: redactIdentifier(userId), jobId, workerUrl, requestSource: options.source, error,
      })
      throw createError({ statusCode: 500, statusMessage: 'Failed to queue account deletion' })
    }
  }

  return { success: true, queued: shouldPublish, alreadyInProgress, createdNewJob, jobId, status: jobStatus }
}
