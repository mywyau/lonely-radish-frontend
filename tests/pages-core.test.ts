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

  it('home page keeps SEO metadata and activity-date call to action', () => {
    const source = readPage('index.vue')
    expect(source).toContain("title: 'Meet through activities you both want to do'")
    expect(source).toContain('Start matching')
    expect(source).toContain('New activity matches are ready to browse.')
    expect(source).toContain('Skip the endless swiping. Say yes to a plan.')
    expect(source).toContain('text-[#2A1520] sm:text-6xl')
    expect(source).toContain('user.value?.firstName')
  })
})
