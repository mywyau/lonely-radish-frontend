import { describe, expect, it, vi } from 'vitest'
import type { Database, DatabaseClient } from '../server/repositories/db'
import { claimAccountDeletionJob } from '../server/services/accountDeletionWorker'

function databaseWithQuery(query: DatabaseClient['query']) {
  const release = vi.fn()
  const client = { query, release } as DatabaseClient
  const database = { query: vi.fn(), connect: vi.fn(async () => client) } as unknown as Database
  return { database, release }
}

describe('account deletion worker claims', () => {
  it('releases the claim connection before returning external work', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('returning status')) return { rows: [{ status: 'processing' }], rowCount: 1 }
      if (sql.includes('select id,stripe_customer_id from users')) {
        return { rows: [{ id: 'member-1', stripe_customer_id: 'customer-1' }], rowCount: 1 }
      }
      if (sql.includes('from business_members owner')) return { rows: [], rowCount: 0 }
      return { rows: [], rowCount: 0 }
    })
    const { database, release } = databaseWithQuery(query as unknown as DatabaseClient['query'])

    const result = await claimAccountDeletionJob(database, { jobId: 4, userId: 'member-1' })

    expect(result).toMatchObject({ state: 'claimed', user: { id: 'member-1' }, ownedBusinesses: [] })
    expect(release).toHaveBeenCalledOnce()
    expect(query.mock.calls.at(-1)?.[0]).toBe('COMMIT')
  })

  it('treats an already completed job as an idempotent completion', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('returning status')) return { rows: [], rowCount: 0 }
      if (sql.includes('select status')) return { rows: [{ status: 'completed' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    const { database, release } = databaseWithQuery(query as unknown as DatabaseClient['query'])

    await expect(claimAccountDeletionJob(database, { jobId: 5, userId: 'member-2' }))
      .resolves.toEqual({ state: 'completed' })
    expect(release).toHaveBeenCalledOnce()
  })

  it('asks QStash to retry a job with a live processing lease', async () => {
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('returning status')) return { rows: [], rowCount: 0 }
      if (sql.includes('select status')) return { rows: [{ status: 'processing' }], rowCount: 1 }
      return { rows: [], rowCount: 0 }
    })
    const { database, release } = databaseWithQuery(query as unknown as DatabaseClient['query'])

    await expect(claimAccountDeletionJob(database, { jobId: 6, userId: 'member-3' }))
      .rejects.toMatchObject({ statusCode: 503 })
    expect(release).toHaveBeenCalledOnce()
  })
})
