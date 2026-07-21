import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('account deletion', () => {
  it('requires typed confirmation and queues the authenticated account', () => {
    const page = read('pages/account/v2/index.vue')
    expect(page).toContain("$fetch('/api/account/v2', { method: 'DELETE'")
    expect(page).toContain('Permanently delete account')
    expect(page).toContain("window.location.assign('/api/auth/logout')")
    const endpoint = read('server/api/account/v2/index.delete.ts')
    expect(endpoint).toContain('Confirmation text did not match')
    expect(endpoint).toContain('account_deletion_jobs')
  })

  it('removes external services, stored photos, and cascading database data', () => {
    const worker = read('server/api/account/v2/worker-delete.post.ts')
    expect(worker).toContain('deleteAuth0User')
    expect(worker).toContain('stripe.subscriptions.cancel')
    const local = read('server/utils/deleteUserData.ts')
    expect(local).toContain('PROFILE_PHOTO_BUCKET')
    expect(local).toContain('DELETE FROM users WHERE id = $1')
  })
})
