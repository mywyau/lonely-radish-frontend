import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { Database, DatabaseClient, DatabaseQueryResult } from '../server/repositories/db'
import { OutboxProcessor } from '../server/services/outbox/OutboxProcessor'

vi.mock('../server/repositories/db', () => ({ db: {} }))

const read = (path: string) => readFileSync(resolve(process.cwd(),path),'utf8')

function databaseWithEvents(events: Array<Record<string, unknown>>) {
  const query = vi.fn(async (
    sql: string,
    _values?: readonly unknown[],
  ): Promise<DatabaseQueryResult> => {
    if (sql.includes('from outbox_events') && sql.includes('for update skip locked')) {
      return { rows: events, rowCount: events.length }
    }
    return { rows: [], rowCount: 0 }
  })
  const release = vi.fn()
  const client = { query, release } as unknown as DatabaseClient
  const database = {
    query,
    connect: vi.fn().mockResolvedValue(client),
  } as unknown as Database
  return { database, query, release }
}

describe('transactional outbox', () => {
  it('leases and delivers interest and match notifications idempotently', async () => {
    const { database, query, release } = databaseWithEvents([
      {
        id: 11,
        eventType: 'interest.sent',
        aggregateType: 'interest',
        aggregateId: 'interest-1',
        payload: { senderId: 'user-a', recipientId: 'user-b' },
        attempts: 0,
      },
      {
        id: 12,
        eventType: 'match.created',
        aggregateType: 'match',
        aggregateId: 'match-1',
        payload: {
          userOneId: 'user-a',
          userTwoId: 'user-b',
          matchId: 'match-1',
          kind: 'new_match',
        },
        attempts: 0,
      },
    ])
    const processor = new OutboxProcessor({ database })

    await expect(processor.process()).resolves.toEqual({
      processed: 2,
      succeeded: 2,
      failed: 0,
      deadLettered: 0,
    })

    const statements = query.mock.calls.map(([sql]) => sql)
    expect(statements.some(sql => sql.includes('for update skip locked'))).toBe(true)
    expect(statements.filter(sql => sql.includes('insert into notifications'))).toHaveLength(2)
    expect(statements.some(sql => sql.includes('on conflict(source_outbox_event_id,recipient_id)'))).toBe(true)
    expect(statements.filter(sql =>
      sql.startsWith('update outbox_events set') && sql.includes("status='processed'"),
    )).toHaveLength(2)
    expect(release).toHaveBeenCalledTimes(3)
  })

  it('backs off failed events and dead-letters the fifth attempt', async () => {
    const { database, query } = databaseWithEvents([{
      id: 13,
      eventType: 'unknown.event',
      aggregateType: 'test',
      aggregateId: 'test-1',
      payload: {},
      attempts: 4,
    }])
    const error = vi.spyOn(console,'error').mockImplementation(() => {})
    const processor = new OutboxProcessor({ database })

    await expect(processor.process()).resolves.toEqual({
      processed: 1,
      succeeded: 0,
      failed: 1,
      deadLettered: 1,
    })

    expect(query.mock.calls.some(([sql,values]) =>
      sql.includes('available_at=case') && values?.[1] === 'dead')).toBe(true)
    expect(error).toHaveBeenCalledWith(expect.stringContaining('"deadLettered":true'))
    error.mockRestore()
  })

  it('protects the worker and installs private durable storage', () => {
    const endpoint = read('server/api/outbox/process.post.ts')
    const enqueue = read('server/services/outbox/requestOutboxProcessing.ts')
    const migration = read('docs/migrations/20260831_add_transactional_outbox.sql')
    expect(endpoint).toContain('upstash-signature')
    expect(endpoint).toContain('QSTASH_CURRENT_SIGNING_KEY')
    expect(endpoint).toContain('QSTASH_NEXT_SIGNING_KEY')
    expect(endpoint).toContain('result.processed === 25')
    expect(enqueue).toContain('deduplicationId')
    expect(enqueue).toContain('VERCEL_AUTOMATION_BYPASS_SECRET')
    expect(enqueue).toContain('x-vercel-protection-bypass')
    expect(enqueue).toContain("key: 'transactional-outbox'")
    expect(enqueue).toContain('retries: 3')
    expect(migration).toContain('create table if not exists outbox_events')
    expect(migration).toContain('notifications_outbox_recipient_unique')
    expect(migration).toContain('enable row level security')
    expect(migration).toContain("'dead'")
  })
})
