import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), 'utf8')
}

describe('queued match promotion', () => {
  it('promotes the oldest eligible queued match when a match frees space', () => {
    const promotion = read('server/utils/promoteQueuedMatch.ts')
    const removal = read('server/api/matches/[id].delete.ts')
    const followUp = read('server/api/dates/[id]/follow-up.post.ts')
    const blocking = read('server/utils/blockUser.ts')
    const navigation = read('components/BlankNavBar.vue')

    expect(promotion).toContain("where status='queued'")
    expect(promotion).toContain('order by matched_at asc,id asc for update')
    expect(promotion).toContain('activateMatchOrQueue')
    expect(promotion).toContain("kind='match_queued'")
    expect(promotion).toContain("'new_match'")
    expect(removal).toContain('[sub, match.recipientId].sort()')
    expect(removal).toContain('promoteOldestEligibleQueuedMatch(client, freedUserId)')
    expect(followUp).toContain('closedMatch.rows[0].userOneId')
    expect(followUp).toContain('promoteOldestEligibleQueuedMatch(client, freedUserId)')
    expect(blocking).toContain('[blockerId,blockedId].sort()')
    expect(blocking).toContain('promoteOldestEligibleQueuedMatch(client, freedUserId)')
    expect(navigation).toContain('including any waiting for space')
  })
})
