<script setup lang="ts">
definePageMeta({
  // middleware: ['topic-access'],
  ssr: true,
})

import { CircleCheck, Eye, EyeOff, Library } from '@lucide/vue'
import WordTile from '@/components/WordTile.vue'
import { masteryXp } from '@/config/xp/helpers'
import { createError } from 'nuxt/app'
import { FREE_WORD_LIMIT } from '~/config/topic/topics-config'
import { tileColours } from '~/utils/branding/helpers'
import { canAccessTopic, freeTopics } from '~/utils/topics/permissions'

const route = useRoute()
const slug = route.params.topic as string

const {
  isLoggedIn,
  entitlement,
} = useMeStateV2()

const { data: topic, error } = await useFetch(
  `/api/index/topics/${slug}`,
  {
    server: true,
  }
)

const unlockMap = ref<Record<string, true>>({})

const unlockSummary = ref({
  totalXp: 0,
  creditsEarned: 0,
  creditsSpent: 0,
  creditsAvailable: 0,
})

if (error.value?.statusCode === 403) {
  throw createError({ statusCode: 403, statusMessage: 'Topic locked' })
}

if (!topic.value) {
  throw createError({ statusCode: 404, statusMessage: 'Topic not found' })
}

const isTopicFree = computed(() => {
  return freeTopics.has(slug)
})

const categories = computed(() =>
  Object.entries(topic.value.categories).map(([key, words]) => ({
    key,
    title: key.replace(/_/g, ' '),
    words,
  }))
)

const allTopicWords = computed(() => {
  return Object.values(topic.value.categories).flat() as Array<{ id: string }>
})

const accessibleWordCount = computed(() => {
  return gatedCategories.value.reduce((count, category) => {
    return count + category.words.filter((word) => !word.locked).length
  }, 0)
})

const totalWords = computed(() => {
  return allTopicWords.value.length
})

// const unlockedWordCount = computed(() => {
//   return allTopicWords.value.reduce((count, word) => {
//     return count + (unlockMap.value[word.id] ? 1 : 0)
//   }, 0)
// })

const lockedWordCount = computed(() => {
  return gatedCategories.value.reduce((count, category) => {
    return count + category.words.filter((word) => word.locked).length
  }, 0)
})


const progressMap = ref<Record<string, { xp: number; streak: number }>>({})

async function loadProgress() {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const wordIds = Object.values(topic.value.categories)
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

async function loadUnlocks() {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const wordIds = Object.values(topic.value.categories)
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

const getXp = (id: string) =>
  progressMap.value?.[id]?.xp ?? 0

const isMastered = (id: string) =>
  (progressMap.value?.[id]?.xp ?? 0) >= masteryXp

const hasPaidAccess = computed(() => {
  return canAccessTopic(isLoggedIn.value, entitlement.value, topic.value.id)
})

function getColorFromId(id: string) {
  let hash = 0

  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash)
  }

  const index = Math.abs(hash) % tileColours.length
  return tileColours[index]
}

const gatedCategories = computed(() => {
  let globalIndex = 0

  return categories.value.map(category => {
    return {
      ...category,
      words: category.words.map((word: any) => {
        const paywallLocked =
          !isTopicFree.value &&
          !hasPaidAccess.value &&
          globalIndex >= FREE_WORD_LIMIT

        const unlockedByUser = !!unlockMap.value[word.id]
        const locked = paywallLocked && !unlockedByUser
        const tileAnimationDelay = `${Math.min(globalIndex * 45, 900)}ms`
        globalIndex++

        return {
          ...word,
          paywallLocked,
          unlockedByUser,
          locked,
          tileColor: getColorFromId(word.id),
          tileAnimationDelay,
        }
      })
    }
  })
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
  <main class="topic-page max-w-4xl mx-auto px-4 py-10 sm:py-12 space-y-10">

    <!-- <BackLink to="/topics" /> -->

    <header class="rounded-lg header-card">
      <h1 class="topic-heading">{{ topic.title }}</h1>
      <p class="topic-subheading mt-2">{{ topic.description }}</p>
    </header>

    <a
      href="#"
      class="mobile-stats-toggle"
      :aria-label="isMobileStatsExpanded ? 'Hide stats' : 'Show stats'"
      @click.prevent="isMobileStatsExpanded = !isMobileStatsExpanded"
    >
      <EyeOff v-if="isMobileStatsExpanded" class="h-4 w-4" aria-hidden="true" />
      <Eye v-else class="h-4 w-4" aria-hidden="true" />
      <span>{{ isMobileStatsExpanded ? 'Hide stats' : 'Show stats' }}</span>
    </a>

    <section class="stats-grid" :class="{ 'stats-grid-collapsed': !isMobileStatsExpanded }">
      <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        <div class="stat-card page-card rounded-xl stat-0">
          <p class="stat-label">Total words</p>
          <p class="stat-value stat-value-with-icon font-bold">
            <Library class="h-4 w-4" aria-hidden="true" />
            {{ totalWords }}
          </p>
        </div>

        <div class="stat-card page-card rounded-xl stat-1">
          <p class="stat-label">Accessible words</p>
          <p class="stat-value stat-value-with-icon font-bold">
            <CircleCheck class="h-4 w-4" aria-hidden="true" />
            {{ accessibleWordCount }}
          </p>
        </div>

        <div v-if="!hasPaidAccess && !isTopicFree" class="stat-card page-card rounded-xl stat-2">
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
        <div
          v-for="word in category.words"
          :key="word.id"
          :id="word.id"
          class="tile-shell word-tile-fall-shell"
          :style="{ '--tile-fall-delay': word.tileAnimationDelay }"
        >
          <WordTile :id="word.id" :to="word.locked
            ? `/topic/${slug}/unlock/${word.id}`
            : `/topic/word/${slug}/${word.id}`" :word="word.word" :jyutping="word.jyutping" :meaning="word.meaning"
            :xp="getXp(word.id)" :mastered="isMastered(word.id)" :class="word.locked ? 'locked-tile' : ''"
            :style="{ background: word.tileColor }" />
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.topic-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;

  padding-bottom: 2rem;
}

.topic-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.topic-subheading {
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

.word-tile-fall-shell {
  --tile-fall-delay: 0ms;
  animation: word-tile-fall-in 0.72s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--tile-fall-delay);
  transform-origin: 50% -24px;
  will-change: transform, opacity;
}

@keyframes word-tile-fall-in {
  0% {
    opacity: 0;
    transform: translate3d(0, -42px, 0) rotate(-3deg) scale(0.98);
  }

  64% {
    opacity: 1;
    transform: translate3d(0, 8px, 0) rotate(1.2deg) scale(1.01);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .word-tile-fall-shell {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

.unlock-summary {
  font-size: 1rem;
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
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
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
