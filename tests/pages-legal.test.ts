import { describe, it, expect } from 'vitest'
import { readPage } from './pageTestUtils'

describe('legal and policy page contracts', () => {
  it('terms and refund pages keep key metadata and support details', () => {
    const terms = readPage('terms-of-service.vue')
    const refund = readPage('refund-policy.vue')

    expect(terms).toContain("title: 'Terms of Service · Lonely Radish'")
    expect(terms).toContain('Governing law')
    expect(terms).toContain('mailto:contact@lonelyradish.app')

    expect(refund).toContain("title: 'Refund Policy · Lonely Radish'")
    expect(refund).toContain('non-refundable')
    expect(refund).toContain('mailto:billing@lonelyradish.app')
  })
})
