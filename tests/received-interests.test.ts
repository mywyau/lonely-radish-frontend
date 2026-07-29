import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('received interests', () => {
  it('shows persisted incoming interests without blocked profiles', () => {
    const api = read('server/api/interests/received.get.ts')
    expect(api).toContain('di.recipient_id=$1')
    expect(api).toContain('not exists(select 1 from blocks')
    expect(api).toContain('di.created_at<=ended.ended_at')
    expect(read('server/api/matches/index.get.ts')).toContain('di.created_at<=ended.ended_at')
    expect(read('pages/interests/received.vue')).toContain('Accept and match')
    expect(read('pages/interests/received.vue')).toContain('Pass')
  })
  it('allows the recipient to deliberately create a match', () => {
    const repository = read('server/repositories/matches.ts')
    const service = read('server/services/matches/MatchService.ts')
    expect(repository).toContain('di.recipient_id=$2')
    expect(repository).toContain('insert into matches')
    expect(service).toContain("'new_match'")
    expect(service).toContain('active match limit')
    expect(read('pages/interests/received.vue')).toContain('activeMatchLimit')
  })
})
