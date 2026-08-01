import { describe, expect, it } from 'vitest'
import {
  accountCollisionMessage,
  isUniqueConstraintViolation,
  normalizeAuthEmail,
} from '../server/services/auth/accountCollision'

describe('authentication account collisions', () => {
  it('normalizes email case and surrounding whitespace without changing aliases', () => {
    expect(normalizeAuthEmail('  Maya+Dates@Gmail.com ')).toBe('maya+dates@gmail.com')
  })

  it('directs users back to their existing sign-in method', () => {
    expect(accountCollisionMessage('google-oauth2|123')).toContain('uses Google')
    expect(accountCollisionMessage('auth0|123')).toContain('uses email and password')
    expect(accountCollisionMessage('github|123')).toContain('another sign-in method')
  })

  it('recognises the PostgreSQL unique-constraint error used as the race guard', () => {
    expect(isUniqueConstraintViolation({ code: '23505' })).toBe(true)
    expect(isUniqueConstraintViolation({ code: '23503' })).toBe(false)
    expect(isUniqueConstraintViolation(new Error('failed'))).toBe(false)
  })
})
