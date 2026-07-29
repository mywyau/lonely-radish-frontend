import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { DatabaseClient } from '../server/repositories/db'
import { IdempotencyRepository } from '../server/repositories/idempotency'

describe('API idempotency', () => {
  it('replays the committed response for a duplicate operation key', async () => {
    const response = { matched: true, queued: false, matchId: 'match-1' }
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({
        rows: [{ requestFingerprint: 'interest-1', response }],
        rowCount: 1,
      })
    const repository = new IdempotencyRepository({
      query,
      release: vi.fn(),
    } as unknown as DatabaseClient)

    await expect(repository.claim(
      'user-1',
      'interest.accept',
      'request-key-0001',
      'interest-1',
    )).resolves.toEqual({
      claimed: false,
      requestFingerprint: 'interest-1',
      response,
    })
    expect(query.mock.calls[0][0]).toContain('on conflict(user_id,operation,idempotency_key) do nothing')
    expect(query.mock.calls[1][0]).toContain('for update')
  })

  it('enforces one key per user and operation at the database layer', () => {
    const migration = readFileSync(resolve(
      process.cwd(),
      'docs/migrations/20260830_add_api_idempotency.sql',
    ), 'utf8')
    expect(migration).toContain('primary key (user_id, operation, idempotency_key)')
    expect(migration).toContain('request_fingerprint')
    expect(readFileSync(resolve(process.cwd(), 'composables/useDailyInterest.ts'), 'utf8'))
      .toContain("'Idempotency-Key': crypto.randomUUID()")
    expect(readFileSync(resolve(process.cwd(), 'pages/interests/received.vue'), 'utf8'))
      .toContain("'Idempotency-Key': crypto.randomUUID()")
  })
})
