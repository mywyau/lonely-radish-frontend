export type DiscoveryCategory = {
  name: string
  databaseCategories: string[]
}

export const discoveryCategories: Record<string, DiscoveryCategory> = {
  casual: { name: 'Casual', databaseCategories: ['Food and drink'] },
  culture: { name: 'Culture', databaseCategories: ['Culture'] },
  sports: { name: 'Sports', databaseCategories: ['Sports'] },
  outdoors: { name: 'Outdoors', databaseCategories: ['Outdoors'] },
  games: { name: 'Games', databaseCategories: ['Gaming'] },
  'learn-create': { name: 'Learn & create', databaseCategories: ['Learning'] },
}

const legacyCategorySlugs: Record<string, string> = {
  'gallery-wander': 'culture', 'live-music-set': 'culture',
  'market-loop': 'casual', 'casual-food-crawl': 'casual',
  'riverside-walk': 'outdoors', 'cycle-and-stop': 'outdoors',
  'park-tennis-rally': 'sports', 'climbing-taster': 'sports',
  'co-op-game-session': 'games', 'puzzle-room-online': 'games', 'watch-and-play-lobby': 'games',
  'weekend-pop-up': 'learn-create',
}

export function discoveryCategory(slug: string) {
  return discoveryCategories[legacyCategorySlugs[slug] || slug]
}
