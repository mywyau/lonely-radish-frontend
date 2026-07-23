import { createError } from 'h3'

export type ListCursor = { sortAt: string; tieBreaker: string }

export function encodeCursor(cursor: ListCursor) {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCursor(value: unknown): ListCursor | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || value.length > 500) throw createError({ statusCode: 400, statusMessage: 'Invalid pagination cursor' })
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<ListCursor>
    if (typeof parsed.sortAt !== 'string' || Number.isNaN(Date.parse(parsed.sortAt)) || typeof parsed.tieBreaker !== 'string' || !parsed.tieBreaker) throw new Error()
    return { sortAt: parsed.sortAt, tieBreaker: parsed.tieBreaker }
  } catch { throw createError({ statusCode: 400, statusMessage: 'Invalid pagination cursor' }) }
}

export function pageRows<T>(rows: T[], pageSize: number, cursorFor: (row: T) => ListCursor) {
  const hasMore = rows.length > pageSize
  const items = hasMore ? rows.slice(0, pageSize) : rows
  return { items, hasMore, nextCursor: hasMore && items.length ? encodeCursor(cursorFor(items.at(-1)!)) : null }
}
