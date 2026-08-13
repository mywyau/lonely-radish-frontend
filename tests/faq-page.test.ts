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
    expect(faq).toContain('those stages do not use separate spaces')
    expect(faq).toContain('How is cancelling different from rescheduling?')
    expect(faq).toContain("title: 'Privacy and safety'")
    expect(faq).toContain('A profile photo and regular availability are helpful but optional')
    expect(faq).toContain('The person you choose can see your interest')
    expect(faq).toContain('Only the person who ended it may later send one apology')
    expect(faq).toContain('block or report someone from their profile')
    expect(faq).toContain('Your answer and optional note stay hidden until both people respond')
    expect(faq).toContain('then you can each see what the other chose')
    expect(faq).not.toContain('not shared unless you both want another date')
    expect(faq).not.toContain('profile or date page')
    expect(faq).toContain('to="/contact"')
  })

  it('links the FAQ from the global footer', () => {
    expect(read('components/AppFooter.vue')).toContain('to="/faq"')
  })
})
