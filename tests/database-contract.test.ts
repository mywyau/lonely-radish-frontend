import { afterEach, describe, expect, it, vi } from 'vitest'

describe('database contract', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('provides the same query result shape at pool and client level without a database', async () => {
    vi.stubEnv('DATABASE_URL', '')
    vi.stubEnv('NODE_ENV', 'test')

    const { db } = await import('../server/repositories/db')

    await expect(db.query<{ id: string }>('select id from users')).resolves.toEqual({
      rows: [],
      rowCount: 0,
    })

    const client = await db.connect()
    await expect(client.query<{ id: string }>('select id from users')).resolves.toEqual({
      rows: [],
      rowCount: 0,
    })
    expect(() => client.release()).not.toThrow()
  })
})
