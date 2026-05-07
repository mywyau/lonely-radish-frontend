<script setup lang="ts">

definePageMeta({
  // middleware: ['level-access'],
  ssr: true,
})

import WordTile from '@/components/WordTile.vue'
import { masteryXp } from '@/config/xp/helpers'
import { createError } from 'nuxt/app'
import { useRoute } from 'vue-router'
import { FREE_LEVEL_WORD_LIMIT } from '~/config/level/levels-config'
import { tileColours } from '~/utils/branding/helpers'
import { isLevelId, levelIdToNumbers } from '~/utils/levels/levels'
import { canAccessLevel, isFreeLevel } from '~/utils/levels/permissions'

const route = useRoute()
const slug = route.params.slug as string

// we check the path slug
if (!isLevelId(slug)) {
  throw createError({ statusCode: 404 })
}

const levelNumber: number = levelIdToNumbers(slug)

const {
  isLoggedIn,
  entitlement,
} = useMeStateV2()

// SSR-safe fetch (no gating, no nulls)
const { data: levelCdnData, error } = await useFetch(
  `/api/index/levels/${slug}`,
  {
    server: true,
    // credentials: 'include', // 👈 cookies
  }
)

const unlockMap = ref<Record<string, true>>({})

const unlockSummary = ref({
  totalXp: 0,
  creditsEarned: 0,
  creditsSpent: 0,
  creditsAvailable: 0,
})

async function loadUnlocks() {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const wordIds = Object.values(levelCdnData.value.categories)
      .flat()
      .map((w: any) => w.id)

    if (!wordIds.length) return

    const result = await $fetch<{
      totalXp: number
      creditsEarned: number
      creditsSpent: number
      creditsAvailable: number
      unlockedWordIds: string[]
    }>('/api/word-unlocks', {
      query: { wordIds: wordIds.join(',') },
      headers: { Authorization: `Bearer ${token}` }
    })

    unlockSummary.value = {
      totalXp: result.totalXp,
      creditsEarned: result.creditsEarned,
      creditsSpent: result.creditsSpent,
      creditsAvailable: result.creditsAvailable,
    }

    unlockMap.value = Object.fromEntries(
      result.unlockedWordIds.map((id) => [id, true as const])
    )
  } catch {
    unlockMap.value = {}
    unlockSummary.value = {
      totalXp: 0,
      creditsEarned: 0,
      creditsSpent: 0,
      creditsAvailable: 0,
    }
  }
}

// Handle backend responses
if (error.value?.statusCode === 403) {
  throw createError({ statusCode: 403, statusMessage: 'Level locked' })
}

if (!levelCdnData.value) {
  throw createError({ statusCode: 404, statusMessage: 'Level not found' })
}

const categories = computed(() =>
  Object.entries(levelCdnData.value.categories).map(([key, words]) => ({
    key,
    title: key.replace(/_/g, ' '),
    words,
  }))
)

const progressMap = ref<Record<string, { xp: number; streak: number }>>({})

async function loadProgress() {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const wordIds = Object.values(levelCdnData.value.categories)
      .flat()
      .map((w: any) => w.id)

    if (!wordIds.length) return

    const result = await $fetch<
      Record<string, { xp: number; streak: number }>
    >('/api/word-progress', {
      query: { wordIds: wordIds.join(',') },
      headers: { Authorization: `Bearer ${token}` }
    })

    progressMap.value = result
  } catch {
    progressMap.value = {}
  }
}

const getXp = (id: string) =>
  progressMap.value?.[id]?.xp ?? 0

const isMastered = (id: string) =>
  (progressMap.value?.[id]?.xp ?? 0) >= masteryXp

function getColorFromId(id: string) {
  let hash = 0

  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % tileColours.length
  return tileColours[index]
}

const hasPaidAccess = computed(() => {
  return canAccessLevel(isLoggedIn.value, entitlement.value)
})

const gatedCategories = computed(() => {
  let globalIndex = 0

  return categories.value.map(category => {
    return {
      ...category,
      words: category.words.map((word: any) => {
        const paywallLocked =
          !isFreeLevel(levelNumber) &&
          !hasPaidAccess.value &&
          globalIndex >= FREE_LEVEL_WORD_LIMIT

        const unlockedByUser = !!unlockMap.value[word.id]
        const locked = paywallLocked && !unlockedByUser

        globalIndex++

        return {
          ...word,
          paywallLocked,
          unlockedByUser,
          locked,
          tileColor: getColorFromId(word.id)
        }
      })
    }
  })
})

const allLevelWords = computed(() => {
  return Object.values(levelCdnData.value.categories).flat() as Array<{ id: string }>
})

const totalWords = computed(() => {
  return allLevelWords.value.length
})

const accessibleWordCount = computed(() => {
  return gatedCategories.value.reduce((count, category) => {
    return count + category.words.filter((word) => !word.locked).length
  }, 0)
})

