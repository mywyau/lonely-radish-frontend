import { describe, it, expect } from 'vitest'
import { readPage } from './pageTestUtils'

describe('core page contracts', () => {
  it('contact page keeps metadata title and support email link', () => {
    const source = readPage('contact.vue')
    expect(source).toContain("title: 'Contact · Lonely Radish'")
    expect(source).toContain('mailto:contact@lonelyradish.app')
  })

  it('privacy notice page keeps metadata title and heading copy', () => {
    const source = readPage('privacy-notice.vue')
    expect(source).toContain("title: 'Privacy Notice · Lonely Radish'")
    expect(source).toContain('Privacy Notice')
    expect(source).toContain('Last updated:')
  })

  it('home page keeps SEO metadata and coffee-date call to action', () => {
    const source = readPage('index.vue')
    expect(source).toContain("title: 'Coffee dates without the endless chat'")
    expect(source).toContain('Start matching')
    expect(source).toContain('People browsing now')
    expect(source).toContain('Coffee-first profiles with date intent up front')
    expect(source).toContain('/images/coffee-date-hero.png')
    expect(source).toContain('user.value?.firstName')
  })
})
