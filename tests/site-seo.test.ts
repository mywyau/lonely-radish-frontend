import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultSeoDescription, isIndexablePath, publicSeoByPath } from '../utils/siteSeo'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('site SEO metadata', () => {
  it('gives every indexable public page distinct, human product metadata', () => {
    expect(Object.keys(publicSeoByPath)).toEqual([
      '/', '/faq', '/upgrade', '/contact', '/terms-of-service', '/acceptable-use',
      '/law-enforcement-guidelines', '/privacy-notice', '/refund-policy',
    ])
    expect(new Set(Object.values(publicSeoByPath).map(page => page.title)).size)
      .toBe(Object.keys(publicSeoByPath).length)
    expect(new Set(Object.values(publicSeoByPath).map(page => page.description)).size)
      .toBe(Object.keys(publicSeoByPath).length)
    expect(defaultSeoDescription.toLowerCase()).not.toContain('coffee')
    expect(JSON.stringify(publicSeoByPath).toLowerCase()).not.toContain('coffee-date')
  })

  it('keeps private and authentication journeys out of search results', () => {
    expect(isIndexablePath('/')).toBe(true)
    expect(isIndexablePath('/faq')).toBe(true)
    expect(isIndexablePath('/faq/')).toBe(true)
    expect(isIndexablePath('/matches')).toBe(false)
    expect(isIndexablePath('/profiles/someone')).toBe(false)
    expect(isIndexablePath('/please-sign-in')).toBe(false)

    const app = read('app.vue')
    expect(app).toContain("isIndexablePath(route.path) ? 'index, follow' : 'noindex, nofollow'")
    expect(app).toContain('normaliseSeoPath(route.path)')
    expect(app).toContain("rel: 'canonical'")
    expect(app).not.toContain('Coffee-date dating')
  })

  it('publishes only indexable pages in the sitemap and leaves noindex pages crawlable', () => {
    const sitemap = read('server/routes/sitemap.xml.ts')
    const robots = read('public/robots.txt')
    expect(sitemap).toContain("{ path: '/faq'")
    expect(sitemap).toContain("{ path: '/upgrade'")
    expect(sitemap).not.toContain("'/coming-soon'")
    expect(sitemap).not.toContain('<lastmod>')
    expect(robots).toContain('Disallow: /api/')
    expect(robots).not.toContain('Disallow: /profiles/')
    expect(robots).not.toContain('Disallow: /matches/')
    expect(robots).toContain('Sitemap: https://lonelyradish.com/sitemap.xml')
  })
})
