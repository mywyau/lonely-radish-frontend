import { describe, expect, it } from 'vitest'
import {
  assertAccountAccessAllowed,
  createAccountAccessService,
  type AccountAccess,
} from '../server/utils/accountAccess'
import type { DatabaseQueryable } from '../server/repositories/db'

class FakeCache {
  values = new Map<string, unknown>()
  failReads = false
  failWrites = false

  async get<T = unknown>(key: string): Promise<T | null> {
    if (this.failReads) throw new Error('Redis unavailable')
    return (this.values.get(key) as T | undefined) ?? null
  }

  async set(key: string, value: unknown) {
    if (this.failWrites) throw new Error('Redis unavailable')
    this.values.set(key, value)
    return 'OK'
  }

  async del(...keys: string[]) {
    for (const key of keys) this.values.delete(key)
    return keys.length
  }
}

function databaseReturning(access: AccountAccess, onQuery?: () => void): DatabaseQueryable {
  return {
    async query<Row>() {
      onQuery?.()
      return { rows: [access as unknown as Row], rowCount: 1 }
    },
  }
}

describe('account access cache', () => {
  it('loads once from PostgreSQL and serves later checks from Redis', async () => {
    const cache = new FakeCache()
    const outcomes: string[] = []
    let queries = 0
    const service = createAccountAccessService({
      database: databaseReturning({ accountStatus: 'active', suspendedUntil: null }, () => queries++),
      cache,
      recordCacheOutcome: outcome => outcomes.push(outcome),
    })

    await expect(service.resolve('member-1')).resolves.toEqual({ accountStatus: 'active', suspendedUntil: null })
    await expect(service.resolve('member-1')).resolves.toEqual({ accountStatus: 'active', suspendedUntil: null })

    expect(queries).toBe(1)
    expect(outcomes).toEqual(['miss', 'write', 'hit'])
  })

  it('falls back to PostgreSQL when Redis cannot be read or written', async () => {
    const cache = new FakeCache()
    cache.failReads = true
    cache.failWrites = true
    let queries = 0
    const service = createAccountAccessService({
      database: databaseReturning({ accountStatus: 'paused', suspendedUntil: null }, () => queries++),
      cache,
    })

    await expect(service.resolve('member-2')).resolves.toEqual({ accountStatus: 'paused', suspendedUntil: null })
    expect(queries).toBe(1)
  })

  it('refreshes an expired suspension so database restoration can run', async () => {
    const cache = new FakeCache()
    cache.values.set('account-access:v1:member-3', {
      accountStatus: 'suspended',
      suspendedUntil: '2026-08-10T10:00:00.000Z',
    })
    let queries = 0
    const service = createAccountAccessService({
      database: databaseReturning({ accountStatus: 'active', suspendedUntil: null }, () => queries++),
      cache,
      now: () => new Date('2026-08-11T10:00:00.000Z').getTime(),
    })

    await expect(service.resolve('member-3')).resolves.toEqual({ accountStatus: 'active', suspendedUntil: null })
    expect(queries).toBe(1)
  })

  it('coalesces simultaneous cache misses for the same account', async () => {
    const cache = new FakeCache()
    let queries = 0
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const database: DatabaseQueryable = {
      async query<Row>() {
        queries++
        await gate
        return { rows: [{ accountStatus: 'active', suspendedUntil: null } as unknown as Row], rowCount: 1 }
      },
    }
    const service = createAccountAccessService({ database, cache })

    const first = service.resolve('member-4')
    const second = service.resolve('member-4')
    await Promise.resolve()
    release()

    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(queries).toBe(1)
  })

  it('updates and invalidates status entries after account changes', async () => {
    const cache = new FakeCache()
    const service = createAccountAccessService({
      database: databaseReturning({ accountStatus: 'active', suspendedUntil: null }),
      cache,
    })

    await expect(service.remember('member-5', { accountStatus: 'deleting', suspendedUntil: null })).resolves.toBe(true)
    await expect(service.resolve('member-5')).resolves.toEqual({ accountStatus: 'deleting', suspendedUntil: null })
    await expect(service.invalidate('member-5')).resolves.toBe(true)
    expect(cache.values.has('account-access:v1:member-5')).toBe(false)
  })

  it('removes an older permissive value before replacing account status', async () => {
    const cache = new FakeCache()
    const service = createAccountAccessService({
      database: databaseReturning({ accountStatus: 'deleting', suspendedUntil: null }),
      cache,
    })
    await service.remember('member-6', { accountStatus: 'active', suspendedUntil: null })
    cache.failWrites = true

    await expect(service.replace('member-6', { accountStatus: 'deleting', suspendedUntil: null })).resolves.toBe(false)
    expect(cache.values.has('account-access:v1:member-6')).toBe(false)
  })

  it('fails suspended and deleting accounts closed', () => {
    expect(() => assertAccountAccessAllowed({ accountStatus: 'active', suspendedUntil: null })).not.toThrow()
    expect(() => assertAccountAccessAllowed({ accountStatus: 'paused', suspendedUntil: null })).not.toThrow()
    expect(() => assertAccountAccessAllowed({ accountStatus: 'suspended', suspendedUntil: null })).toThrow('Account suspended')
    expect(() => assertAccountAccessAllowed({ accountStatus: 'deleting', suspendedUntil: null })).toThrow('Account deletion is in progress')
  })
})
