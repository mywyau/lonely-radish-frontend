import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('protection against accidental final decisions', () => {
  it('lets either participant restore a just-passed or just-withdrawn interest', () => {
    const undo = read('server/api/interests/[id]/undo.post.ts')
    expect(read('server/utils/undoWindow.ts')).toContain('undoWindowSeconds = 30')
    expect(undo).toContain("recipient_id=$2 and resolution='passed'")
    expect(undo).toContain("sender_id=$2 and resolution='withdrawn'")
    expect(undo).toContain('for update')
    expect(undo).toContain('set declined_at=null,resolution=null,resolved_at=null')
    expect(undo).toContain("'interest_received'")
    expect(undo).not.toContain('interest_inbox_capacity')
    expect(undo).toContain('not exists(select 1 from blocks')
    expect(undo).not.toContain("resolution='expired'")
  })

  it('returns the authoritative undo deadline with both interest decisions', () => {
    expect(read('server/api/interests/[id].delete.ts')).toContain('undoUntil')
    expect(read('server/api/interests/[id]/withdraw.post.ts')).toContain('undoUntil')
    expect(read('pages/interests/received.vue')).toContain('undoDecline(action)')
    expect(read('pages/interests/received.vue')).toContain('/undo`')
    expect(read('pages/interests/sent.vue')).toContain('undoWithdrawal(action)')
    expect(read('pages/interests/sent.vue')).toContain('/undo`')
  })

  it('delays destructive connection and post-date decisions before committing them', () => {
    const matches = read('pages/matches/index.vue')
    expect(matches).toContain('closeUndoWindowMs = 10_000')
    expect(matches).toContain('setTimeout(() => { void commitPendingClosure() }')
    expect(matches).toContain('undoPendingClosure')
    expect(matches).toContain('After confirming, you’ll have 10 seconds to undo.')

    const followUp = read('pages/dates/[id]/follow-up.vue')
    expect(followUp).toContain('noChoiceUndoWindowMs = 10_000')
    expect(followUp).toContain('setTimeout(() => { void commitNoChoice() }')
    expect(followUp).toContain('undoNoChoice')
    expect(followUp).toContain('After you save, you’ll have 10 seconds to undo.')
  })

  it('keeps expiry automatic and safety actions immediate', () => {
    expect(read('pages/interests/sent.vue')).toContain('Closes {{ new Date(interest.expiresAt)')
    expect(read('components/ProfileSafetyActions.vue')).not.toContain('UndoActionNotice')
    expect(read('server/api/profiles/[slug]/block.post.ts')).not.toContain('undoUntil')
    expect(read('server/api/profiles/[slug]/report.post.ts')).not.toContain('undoUntil')
  })
})
