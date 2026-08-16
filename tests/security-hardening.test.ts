import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { databaseSslOptions } from '../server/repositories/db'
import { sanitizeProfilePhoto } from '../server/utils/profilePhotoValidation'
import { configuredRequestOrigins, requestOriginAllowed } from '../server/utils/requestOrigin'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('launch security hardening', () => {
  it('adds browser security headers to application responses', () => {
    const config = read('nuxt.config.ts')
    expect(config).toContain('Content-Security-Policy')
    expect(config).toContain("frame-ancestors 'none'")
    expect(config).toContain("object-src 'none'")
    expect(config).toContain('X-Content-Type-Options')
    expect(config).toContain('Permissions-Policy')
    expect(config).toContain('Referrer-Policy')
  })

  it('rejects foreign browser mutations while retaining signed service requests', () => {
    const allowedOrigins = configuredRequestOrigins({
      SITE_URL: 'https://lonelyradish.com',
      APP_BASE_URL: 'https://lonelyradish.com',
    })
    expect(requestOriginAllowed({ method: 'POST', pathname: '/api/interests',
      origin: 'https://lonelyradish.com', fetchSite: 'same-origin', allowedOrigins })).toBe(true)
    expect(requestOriginAllowed({ method: 'POST', pathname: '/api/interests',
      origin: 'https://attacker.example', fetchSite: 'cross-site', allowedOrigins })).toBe(false)
    expect(requestOriginAllowed({ method: 'GET', pathname: '/api/interests',
      origin: 'https://attacker.example', fetchSite: 'cross-site', allowedOrigins })).toBe(true)
    expect(requestOriginAllowed({ method: 'POST', pathname: '/api/stripe/v2/webhook',
      fetchSite: 'cross-site', allowedOrigins })).toBe(true)
  })

  it('verifies database certificates by default and supports a private CA', () => {
    expect(databaseSslOptions({})).toEqual({ rejectUnauthorized: true })
    expect(databaseSslOptions({ DATABASE_SSL_REJECT_UNAUTHORIZED: 'false' }))
      .toEqual({ rejectUnauthorized: false })
    expect(databaseSslOptions({ DATABASE_CA_CERT: 'line one\\nline two' }))
      .toEqual({ rejectUnauthorized: true, ca: 'line one\nline two' })
  })

  it('decodes and normalizes uploaded photos instead of trusting MIME metadata', async () => {
    const jpeg = await sharp({ create: {
      width: 1800, height: 1200, channels: 3, background: '#b4234a',
    } }).jpeg().toBuffer()
    const normalized = await sanitizeProfilePhoto(jpeg, 'image/jpeg', 'full')
    const metadata = await sharp(normalized).metadata()
    expect(metadata.format).toBe('jpeg')
    expect(metadata.width).toBeLessThanOrEqual(1600)
    expect(metadata.height).toBeLessThanOrEqual(1600)
    expect(normalized.byteLength).toBeLessThanOrEqual(1024 * 1024)
    await expect(sanitizeProfilePhoto(jpeg, 'image/webp', 'full')).rejects.toThrow('declared file type')
    await expect(sanitizeProfilePhoto(Buffer.from('<script>alert(1)</script>'), 'image/jpeg', 'full'))
      .rejects.toThrow()
  })
})
