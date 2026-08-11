import { createError } from 'h3'
import { db, type DatabaseQueryable } from '../repositories/db'
import { redis } from '../repositories/redis'
import { recordAccountAccessCache } from './telemetry'

export type AccountStatus = 'active' | 'paused' | 'suspended' | 'deleting'

export type AccountAccess = {
  accountStatus: AccountStatus
  suspendedUntil: string | null
}

type AccountAccessCache = {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, options?: { ex?: number }): Promise<unknown>
  del(...keys: string[]): Promise<unknown>
}

type AccountAccessServiceOptions = {
  database: DatabaseQueryable
  cache: AccountAccessCache
  cacheEnabled?: boolean
  ttlSeconds?: number
  now?: () => number
  recordCacheOutcome?: (outcome: 'hit' | 'miss' | 'read_error' | 'write' | 'write_error' | 'invalidate' | 'invalidate_error') => void
}

const CACHE_KEY_PREFIX = 'account-access:v1:'
const allowedStatuses = new Set<AccountStatus>(['active', 'paused', 'suspended', 'deleting'])

function cacheKey(userId: string) {
  return `${CACHE_KEY_PREFIX}${userId}`
}

function normalizedAccess(value: unknown): AccountAccess | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Record<string, unknown>
  if (typeof candidate.accountStatus !== 'string' || !allowedStatuses.has(candidate.accountStatus as AccountStatus)) return null
  if (candidate.suspendedUntil !== null && candidate.suspendedUntil !== undefined
    && typeof candidate.suspendedUntil !== 'string') return null
  return {
    accountStatus: candidate.accountStatus as AccountStatus,
    suspendedUntil: typeof candidate.suspendedUntil === 'string' ? candidate.suspendedUntil : null,
  }
}

function serializedAccess(access: AccountAccess): AccountAccess {
  return {
    accountStatus: access.accountStatus,
    suspendedUntil: access.suspendedUntil ? new Date(access.suspendedUntil).toISOString() : null,
  }
}

export function createAccountAccessService(options: AccountAccessServiceOptions) {
  const cacheEnabled = options.cacheEnabled ?? true
  const ttlSeconds = options.ttlSeconds ?? 20
  const now = options.now ?? Date.now
  const record = options.recordCacheOutcome ?? (() => {})
  const pendingLoads = new Map<string, Promise<AccountAccess>>()

  async function readCached(userId: string) {
    if (!cacheEnabled) return null
    try {
      const access = normalizedAccess(await options.cache.get(cacheKey(userId)))
      if (!access) {
        record('miss')
        return null
      }
      if (access.accountStatus === 'suspended' && access.suspendedUntil
        && new Date(access.suspendedUntil).getTime() <= now()) {
        record('miss')
        return null
      }
      record('hit')
      return access
    } catch {
      record('read_error')
      return null
    }
  }

  async function remember(userId: string, access: AccountAccess) {
    if (!cacheEnabled) return false
    try {
      await options.cache.set(cacheKey(userId), serializedAccess(access), { ex: ttlSeconds })
      record('write')
      return true
    } catch {
      record('write_error')
      return false
    }
  }

  async function invalidate(userId: string) {
    if (!cacheEnabled) return false
    try {
      await options.cache.del(cacheKey(userId))
      record('invalidate')
      return true
    } catch {
      record('invalidate_error')
      return false
    }
  }

  async function replace(userId: string, access: AccountAccess) {
    // Delete first so a failed write cannot leave an older permissive value in place.
    await invalidate(userId)
    return remember(userId, access)
  }

  async function loadFromDatabase(userId: string): Promise<AccountAccess> {
    const { rows } = await options.database.query<{
      accountStatus: AccountStatus
      suspendedUntil: string | Date | null
    }>(`with restored as (
      update users set account_status='active',moderation_suspended_until=null,
        moderation_updated_at=now(),moderation_updated_by=null,updated_at=now()
      where id=$1 and account_status='suspended'
        and moderation_suspended_until is not null and moderation_suspended_until<=now()
      returning id
    ), audit as (
      insert into moderation_actions(target_user_id,action,note)
      select id,'auto_restore','Temporary suspension expired' from restored returning target_user_id
    ), notice as (
      insert into notifications(recipient_id,kind)
      select id,'account_restored' from restored returning recipient_id
    )
    select u.account_status as "accountStatus",u.moderation_suspended_until as "suspendedUntil"
    from users u where u.id=$1`, [userId])
    const row = rows[0]
    if (!row) throw createError({ statusCode: 401, statusMessage: 'Account not found' })
    return serializedAccess({
      accountStatus: row.accountStatus,
      suspendedUntil: row.suspendedUntil ? new Date(row.suspendedUntil).toISOString() : null,
    })
  }

  async function resolve(userId: string): Promise<AccountAccess> {
    const cached = await readCached(userId)
    if (cached) return cached

    const existingLoad = pendingLoads.get(userId)
    if (existingLoad) return existingLoad

    const load = (async () => {
      const access = await loadFromDatabase(userId)
      await remember(userId, access)
      return access
    })()
    pendingLoads.set(userId, load)
    try {
      return await load
    } finally {
      pendingLoads.delete(userId)
    }
  }

  return { resolve, remember, replace, invalidate }
}

const cacheEnabled = process.env.ACCOUNT_ACCESS_CACHE_ENABLED?.trim().toLowerCase() !== 'false'
const accountAccessService = createAccountAccessService({
  database: db,
  cache: redis,
  cacheEnabled,
  ttlSeconds: 20,
  recordCacheOutcome: recordAccountAccessCache,
})

export const resolveAccountAccess = accountAccessService.resolve
export const rememberAccountAccess = accountAccessService.remember
export const replaceAccountAccess = accountAccessService.replace
export const invalidateAccountAccess = accountAccessService.invalidate

export function assertAccountAccessAllowed(access: AccountAccess) {
  if (access.accountStatus === 'suspended') {
    throw createError({
      statusCode: 403,
      statusMessage: access.suspendedUntil ? 'Account temporarily suspended' : 'Account suspended',
      data: { code: 'ACCOUNT_SUSPENDED', suspendedUntil: access.suspendedUntil },
    })
  }
  if (access.accountStatus === 'deleting') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Account deletion is in progress',
      data: { code: 'ACCOUNT_DELETING' },
    })
  }
}
