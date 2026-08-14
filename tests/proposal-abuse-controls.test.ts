import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('date proposal abuse controls', () => {
  const createProposal = read('server/api/proposals/index.post.ts')
  const sendProposal = read('server/api/proposals/[id]/send.post.ts')
  const updateProposal = read('server/api/proposals/[id].put.ts')
  const migration = read('docs/migrations/20260916_harden_date_proposal_spam.sql')

  it('rate limits every proposal write path that can be used for spam', () => {
    expect(createProposal).toContain('enforceRateLimit(`rl:proposal-create:${sub}`, 20, 60 * 60)')
    expect(sendProposal).toContain('enforceRateLimit(`rl:proposal-send:${sub}`, 10, 60 * 60)')
    expect(updateProposal).toContain('enforceRateLimit(`rl:proposal-update:${sub}`, 20, 60 * 60)')
  })

  it('does not let an invitee publish or edit an unsent draft', () => {
    expect(updateProposal).toContain('if (!senderEditingDraft && !recipientSuggestingChange)')
    expect(updateProposal).toContain("statusCode: 404, statusMessage: 'Date proposal not found'")
  })

  it('enforces one pending proposal per match at the concurrency-safe database layer', () => {
    expect(migration).toContain('date_proposals_one_pending_per_match_idx')
    expect(migration).toMatch(/on date_proposals\(match_id\)[\s\S]*where status='pending'/)
    expect(migration).toContain('using cancelled_pending cancelled')
    expect(sendProposal).toContain("databaseError.code === '23505'")
    expect(sendProposal).toContain("databaseError.constraint === 'date_proposals_one_pending_per_match_idx'")
  })

  it('deduplicates proposal notifications without retriggering email delivery', () => {
    expect(migration).toContain('notifications_proposal_action_once_idx')
    for (const endpoint of [sendProposal, updateProposal]) {
      expect(endpoint).toContain('on conflict(recipient_id,proposal_id,kind)')
      expect(endpoint).toContain('do update set actor_id=excluded.actor_id')
    }
    expect(updateProposal).toContain('set read_at=coalesce(read_at,now())')
    expect(updateProposal).not.toContain('delete from notifications')
  })
})
