import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('styles across full loads and client navigation', () => {
  it('ships versioned CSS assets instead of embedding the whole app stylesheet in HTML', () => {
    const config = read('nuxt.config.ts')
    expect(config).toContain('inlineStyles: false')
    expect(config).not.toContain('cssCodeSplit: false')
  })

  it('keeps profile activity panel styles owned by the component', () => {
    const panel = read('components/ProfileActivityPanel.vue')
    expect(panel).toContain('.profile-flip-card {')
    expect(read('pages/profiles/[slug].vue')).not.toContain('.profile-flip-card {')
    expect(read('pages/profile/preview.vue')).not.toContain('.profile-flip-card {')
  })

  it('updates activity filters immediately and then synchronises the URL', () => {
    const activities = read('pages/activities/index.vue')
    const localUpdate = activities.indexOf('selectedCategories.value = next')
    const routeUpdate = activities.indexOf('await router.replace')
    expect(localUpdate).toBeGreaterThan(-1)
    expect(routeUpdate).toBeGreaterThan(localUpdate)
    expect(activities).toContain('watch(selectedCategories, () => { void loadCandidates() })')
    expect(activities).not.toContain('class="filter-chip"')
  })
})
