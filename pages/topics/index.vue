<script setup lang="ts">
useSeoMeta({
  title: 'Cantonese Topics',
  description: 'Browse Cantonese vocabulary and sentence topics grouped by everyday themes.',
  ogTitle: 'Cantonese Topics | TaroTea',
  ogDescription: 'Explore themed Cantonese topic lists with vocabulary and sentence practice.',
})

import type { Topic } from '@/types/topic'
import { brandColours } from '@/utils/branding/helpers'
import { sortedTopics } from '@/utils/topics/topics'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/vue'
import { getTopicIcon } from '@/utils/topics/icons'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const {
  authReady,
  isLoggedIn,
  entitlement,
  resolve,
} = useMeStateV2()


function doNotShowUpgradeMessage(topic: Topic) {

  if (!topic.requiresPaid) return true
  if (!isLoggedIn.value) return false

  const doesNotHaveFreePlan =
    entitlement.value?.plan !== "free" &&
    (
      entitlement.value?.subscription_status === "active" ||
      entitlement.value?.subscription_status === "trialing" ||
      entitlement.value?.subscription_status === "past_due"
    )

  return doesNotHaveFreePlan
}

function topicLink(topic: Topic) {
  if (topic.comingSoon) return "/coming-soon"

  if (!topic.requiresPaid) {
    return `/topic/words/${topic.id}/v2`
  }
}


function getTopicColor(topic: Topic, index: number) {
  if (topic.comingSoon) return 'rgba(246, 225, 225, 0.35)'

  const seed = `${topic.id}-${index}`
  let hash = 0

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }

  return brandColours[hash % brandColours.length]
}

const ITEMS_PER_PAGE = 12
const currentPage = ref(1)
const topicAnimationStyles = ref<Record<string, Record<string, string>>>({})
const isTopicAnimationReady = ref(false)
const isMobileViewport = ref(false)
let mobileViewportQuery: MediaQueryList | undefined

function syncMobileViewport() {
  isMobileViewport.value = mobileViewportQuery?.matches ?? false
}

function generateTopicAnimationStyles() {
  const nextStyles: Record<string, Record<string, string>> = {}
  const mobile = isMobileViewport.value

  paginatedTopics.value.forEach((topic, index) => {
    const row = Math.floor(index / (mobile ? 2 : 3))
    const column = index % (mobile ? 2 : 3)
    const delay = mobile ? index * 35 : index * 55
    const duration = mobile ? 420 : 560
    const startX = mobile ? (column === 0 ? -14 : 14) : (column - 1) * 34
    const startY = mobile ? 18 + row * 3 : 28 + row * 5
    const rotation = mobile ? 0 : (column - 1) * 2

    nextStyles[topic.id] = {
      '--topic-fly-delay': `${delay}ms`,
      '--topic-fly-duration': `${duration}ms`,
      '--topic-fly-x': `${startX}px`,
      '--topic-fly-y': `${startY}px`,
      '--topic-fly-rotation': `${rotation}deg`,
    }
  })

  topicAnimationStyles.value = nextStyles
  isTopicAnimationReady.value = true
}

