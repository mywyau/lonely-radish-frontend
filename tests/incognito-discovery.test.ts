import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('incognito discovery', () => {
  it('stores a separate, indexed discovery mode without changing account lifecycle state', () => {
    const migration = read('docs/migrations/20260914_add_incognito_discovery.sql')
    expect(migration).toContain("discovery_mode text not null default 'standard'")
    expect(migration).toContain("discovery_mode in ('standard','incognito')")
    expect(migration).toContain('daily_interests_active_recipient_sender_idx')
    expect(migration).toContain('on daily_interests(recipient_id,sender_id)')
    expect(migration).toContain('where resolved_at is null')
    expect(migration).not.toContain('account_status=')
  })

  it('keeps incognito candidates out of discovery unless they currently chose the viewer', () => {
    const policy = read('server/utils/profileVisibility.ts')
    const discovery = read('server/api/activities/[slug]/people.get.ts')
    expect(policy).toContain("coalesce(u.discovery_mode,'standard')='standard'")
    expect(policy).toContain('visibility_interest.sender_id=p.user_id')
    expect(policy).toContain('visibility_interest.recipient_id=$2')
    expect(policy).toContain('visibility_interest.resolved_at is null')
    expect(discovery).toContain('candidateDiscoveryVisibilityWhere')
    expect(discovery.indexOf('candidateDiscoveryVisibilityWhere')).toBeLessThan(discovery.indexOf('order by p.updated_at'))
  })

  it('prevents a guessed slug or interest submission from bypassing incognito', () => {
    const policy = read('server/utils/profileVisibility.ts')
    expect(read('server/api/profiles/[slug].get.ts')).toContain('directProfileVisibilityWhere')
    expect(read('server/repositories/interests.ts')).toContain('directProfileVisibilityWhere')
    expect(policy).toContain('exists(select 1 from matches visibility_match')
    expect(policy).toContain('exists(select 1 from daily_interests visibility_interest')
    expect(read('server/api/profiles/[slug].get.ts')).toContain("statusCode: 404")
  })

  it('retains report and block access for legitimate interest or match history', () => {
    expect(read('server/api/profiles/[slug]/block.post.ts')).toContain('directProfileVisibilityWhere')
    expect(read('server/api/profiles/[slug]/report.post.ts')).toContain('directProfileVisibilityWhere')
    const directPolicy = read('server/utils/profileVisibility.ts').split('export const directProfileVisibilityWhere')[1]
    expect(directPolicy).toContain('visibility_interest.recipient_id=$2)')
    expect(directPolicy).not.toContain('visibility_interest.resolved_at is null')
    expect(read('server/api/profiles/[slug].get.ts')).toContain('not exists(select 1 from blocks')
  })

  it('offers the privacy control to every personal member and distinguishes it from pausing', () => {
    const getEndpoint = read('server/api/account/discovery-mode.get.ts')
    const putEndpoint = read('server/api/account/discovery-mode.put.ts')
    const controls = read('pages/account/controls.vue')
    expect(getEndpoint).toContain('requirePersonalUser(event)')
    expect(putEndpoint).toContain("new Set(['standard', 'incognito'])")
    expect(putEndpoint).not.toContain('entitlement')
    expect(controls).toContain('Only people I choose')
    expect(controls).toContain("updateDiscoveryMode('incognito')")
    expect(controls).toContain('This privacy option is available to everyone')
    expect(controls).toContain('Existing interests, matches and plans keep working')
    expect(controls).toContain('Take a break')
  })
})
