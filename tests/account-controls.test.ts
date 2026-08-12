import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('account controls page', () => {
  it('separates operational panels from account details', () => {
    const account = read('pages/account/v2/index.vue')
    const controls = read('pages/account/controls.vue')
    expect(account).toContain('to="/account/controls"')
    expect(controls).toContain('Your membership')
    expect(controls).toContain('Take a break')
    expect(controls).toContain('Your attendance history')
    expect(controls).toContain("middleware: 'logged-in'")
    expect(controls).toContain('Promise.allSettled')
    expect(controls).toContain('controlsLoadError')
    expect(controls).toContain('@click="loadControls"')
  })
})
