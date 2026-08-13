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
    expect(terms).toContain('optional supporter membership')
    expect(terms).toContain('Separate business subscriptions')
    expect(terms).not.toContain('Some features of Lonely Radish may require a paid subscription')

    expect(acceptableUse).toContain("title: 'Acceptable Use Policy · Lonely Radish'")
    expect(acceptableUse).toContain('13 August 2026')
    expect(acceptableUse).toContain('Adults only')
    expect(acceptableUse).toContain('Paid companionship')
    expect(acceptableUse).toContain('A supporter membership helps fund Lonely Radish')
    expect(acceptableUse).toContain('Reporting and enforcement')

    expect(lawEnforcement).toContain("title: 'Law Enforcement Guidelines · Lonely Radish'")
    expect(lawEnforcement).toContain('Verification and review')
    expect(lawEnforcement).toContain('Preservation requests')
    expect(lawEnforcement).toContain('Emergency requests')
    expect(lawEnforcement).toContain('mailto:contact@lonelyradish.app')

    expect(refund).toContain("title: 'Refund Policy · Lonely Radish'")
    expect(refund).toContain('13 August 2026')
    expect(refund).not.toContain('new Date()')
    expect(refund).toContain('do not unlock dating advantages')
    expect(refund).toContain('queues account data for deletion')
    expect(refund).toContain('non-refundable')
    expect(refund).toContain('mailto:billing@lonelyradish.app')
  })

  it('describes the personal data and providers used by the current app', () => {
    const privacy = readPage('privacy-notice.vue')
    expect(privacy).toContain('13 August 2026')
    expect(privacy).toContain('sexual orientation')
    expect(privacy).toContain('racial or ethnic identity')
    expect(privacy).toContain('<strong>Auth0:</strong>')
    expect(privacy).toContain('<strong>Vercel:</strong>')
    expect(privacy).toContain('<strong>Supabase:</strong>')
    expect(privacy).toContain('<strong>Upstash:</strong>')
    expect(privacy).toContain('<strong>Resend:</strong>')
    expect(privacy).toContain('<strong>OpenCage:</strong>')
    expect(privacy).toContain('Automatic page-view analytics may process the page path')
    expect(privacy).not.toContain('Prototype account information')
    expect(privacy).not.toContain('Preference cookies')
  })
})
