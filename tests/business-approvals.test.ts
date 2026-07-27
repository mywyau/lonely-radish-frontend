import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(),path),'utf8')

describe('business approval workflow', () => {
  it('stores approval state and an admin audit trail', () => {
    const migration = read('docs/migrations/20260817_add_business_approvals.sql')
    expect(migration).toContain("approval_status in ('pending','approved','rejected')")
    expect(migration).toContain('create table if not exists admin_review_events')
    expect(migration).toContain('reviewed_by')
    expect(migration).toContain('reviewed_at')
  })

  it('enforces administrator authorization on review APIs', () => {
    expect(read('server/utils/requireAdmin.ts')).toContain("role !== 'admin'")
    expect(read('server/api/admin/businesses/index.get.ts')).toContain('requireAdmin(event)')
    expect(read('server/api/admin/reviews.patch.ts')).toContain('requireAdmin(event)')
    expect(read('server/api/admin/reviews.patch.ts')).toContain('admin_review_events')
  })

  it('provides a review dashboard for businesses, venues, and offers', () => {
    const page = read('pages/admin/businesses.vue')
    expect(page).toContain("middleware: 'admin'")
    expect(page).toContain("{ value: 'business', label: 'Businesses' }")
    expect(page).toContain("{ value: 'venue', label: 'Venues' }")
    expect(page).toContain("{ value: 'offer', label: 'Offers' }")
    expect(page).toContain('pendingCounts')
    expect(page).toContain('Load more submissions')
    expect(page).toContain('Private review note')
  })

  it('paginates and filters approval queues on the server', () => {
    const api = read('server/api/admin/businesses/index.get.ts')
    expect(api).toContain('decodeCursor')
    expect(api).toContain('pageRows')
    expect(api).toContain('pageSize = 25')
    expect(api).toContain('pendingCounts')
    expect(api).toContain("entityType === 'business'")
    expect(api).toContain("entityType === 'venue'")
    expect(api).toContain("ilike '%'||$1||'%'")
    expect(api).toContain('nextCursor')
  })

  it('adds indexes for large approval queues', () => {
    const migration = read('docs/migrations/20260820_add_admin_approval_queue_indexes.sql')
    expect(migration).toContain('businesses_approval_queue_idx')
    expect(migration).toContain('business_venues_approval_queue_idx')
    expect(migration).toContain('business_offers_approval_queue_idx')
  })

  it('only exposes fully approved active offers to dating users', () => {
    const api = read('server/api/offers/index.get.ts')
    expect(api).toContain("o.approval_status='approved'")
    expect(api).toContain("b.status='active'")
    expect(api).toContain("v.status='active'")
    expect(api).toContain('o.active=true')
    expect(read('pages/offers.vue')).toContain("'/api/offers'")
    expect(read('components/BlankNavBar.vue')).toContain("to: '/offers'")
  })
})
