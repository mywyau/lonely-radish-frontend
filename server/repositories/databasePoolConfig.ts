type PoolEnvironment = Record<string, string | undefined>

export function databasePoolMax(environment: PoolEnvironment = process.env): number {
  const raw = environment.DATABASE_POOL_MAX?.trim() || '2'
  if (!/^\d+$/.test(raw)) {
    throw new Error('[startup] DATABASE_POOL_MAX must be an integer between 1 and 10')
  }
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < 1 || value > 10) {
    throw new Error('[startup] DATABASE_POOL_MAX must be an integer between 1 and 10')
  }
  return value
}