const MAX_VISIBLE_PAGES = 3

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value

  if (total <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  let start = current
  let end = current + MAX_VISIBLE_PAGES - 1

  if (end > total) {
    end = total
    start = total - MAX_VISIBLE_PAGES + 1
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const showFirstButton = computed(() => {
  return visiblePages.value.length > 0 && visiblePages.value[0] > 1
})

const showLastButton = computed(() => {
  return (
    visiblePages.value.length > 0 &&
    visiblePages.value[visiblePages.value.length - 1] < totalPages.value
  )
})

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  generateTopicAnimationStyles()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const totalPages = computed(() =>
  Math.ceil(sortedTopics.length / ITEMS_PER_PAGE)
)

const paginatedTopics = computed(() => {
  const start = (currentPage.value - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  return sortedTopics.slice(start, end)
})

// Resolve auth once on mount (safe + idempotent)
onMounted(async () => {
  mobileViewportQuery = window.matchMedia('(max-width: 639px)')
  syncMobileViewport()
  mobileViewportQuery.addEventListener('change', syncMobileViewport)

  generateTopicAnimationStyles()

  if (!authReady.value) {
    await resolve()
  }
})

onBeforeUnmount(() => {
  mobileViewportQuery?.removeEventListener('change', syncMobileViewport)
})

await resolve()

</script>


<template>
  <main class="topics-page max-w-4xl mx-auto py-12 px-4 space-y-10">

    <!-- <BackLink to="/" /> -->

    <header class="rounded-lg header-card">
      <h1 class="topic-heading">Topics</h1>
      <p class="topic-subheading mt-2">
        Vocabulary and sentences grouped by subject matter.
      </p>
    </header>

    <ul class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-3">

      <li v-for="(topic, index) in paginatedTopics" :key="`${currentPage}-${topic.id}`"
        class="topic-card hover:brightness-110 rounded-lg p-4 space-y-3 transition" :class="[
          isTopicAnimationReady ? 'topic-card-fly-in' : '',
          topic.comingSoon
            ? 'is-disabled'
            : 'is-active'
        ]" :style="{ backgroundColor: getTopicColor(topic, index), ...topicAnimationStyles[topic.id] }">

        <NuxtLink :to="topicLink(topic)" class="block space-y-3">
          <div class="min-w-0 topic-card-copy">
            <div class="topic-card-header">
              <h2 class="topic-card-title text-base sm:text-sm font-semibold text-gray-900 leading-snug">
                {{ topic.title }}
              </h2>

              <span class="topic-icon-wrap" role="img" :aria-label="`${topic.title} topic`">
                <component :is="getTopicIcon(topic.id)" class="topic-icon" aria-hidden="true" />
              </span>
            </div>

            <p v-if="topic.comingSoon" class="mt-2">
              <span class="pill text-black">Coming soon</span>
            </p>

            <p v-else-if="topic.requiresPaid && !doNotShowUpgradeMessage(topic)" class="mt-2">
              <span class="pill pill-locked">Locked</span>
            </p>

            <p class="hidden sm:block text-sm text-gray-700 mt-2">
              {{ topic.description }}
            </p>
          </div>
        </NuxtLink>
      </li>
    </ul>

    <div v-if="totalPages > 1" class="pagination-wrapper flex flex-col items-center gap-3 pt-8">

      <div class="flex justify-center items-center gap-1.5 sm:gap-3">
        <button @click="goToPage(1)" :disabled="currentPage === 1" class="pagination-jump" v-if="showFirstButton"
          aria-label="First page">
          <ChevronsLeft class="h-4 w-4" aria-hidden="true" />
        </button>

        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination-arrow"
          aria-label="Previous page">
          <ChevronLeft class="h-4 w-4" aria-hidden="true" />
        </button>

        <button v-for="page in visiblePages" :key="page" @click="goToPage(page)" class="pagination-page"
          :class="{ 'is-active': page === currentPage }">
          {{ page }}
        </button>

        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="pagination-arrow"
          aria-label="Next page">
          <ChevronRight class="h-4 w-4" aria-hidden="true" />
        </button>

        <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages" class="pagination-jump"
          v-if="showLastButton" aria-label="Last page">
          <ChevronsRight class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p class="text-xs text-gray-500">
        Page {{ currentPage }} of {{ totalPages }}
      </p>
    </div>

  </main>
</template>

<style scoped>
/* Palette variables */
.topics-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  /* assuming this is what you meant */
  --yellow: #F4CD27;
  --blush: #F6E1E1;
  border-radius: 16px;
}

.pagination-dots {
  min-width: 20px;
  text-align: center;
  font-weight: 600;
  color: #6b7280;
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

/* Header card */
.header-card {
  backdrop-filter: blur(6px);
}

/* Topic cards */
.topic-card {
  position: relative;
  backdrop-filter: blur(6px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
}

.topic-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.topic-card-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.topic-card-copy {
  padding-right: 2.25rem;
}

.topic-card-fly-in {
  opacity: 0;
  transform: translate3d(var(--topic-fly-x, 0), var(--topic-fly-y, 0), 0) rotate(var(--topic-fly-rotation, 0deg)) scale(0.98);
  animation: topic-fly-in var(--topic-fly-duration, 560ms) cubic-bezier(0.16, 0.84, 0.28, 1) var(--topic-fly-delay, 0ms) forwards;
  will-change: opacity, transform;
}

@keyframes topic-fly-in {
  0% {
    opacity: 0;
    transform: translate3d(var(--topic-fly-x, 0), var(--topic-fly-y, 0), 0) rotate(var(--topic-fly-rotation, 0deg)) scale(0.98);
  }

  70% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1.01);
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .topic-card-fly-in {
    opacity: 1;
    transform: none;
    animation: none;
    will-change: auto;
  }
}

.topic-icon-wrap {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.topic-icon {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 2.25;
  color: rgba(17, 24, 39, 0.82);
}

@media (max-width: 639px) {
  .topic-card-header {
    gap: 0.35rem;
  }

  .topic-card-title {
    flex: 1 1 auto;
    font-size: 0.78rem;
    line-height: 1.15;
  }

  .topic-card-copy {
    padding-right: 0;
  }

  .topic-icon-wrap {
    position: static;
    flex: 0 0 auto;
    margin-top: 0.05rem;
  }

  .topic-icon {
    width: 1rem;
    height: 1rem;
  }
}

.topic-card.is-active:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

.topic-card.is-disabled {
  opacity: 0.65;
  cursor: not-allowed;
  background: rgba(246, 225, 225, 0.35);
}

/* Pills (badges) */
.pill {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Coming soon = blue tint */
.pill-soon {
  color: rgba(0, 0, 0, 0.75);
}

/* Locked = yellow tint (use sparingly) */
.pill-locked {
  background: rgba(244, 205, 39, 0.60);
  color: rgba(0, 0, 0, 0.80);
}

/* Pink + Yellow TaroTea pagination */

/* Mobile first */
.pagination-page,
.pagination-arrow,
.pagination-jump {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.pagination-page {
  min-width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.8rem;
  background-color: #F6E1E1;
  color: #3A2A2A;
  transition: all 0.18s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.pagination-page:hover:not(.is-active) {
  background-color: #EAB8E4;
  transform: translateY(-1px);
}

.pagination-page.is-active {
  background-color: #D6A3D1;
  color: #000;
  box-shadow: 0 6px 16px rgba(214, 163, 209, 0.35);
  transform: translateY(-1px);
}

.pagination-arrow svg,
.pagination-jump svg {
  display: block;
}

.pagination-arrow {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 600;
  background-color: rgba(244, 205, 39, 0.35);
  color: #3A2A2A;
  transition: all 0.18s ease;
}

/* Tablet and up */
@media (min-width: 640px) {
  .pagination-wrapper {
    padding: 12px 16px;
  }

  .pagination-page {
    min-width: 38px;
    height: 38px;
    border-radius: 12px;
    font-size: 0.9rem;
  }

  .pagination-arrow {
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }
}

.pagination-jump {
  min-width: 48px;
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.75rem;
  background-color: rgba(168, 202, 224, 0.45);
  color: #3A2A2A;
  transition: all 0.18s ease;
}

.pagination-jump:hover:not(:disabled) {
  background-color: rgba(168, 202, 224, 0.65);
  transform: translateY(-1px);
}

.pagination-jump:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (min-width: 640px) {
  .pagination-jump {
    min-width: 58px;
    height: 38px;
    border-radius: 12px;
    font-size: 0.85rem;
  }
}
</style>
