import { describe, it, expect } from 'vitest'
import { readPage } from './pageTestUtils'

describe('legal and policy page contracts', () => {
  it('terms, acceptable use and refund pages keep key policy details', () => {
    const terms = readPage('terms-of-service.vue')
    const acceptableUse = readPage('acceptable-use.vue')
    const lawEnforcement = readPage('law-enforcement-guidelines.vue')
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

    expect(lawEnforcement).toContain("title: 'Law Enforcement Guidelines · Lonely Radish'")
    expect(lawEnforcement).toContain('Verification and review')
    expect(lawEnforcement).toContain('Preservation requests')
    expect(lawEnforcement).toContain('Emergency requests')
    expect(lawEnforcement).toContain('mailto:contact@lonelyradish.app')

    expect(refund).toContain("title: 'Refund Policy · Lonely Radish'")
    expect(refund).toContain('non-refundable')
    expect(refund).toContain('mailto:billing@lonelyradish.app')
  })
})
