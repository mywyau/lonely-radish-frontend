import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('product rules and FAQ', () => {
  it('distinguishes product rules from the date journey on the homepage', () => {
    const home = read('pages/index.vue')
    expect(home).toContain('The rules behind the app')
    expect(home).toContain('Interest is deliberately selective')
    expect(home).toContain('Date changes need a clear response')
    expect(home).toContain('Match. Make a plan. Meet.')
    expect(home).toContain('to="/faq"')
  })

  it('explains discovery, planning, cancellation, privacy, and safety', () => {
    const faq = read('pages/faq.vue')
    expect(faq).toContain("title: 'Discovery and matching'")
    expect(faq).toContain("title: 'Planning a date'")
    expect(faq).toContain('How is cancelling different from rescheduling?')
    expect(faq).toContain("title: 'Privacy and safety'")
    expect(faq).toContain('to="/contact"')
  })

  it('links the FAQ from the global footer', () => {
    expect(read('components/AppFooter.vue')).toContain('to="/faq"')
  })
})
