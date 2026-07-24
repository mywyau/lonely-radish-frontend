import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('account controls page', () => {
  it('separates operational panels from account details', () => {
    const account = read('pages/account/v2/index.vue')
    const controls = read('pages/account/controls.vue')
    expect(account).toContain('to="/account/controls"')
    expect(controls).toContain('Plan preview')
    expect(controls).toContain('Pause discovery')
    expect(controls).toContain('Date reliability')
    expect(controls).toContain("middleware: 'logged-in'")
  })
})
