import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readPage(file: string) {
  return readFileSync(resolve(process.cwd(), 'pages', file), 'utf8')
}

describe('frontend page contracts', () => {
  it('contact page keeps metadata title and support email link', () => {
    const source = readPage('contact.vue')

    expect(source).toContain("title: 'Contact · TaroTea'")
    expect(source).toContain('mailto:contact@tarotea.co.uk')
  })

  it('privacy notice page keeps metadata title and heading copy', () => {
    const source = readPage('privacy-notice.vue')

    expect(source).toContain("title: 'Privacy Notice · TaroTea'")
    expect(source).toContain('Privacy Notice')
    expect(source).toContain('Last updated:')
  })

  it('home page keeps SEO metadata and start-learning call to action', () => {
    const source = readPage('index.vue')

    expect(source).toContain("title: 'Learn Cantonese in 15 minutes a day'")
    expect(source).toContain('Start learning Cantonese today')
    expect(source).toContain('Current users online')
  })
})