const lockedWordCount = computed(() => {
  return gatedCategories.value.reduce((count, category) => {
    return count + category.words.filter((word) => word.locked).length
  }, 0)
})

const isMobileStatsExpanded = ref(true)

onMounted(async () => {
  isMobileStatsExpanded.value = !window.matchMedia('(max-width: 767px)').matches

  await Promise.all([
    loadProgress(),
    loadUnlocks(),
  ])
})

</script>

<template>
  <main class="level-page max-w-4xl mx-auto px-4 py-10 sm:py-12 space-y-10">

    <BackLink to="/levels" />

    <header class="rounded-lg header-card">
      <h1 class="level-heading">{{ levelCdnData.title }}</h1>
      <p class="level-subheading mt-2">{{ levelCdnData.description }}</p>
    </header>

    <a href="#" class="mobile-stats-toggle" @click.prevent="isMobileStatsExpanded = !isMobileStatsExpanded">
      {{ isMobileStatsExpanded ? 'Hide stats' : 'Show stats' }}
    </a>

    <section class="stats-grid" :class="{ 'stats-grid-collapsed': !isMobileStatsExpanded }">

      <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">

        <div class="stat-card page-card rounded-xl stat-0">
          <p class="stat-label">Total words</p>
          <p class="stat-value font-bold">{{ totalWords }}</p>
        </div>

        <div class="stat-card page-card rounded-xl stat-1">
          <p class="stat-label">Accessible words</p>
          <p class="stat-value font-bold">{{ accessibleWordCount }}</p>
        </div>

        <div v-if="!hasPaidAccess" class="stat-card page-card rounded-xl stat-2">
          <p class="stat-label">TaroKeys</p>
          <p class="stat-value stat-value-with-icon font-bold">
            <TaroKeyIcon size="h-4 w-4" />
            {{ unlockSummary.creditsAvailable }}
          </p>
        </div>

        <div class="stat-card page-card rounded-xl stat-3">
          <p class="stat-label">Locked words</p>
          <p class="stat-value stat-value-with-icon font-bold">
            <TaroLockIcon size="h-4 w-4" />
            {{ lockedWordCount }}
          </p>
        </div>
      </div>
    </section>
    <section v-for="category in gatedCategories" :key="category.key" class="space-y-6">

      <div class="flex items-baseline justify-between gap-4">
        <h2 class="category-heading">
          {{ category.title }}
        </h2>
      </div>

      <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div v-for="word in category.words" :key="word.id" :id="word.id" class="tile-shell">
          <WordTile :id="word.id" :to="word.locked
            ? `/level/${slug}/unlock/${word.id}`
            : `/level/${slug}/word/${word.id}`" :word="word.word" :jyutping="word.jyutping" :meaning="word.meaning"
            :xp="getXp(word.id)" :mastered="isMastered(word.id)" :class="word.locked ? 'locked-tile' : ''"
            :style="{ background: word.tileColor }" />
        </div>
      </div>

    </section>

  </main>
</template>

<style scoped>
.level-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;

  padding-bottom: 2rem;
}

.level-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.level-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.category-heading {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.header-card {
  backdrop-filter: blur(6px);
}

.category-card {
  backdrop-filter: blur(6px);
}

.category-card:hover {
  border-color: rgba(214, 163, 209, 0.55);
}


.tile-shell {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.locked-tile {
  opacity: 0.38;
  user-select: none;
  filter: grayscale(0.15);
}

.unlock-row {
  display: flex;
  justify-content: center;
}

.unlock-button {
  border: 0;
  border-radius: 100px;
  padding: 0.55rem 0.85rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(255, 255, 255, 0.92);
  color: #111827;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
}

.unlock-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.unlock-summary {
  font-size: 1.0rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.75);
}

.page-card {
  backdrop-filter: blur(6px);
  background: rgba(255, 255, 255, 0.58);
  padding: 1.1rem;
}

.stats-grid {
  display: block;
}

.mobile-stats-toggle {
  display: inline-block;
  font-size: 0.78rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(17, 24, 39, 0.85);
  text-decoration: none;
}

.mobile-stats-toggle:hover {
  text-decoration: underline;
}

.stat-card {
  text-align: center;
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(17, 24, 39, 0.62);
}

.stat-value {
  margin-top: 0.45rem;
  font-size: 1.05rem;
  color: rgba(0, 0, 0);
}

.stat-value-with-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.stat-0 {
  background: rgba(234, 184, 228, 0.45);
}

.stat-1 {
  background: rgba(88, 199, 95, 0.45);
}

.stat-2 {
  background: rgba(244, 205, 39, 0.35);
}

.stat-3 {
  background: rgba(111, 92, 202, 0.35);
}

.stats-grid-collapsed {
  display: none;
}
</style>
