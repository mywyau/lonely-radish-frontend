export type DiscoveryCategory = {
  name: string
  databaseCategories: string[]
  customOnly?: boolean
}

export const discoveryCategories: Record<string, DiscoveryCategory> = {
  'food-drink': { name: 'Food & drink', databaseCategories: ['Food and drink'] },
  'your-ideas': { name: 'Your ideas', databaseCategories: [], customOnly: true },
  culture: { name: 'Culture', databaseCategories: ['Culture'] },
  sports: { name: 'Sports', databaseCategories: ['Sports'] },
  outdoors: { name: 'Outdoors', databaseCategories: ['Outdoors'] },
  games: { name: 'Games', databaseCategories: ['Gaming'] },
  'learn-create': { name: 'Learn & create', databaseCategories: ['Learning'] },
  wellness: { name: 'Wellness', databaseCategories: ['Wellness'] },
  nightlife: { name: 'Nightlife', databaseCategories: ['Nightlife'] },
  explore: { name: 'Explore', databaseCategories: ['Explore'] },
  community: { name: 'Community', databaseCategories: ['Community'] },
}

const legacyCategorySlugs: Record<string, string> = {
  casual: 'food-drink',
  'gallery-wander': 'culture', 'live-music-set': 'culture',
  'market-loop': 'food-drink', 'casual-food-crawl': 'food-drink',
  'riverside-walk': 'outdoors', 'cycle-and-stop': 'outdoors',
  'park-tennis-rally': 'sports', 'climbing-taster': 'sports',
  'co-op-game-session': 'games', 'puzzle-room-online': 'games', 'watch-and-play-lobby': 'games',
  'weekend-pop-up': 'learn-create',
}

export function discoveryCategory(slug: string) {
  return discoveryCategories[legacyCategorySlugs[slug] || slug]
}

export function discoveryCategorySlug(slug: string) {
  const canonicalSlug = legacyCategorySlugs[slug] || slug
  return discoveryCategories[canonicalSlug] ? canonicalSlug : null
}
