// server/repositories/redis.ts

import { Redis } from "@upstash/redis"

type SetOptions = {
  ex?: number
  nx?: boolean
}

type SortedSetEntry = {
  member: string
  score: number
}

const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN

const values = new Map<string, unknown>()
const hashes = new Map<string, Map<string, unknown>>()
const sets = new Map<string, Set<string>>()
const sortedSets = new Map<string, Map<string, number>>()
const expiresAt = new Map<string, number>()

function isExpired(key: string) {
  const expiry = expiresAt.get(key)

  if (!expiry || expiry > Date.now()) {
    return false
  }

  values.delete(key)
  hashes.delete(key)
  sets.delete(key)
  sortedSets.delete(key)
  expiresAt.delete(key)
  return true
}

function normalizeStoredValue(value: unknown) {
  if (typeof value !== "string") {
    return value
  }

  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function createMockRedis() {
  if (process.env.NODE_ENV !== "test") {
    console.warn("[redis] Missing Upstash env vars; using in-memory mock Redis")
  }

  return {
    async get<T = unknown>(key: string): Promise<T | null> {
      if (isExpired(key)) return null
      return (normalizeStoredValue(values.get(key)) as T | undefined) ?? null
    },

    async set(key: string, value: unknown, options?: SetOptions) {
      if (options?.nx && values.has(key) && !isExpired(key)) {
        return null
      }

      values.set(key, value)

      if (options?.ex) {
        expiresAt.set(key, Date.now() + options.ex * 1000)
      }

      return "OK"
    },

    async del(...keys: string[]) {
      let deleted = 0

      for (const key of keys) {
        deleted += values.delete(key) ? 1 : 0
        deleted += hashes.delete(key) ? 1 : 0
        deleted += sets.delete(key) ? 1 : 0
        deleted += sortedSets.delete(key) ? 1 : 0
        expiresAt.delete(key)
      }

      return deleted
    },

    async incr(key: string) {
      if (isExpired(key)) {
        values.delete(key)
      }

      const next = Number(values.get(key) ?? 0) + 1
      values.set(key, next)
      return next
    },

    async expire(key: string, seconds: number) {
      expiresAt.set(key, Date.now() + seconds * 1000)
      return 1
    },

    async ttl(key: string) {
      if (isExpired(key)) return -2

      const expiry = expiresAt.get(key)
      if (!expiry) return -1

      return Math.max(0, Math.ceil((expiry - Date.now()) / 1000))
    },

    async hmget<T = unknown>(key: string, ...fields: string[]): Promise<Array<T | null>> {
      if (isExpired(key)) {
        return fields.map(() => null)
      }

      const hash = hashes.get(key)
      return fields.map((field) => {
        const value = hash?.get(field)
        return value === undefined ? null : (normalizeStoredValue(value) as T)
      })
    },

    async hset(key: string, data: Record<string, unknown>) {
      const hash = hashes.get(key) ?? new Map<string, unknown>()

      for (const [field, value] of Object.entries(data)) {
        hash.set(field, value)
      }

      hashes.set(key, hash)
      return Object.keys(data).length
    },

    async sadd(key: string, ...members: string[]) {
      const set = sets.get(key) ?? new Set<string>()
      let added = 0

      for (const member of members) {
        if (!set.has(member)) {
          added += 1
        }
        set.add(member)
      }

      sets.set(key, set)
      return added
    },

    async sismember(key: string, member: string) {
      if (isExpired(key)) return 0
      return sets.get(key)?.has(member) ? 1 : 0
    },

    async scard(key: string) {
      if (isExpired(key)) return 0
      return sets.get(key)?.size ?? 0
    },

    async zadd(key: string, entry: SortedSetEntry) {
      const sortedSet = sortedSets.get(key) ?? new Map<string, number>()
      sortedSet.set(entry.member, entry.score)
      sortedSets.set(key, sortedSet)
      return 1
    },

    async zremrangebyscore(key: string, min: number, max: number) {
      const sortedSet = sortedSets.get(key)
      if (!sortedSet) return 0

      let removed = 0

      for (const [member, score] of sortedSet.entries()) {
        if (score >= min && score <= max) {
          sortedSet.delete(member)
          removed += 1
        }
      }

      return removed
    },

    async zcard(key: string) {
      if (isExpired(key)) return 0
      return sortedSets.get(key)?.size ?? 0
    },
  }
}

export const redis = url && token
  ? new Redis({ url, token })
  : createMockRedis()
