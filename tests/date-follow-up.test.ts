import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('private post-date follow-up', () => {
  it('reveals each answer once both people have responded', () => {
    const get = read('server/api/dates/[id]/follow-up.get.ts')
    expect(get).toContain('theirChoice: bothResponded ? date.theirChoice : null')
    expect(get).toContain('theirMessage: bothResponded ? date.theirMessage : null')
    expect(get).toContain('const closed = bothResponded && !mutual')
    expect(read('pages/dates/[id]/follow-up.vue')).toContain('’s choice')
  })

  it('allows a respectful note with either answer', () => {
    expect(read('server/api/dates/[id]/follow-up.post.ts')).toContain("text(body.message, 'Message', 240)")
    const page = read('pages/dates/[id]/follow-up.vue')
    expect(page).toContain('Your note can accompany either choice')
    expect(page).toContain('Thank you for meeting me. I wish you all the best')
  })

  it('closes a rejected connection without identifying who declined', () => {
    const post = read('server/api/dates/[id]/follow-up.post.ts')
    expect(post).toContain("set status='unmatched'")
    expect(post).toContain('bool_and(meet_again) as mutual')
    expect(post).toContain('for update of dp')
    expect(post).toContain("'date_follow_up_closed'")
    expect(read('pages/dates/[id]/follow-up.vue')).toContain('You didn’t both choose another date.')
  })

  it('explains a one-time no-to-yes change before it reopens the connection', () => {
    const reconsider = read('server/api/dates/[id]/follow-up/reconsider.post.ts')
    expect(reconsider).toContain('mine.meet_again=false')
    expect(reconsider).toContain('theirs.meet_again=true')
    expect(reconsider).toContain("'date_follow_up_changed'")
    const page = read('pages/dates/[id]/follow-up.vue')
    expect(page).toContain('doing so reopens the connection and sends them your note')
    expect(page).toContain('Change my answer to yes')
  })

  it('explains what each private choice will do before submission', () => {
    const page = read('pages/dates/[id]/follow-up.vue')
    expect(page).toContain('The connection stays open only if you both choose another date.')
    expect(page).toContain('If {{ date.personName }} also chooses yes')
    expect(page).toContain('the connection will close')
    expect(page).toContain('Save my choice')
  })

  it('offers a development-only completed date preview', () => {
    expect(read('pages/matches/index.vue')).toContain("proposalId: 'preview-nina'")
    const page = read('pages/dates/[id]/follow-up.vue')
    expect(page).toContain("route.params.id === 'preview-nina'")
    expect(page).toContain('Local preview · Your answer is not saved to the database.')
  })
})
