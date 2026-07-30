import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('product rules and FAQ', () => {
  it('distinguishes product rules from the date journey on the homepage', () => {
    const home = read('pages/index.vue')
    expect(home).toContain('Why it works this way')
    expect(home).toContain('Choose who you’re actually curious about')
    expect(home).toContain('A plan is only a plan when you both say yes')
    expect(home).toContain('We help with the awkward bit between matching and meeting.')
    expect(home).toContain('to="/faq"')
  })

  it('explains discovery, planning, cancellation, privacy, and safety', () => {
    const faq = read('pages/faq.vue')
    expect(faq).toContain("title: 'Discovery and matching'")
    expect(faq).toContain("title: 'Planning a date'")
    expect(faq).toContain('How do active match limits work?')
    expect(faq).toContain('What is a manual match?')
    expect(faq).toContain('Why can I accept only one interest at a time?')
    expect(faq).toContain('What happens when a match is waiting?')
    expect(faq).toContain('How is cancelling different from rescheduling?')
    expect(faq).toContain("title: 'Privacy and safety'")
    expect(faq).toContain('to="/contact"')
  })

  it('links the FAQ from the global footer', () => {
    expect(read('components/AppFooter.vue')).toContain('to="/faq"')
  })
})
