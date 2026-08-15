import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('interest lifecycle', () => {
  it('expires pending interests after 14 days and releases counter capacity', () => {
    const lifecycle = read('server/utils/interestLifecycle.ts')
    const migration = read('docs/migrations/20260908_add_interest_lifecycle.sql')
    const capacity = read('docs/migrations/20260905_optimize_discovery_interest_capacity.sql')
    expect(lifecycle).toContain("resolution='expired',resolved_at=now()")
    expect(lifecycle).toContain("interval '${interestLifetimeDays} days'")
    expect(migration).toContain("interval '14 days'")
    expect(migration).toContain("'withdrawn'")
    expect(capacity).toContain('old.resolved_at is null')
    expect(capacity).toContain('pending_count-1')
  })

  it('allows only the sender to withdraw a pending interest', () => {
    const endpoint = read('server/api/interests/[id]/withdraw.post.ts')
    expect(endpoint).toContain('id=$1 and sender_id=$2 and resolved_at is null')
    expect(endpoint).toContain("resolution='withdrawn'")
    expect(endpoint).toContain("kind='interest_received'")
  })

  it('removes resolved-interest alerts and restores one when a pass is undone', () => {
    const pass = read('server/api/interests/[id].delete.ts')
    const accept = read('server/repositories/matches.ts')
    const undo = read('server/api/interests/[id]/undo.post.ts')
    expect(pass).toContain("notification.kind='interest_received'")
    expect(accept).toContain("notification.kind='interest_received'")
    expect(undo).toContain("interest.resolution === 'withdrawn' || interest.resolution === 'passed'")
    expect(undo).toContain("'interest_received'")
  })

  it('keeps expiry silent and prevents delayed notification delivery', () => {
    const lifecycle = read('server/utils/interestLifecycle.ts')
    const outbox = read('server/services/outbox/OutboxProcessor.ts')
    expect(lifecycle).toContain('delete from notifications')
    expect(lifecycle).not.toContain('insert into notifications')
    expect(outbox).toContain('di.resolved_at is null')
    expect(outbox).toContain("interval '14 days'")
  })

  it('explains closed interests in human language in both histories', () => {
    const sent = read('pages/interests/sent.vue')
    const received = read('pages/interests/received.vue')
    expect(sent).toContain("return 'No response after 14 days'")
    expect(sent).toContain("return 'You took this back'")
    expect(sent).toContain('return `Waiting for ${interest.name}`')
    expect(received).toContain('Closed after 14 days')
    expect(received).toContain('took this back')
    expect(received).toContain('Expired or withdrawn interests')
    expect(received).toContain('These interests expired or were taken back.')
    expect(received).toContain('ProfileSafetyActions')
  })
})
