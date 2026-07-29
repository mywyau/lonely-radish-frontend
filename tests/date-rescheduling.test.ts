import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('explicit date rescheduling and cancellation', () => {
  it('keeps the confirmed proposal while a linked replacement is reviewed', () => {
    const migration = read('docs/migrations/20260828_explicit_date_rescheduling.sql')
    const action = read('server/api/proposals/[id]/attendance.post.ts')

    expect(migration).toContain('replaces_proposal_id')
    expect(migration).toContain('date_proposals_active_replacement_idx')
    expect(action).toContain('replaces_proposal_id')
    expect(action).toContain("'draft',id")
    expect(action).not.toContain('insert into proposal_times')
    expect(action).not.toContain("set status='draft',inviter_id")
  })

  it('announces the reschedule only after the replacement is sent', () => {
    const send = read('server/api/proposals/[id]/send.post.ts')
    expect(send).toContain('replacesProposalId')
    expect(send).toContain("'date_reschedule_requested'")
  })

  it('retires the original date only when its replacement is accepted', () => {
    const respond = read('server/api/proposals/[id]/respond.post.ts')
    expect(respond).toContain("status === 'accepted' && proposal.replacesProposalId")
    expect(respond).toContain("where id=$1 and status='accepted'")
    expect(respond).toContain('begin')
    expect(respond).toContain('commit')
  })

  it('shows distinct confirmed, rescheduling, and cancellation states', () => {
    const planning = read('pages/plans/[slug].vue')
    const matches = read('pages/matches/index.vue')

    expect(planning).toContain('Current date — still confirmed')
    expect(planning).toContain('Propose a different date')
    expect(planning).toContain('Yes, cancel date')
    expect(planning).toContain('does not silently change it')
    expect(matches).toContain('Reschedule sent — current date stays confirmed')
    expect(matches).toContain('Date cancelled — ready to plan again')
  })

  it('does not allow the generic edit endpoint to mutate confirmed dates', () => {
    const update = read('server/api/proposals/[id].put.ts')
    expect(update).toContain("status in ('draft','pending')")
    expect(update).not.toContain("status in ('draft','pending','accepted')")
  })

  it('can discard a private replacement without changing the confirmed plan', () => {
    const discard = read('server/api/proposals/[id]/discard.post.ts')
    const planning = read('pages/plans/[slug].vue')
    expect(discard).toContain("replacement.status='draft'")
    expect(discard).toContain("current.status='accepted'")
    expect(discard).not.toContain('insert into notifications')
    expect(planning).toContain('Keep current date and discard draft')
  })

  it('falls back to the confirmed plan after a replacement is declined', () => {
    const matches = read('server/api/matches/index.get.ts')
    expect(matches).toContain("order by (dp.status in ('draft','pending','accepted')) desc")
  })
})
