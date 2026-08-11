import { describe, expect, it, vi } from 'vitest'
import { withDatabaseClient, type Database, type DatabaseClient } from '../server/repositories/db'

function testDatabase() {
  const release = vi.fn()
  const client: DatabaseClient = {
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    release,
  }
  const database: Database = {
    query: vi.fn(async () => ({ rows: [], rowCount: 0 })),
    connect: vi.fn(async () => client),
  }
  return { client, database, release }
}

describe('withDatabaseClient', () => {
  it('shares one client with the work and releases it afterwards', async () => {
    const { client, database, release } = testDatabase()
    const result = await withDatabaseClient(async (databaseClient) => {
      expect(databaseClient).toBe(client)
      await databaseClient.query('select 1')
      await databaseClient.query('select 2')
      return 'complete'
    }, database)

    expect(result).toBe('complete')
    expect(database.connect).toHaveBeenCalledOnce()
    expect(client.query).toHaveBeenCalledTimes(2)
    expect(release).toHaveBeenCalledOnce()
  })

  it('releases the client when work throws', async () => {
    const { database, release } = testDatabase()
    await expect(withDatabaseClient(async () => {
      throw new Error('query failed')
    }, database)).rejects.toThrow('query failed')
    expect(release).toHaveBeenCalledOnce()
  })
})
