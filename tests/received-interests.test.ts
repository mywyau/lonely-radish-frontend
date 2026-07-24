import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('received interests', () => {
  it('shows persisted incoming interests without blocked profiles', () => {
    const api = read('server/api/interests/received.get.ts')
    expect(api).toContain('di.recipient_id=$1')
    expect(api).toContain('not exists(select 1 from blocks')
    expect(read('pages/interests/received.vue')).toContain('Accept and match')
  })
  it('allows the recipient to deliberately create a match', () => {
    const api = read('server/api/interests/[id]/accept.post.ts')
    expect(api).toContain('di.recipient_id=$2')
    expect(api).toContain('insert into matches')
    expect(api).toContain("'new_match'")
    expect(api).toContain('active match limit')
    expect(read('pages/interests/received.vue')).toContain('activeMatchLimit')
  })
})
