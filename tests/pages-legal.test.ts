import { describe, it, expect } from 'vitest'
import { readPage } from './pageTestUtils'

describe('legal and policy page contracts', () => {
  it('terms, acceptable use and refund pages keep key policy details', () => {
    const terms = readPage('terms-of-service.vue')
    const acceptableUse = readPage('acceptable-use.vue')
    const refund = readPage('refund-policy.vue')

    expect(terms).toContain("title: 'Terms of Service · Lonely Radish'")
    expect(terms).toContain('Governing law')
    expect(terms).toContain('to="/acceptable-use"')
    expect(terms).toContain('mailto:contact@lonelyradish.app')

    expect(acceptableUse).toContain("title: 'Acceptable Use Policy · Lonely Radish'")
    expect(acceptableUse).toContain('30 July 2026')
    expect(acceptableUse).toContain('Adults only')
    expect(acceptableUse).toContain('Paid companionship')
    expect(acceptableUse).toContain('Reporting and enforcement')

    expect(refund).toContain("title: 'Refund Policy · Lonely Radish'")
    expect(refund).toContain('non-refundable')
    expect(refund).toContain('mailto:billing@lonelyradish.app')
  })
})
