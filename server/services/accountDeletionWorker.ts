import { createError } from 'h3'
import type { Database } from '~/server/repositories/db'
import type { AccountDeletionJobStatus, AccountDeletionWorkerRequest } from '~/types/api/accountDeletion'

export type DeletionUser = {
  id: string
  stripe_customer_id: string | null
}

export type OwnedDeletionBusiness = {
  id: string
  stripe_customer_id: string | null
  has_other_members: boolean
}

type JobRow = {
  status: AccountDeletionJobStatus
}

export type AccountDeletionClaim =
  | { state: 'completed' }
  | { state: 'skipped' }
  | { state: 'claimed'; user: DeletionUser | null; ownedBusinesses: OwnedDeletionBusiness[] }

/**
 * Claim and load a deletion job using one short database lease.
 *
 * No Stripe, Auth0, storage, or follow-up database work may run until this
 * function has returned and released its client.
 */
export async function claimAccountDeletionJob(
  database: Database,
  body: AccountDeletionWorkerRequest,
): Promise<AccountDeletionClaim> {
  const client = await database.connect()
  try {
    await client.query('BEGIN')
    const claim = await client.query(`update account_deletion_jobs
      set status='processing',attempt_count=attempt_count+1,started_at=now(),last_error=null
      where id=$1 and user_id=$2 and (
        status in ('pending','failed')
        or (status='processing' and started_at<now()-interval '5 minutes')
      ) returning status`, [body.jobId, body.userId])

    if (claim.rowCount === 0) {
      const existing = await client.query<JobRow>(
        `select status from account_deletion_jobs where id=$1 and user_id=$2`,
        [body.jobId, body.userId],
      )
      await client.query('ROLLBACK')
      if (existing.rows[0]?.status === 'completed') return { state: 'completed' }
      if (existing.rows[0]?.status === 'processing') {
        throw createError({ statusCode: 503,
          statusMessage: 'Account deletion is already processing; retry later' })
      }
      return { state: 'skipped' }
    }

    await client.query(`update users set deletion_status='processing' where id=$1`, [body.userId])
    const userResult = await client.query<DeletionUser>(
      `select id,stripe_customer_id from users where id=$1`, [body.userId],
    )
    const user = userResult.rows[0] || null
    const ownedBusinesses = user ? await client.query<OwnedDeletionBusiness>(`select b.id,
      bs.stripe_customer_id,exists(select 1 from business_members other
        where other.business_id=b.id and other.user_id<>$1) as has_other_members
      from business_members owner join businesses b on b.id=owner.business_id
      left join business_subscriptions bs on bs.business_id=b.id
        and bs.subscription_status not in ('canceled','incomplete_expired')
      where owner.user_id=$1 and owner.role='owner'`, [body.userId]) : { rows: [] }
    await client.query('COMMIT')
    return { state: 'claimed', user, ownedBusinesses: ownedBusinesses.rows }
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // Preserve the original failure.
    }
    throw error
  } finally {
    client.release()
  }
}
