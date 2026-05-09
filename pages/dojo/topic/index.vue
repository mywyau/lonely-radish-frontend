<script setup lang="ts">

definePageMeta({
  ssr: false,
})

import { ChevronLeft, ChevronRight } from '@lucide/vue'
import type { Topic } from '~/types/topic'
import { sortedTopics } from '~/utils/topics/topics'

const {
  isLoggedIn,
} = useMeStateV2()

const isComingSoon = (topic: Topic) => topic.comingSoon === true

const canEnterTopic = (topic: Topic) => !isComingSoon(topic)

const ITEMS_PER_PAGE = 12
const currentPage = ref(1)

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
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

const topicQuizModes = [
  {
    id: 'jyutping',
    label: 'Jyutping only',
    buttonClass: 'topic-btn-purple',
    to: (topicId: string) => `/dojo/topic/jyutping/training/${topicId}/v2/start`,
  },
  {
    id: 'chinese',
    label: 'Chinese only',
    buttonClass: 'topic-btn-blue',
    to: (topicId: string) => `/dojo/topic/chinese/training/${topicId}/v2/start`,
  },
  {
    id: 'sentences',
    label: 'Sentences Chinese Only',
    buttonClass: 'topic-btn-blush',
    to: (topicId: string) => `/dojo/topic/sentences/chinese/${topicId}/v2/start`,
  },
] as const

const selectedTopicQuizMode = ref<Record<string, number>>({})

function getSelectedTopicMode(topicId: string) {
  const modeIdx = selectedTopicQuizMode.value[topicId] ?? 0
  return topicQuizModes[modeIdx]
}

function getSelectedTopicModeIndex(topicId: string) {
  return selectedTopicQuizMode.value[topicId] ?? 0
}

function cycleTopicMode(topicId: string, direction: 1 | -1) {
  const current = selectedTopicQuizMode.value[topicId] ?? 0
  const total = topicQuizModes.length
  selectedTopicQuizMode.value[topicId] = (current + direction + total) % total
}

</script>

<template>
  <main class="topics-page max-w-4xl mx-auto py-10 px-2 space-y-10">

    <BackLink />

    <header class="text-center space-y-3 max-w-2xl mx-auto">
      <TypewriterTitleBlock
        heading-text="Topic Dojo"
        subheading-text="Strengthen your phonetic and typing proficiency with our exercises."
        heading-class="font-semibold topics-heading"
        subheading-class="topics-subheading"
        gap="0.75rem"
      />
    </header>

    <div v-if="totalPages > 1" class="pagination-wrapper flex flex-col items-center gap-3 pt-8">
      <div class="pagination-row flex items-center justify-center gap-1.5 sm:gap-3 max-w-full overflow-x-auto">
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination-arrow">
          <ChevronLeft class="h-4 w-4" aria-hidden="true" />
        </button>

        <button v-for="page in totalPages" :key="page" @click="goToPage(page)" class="pagination-page"
          :class="{ 'is-active': page === currentPage }">
          {{ page }}
        </button>

        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="pagination-arrow">
          <ChevronRight class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p class="text-xs text-gray-500">
        Page {{ currentPage }} of {{ totalPages }}
      </p>
    </div>

    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <li v-for="quizTopic in paginatedTopics" :key="quizTopic.id" class="topic-card" :class="[
        (!canEnterTopic(quizTopic) || quizTopic.comingSoon) ? 'topic-locked' : ''
      ]">
        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ quizTopic.title }}
          </h2>

          <p class="text-sm text-gray-600 leading-relaxed">
            {{ quizTopic.description }}
          </p>

          <p v-if="quizTopic.comingSoon" class="text-xs text-gray-400 font-medium">
            Coming soon
          </p>
        </div>

        <div v-if="canEnterTopic(quizTopic) && !quizTopic.comingSoon" class="pt-4 space-y-3">
          <div class="grid grid-cols-[42px_1fr_42px] gap-3">
            <button class="topic-mode-toggle" @click="cycleTopicMode(quizTopic.id, -1)" aria-label="Previous quiz mode">
              <ChevronLeft class="h-5 w-5" aria-hidden="true" />
            </button>

            <NuxtLink :to="getSelectedTopicMode(quizTopic.id).to(quizTopic.id)"
              class="topic-btn"
              :class="getSelectedTopicMode(quizTopic.id).buttonClass">
              {{ getSelectedTopicMode(quizTopic.id).label }}
            </NuxtLink>

            <button class="topic-mode-toggle" @click="cycleTopicMode(quizTopic.id, 1)" aria-label="Next quiz mode">
              <ChevronRight class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div class="mode-dots" :aria-label="`Mode ${getSelectedTopicModeIndex(quizTopic.id) + 1} of ${topicQuizModes.length}`">
            <span v-for="(mode, modeIndex) in topicQuizModes" :key="`${quizTopic.id}-${mode.id}`" class="mode-dot"
              :class="{ 'is-active': modeIndex === getSelectedTopicModeIndex(quizTopic.id) }" />
          </div>
        </div>

        <p v-else-if="!quizTopic.comingSoon" class="text-xs text-center text-gray-500 pt-4">
          This topic is currently unavailable
        </p>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.topics-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
  min-height: 65vh;
}

.topics-heading {
  font-size: 1.3rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(0, 0, 0);
}

.topics-subheading {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

/* Card */
.topic-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: 20px;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.topic-card::before {
  content: '';
  position: absolute;
  inset: -45%;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='172' height='92' viewBox='0 0 172 92'%3E%3Cg fill='%231f2937' opacity='.11' font-family='Arial,sans-serif' font-weight='700'%3E%3Ctext x='8' y='34' font-size='30'%3E%3F%3C/text%3E%3Ctext x='48' y='22' font-size='16'%3E%E2%9C%A6%3C/text%3E%3Ctext x='88' y='39' font-size='26'%3E%3F%3C/text%3E%3Ctext x='133' y='24' font-size='18'%3E%E2%97%87%3C/text%3E%3Ctext x='24' y='78' font-size='17'%3E%E2%9C%93%3C/text%3E%3Ctext x='68' y='70' font-size='28'%3E%3F%3C/text%3E%3Ctext x='121' y='81' font-size='17'%3E%E2%98%85%3C/text%3E%3C/g%3E%3C/svg%3E");
  background-size: 172px 92px;
  opacity: 0.55;
  transform: rotate(-18deg);
  transform-origin: center;
}

.topic-card > * {
  position: relative;
  z-index: 1;
}

.topic-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.topic-locked {
  opacity: 0.6;
}

/* Buttons */
.topic-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 56px;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
  font-weight: 600;
  line-height: 1.2;
  transition: all 0.15s ease;
}

.topic-btn-blue {
  background: rgba(168, 202, 224, 0.45);
  color: #1f2937;
}

.topic-btn-blue:hover {
  background: rgba(168, 202, 224, 0.65);
}

.topic-btn-purple {
  background: rgba(214, 163, 209, 0.45);
  color: #1f2937;
}

.topic-btn-purple:hover {
  background: rgba(214, 163, 209, 0.65);
}

.topic-btn-yellow {
  background: rgba(244, 205, 39, 0.45);
  color: #1f2937;
}

.topic-btn-yellow:hover {
  background: rgba(244, 205, 39, 0.65);
}

.topic-btn-blush {
  background: rgb(249, 166, 166);
  color: #1f2937;
}

.topic-btn-blush:hover {
  background: rgb(204, 136, 136);
}

.topic-mode-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  border-radius: 8px;
  background: transparent;
  color: #1f2937;
  font-size: 1.25rem;
  line-height: 1;
  font-weight: 700;
  transition: all 0.15s ease;
}

.topic-mode-toggle svg {
  display: block;
}

.topic-mode-toggle:hover {
  background: transparent;
}

.mode-dots {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
}

.mode-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: rgba(31, 41, 55, 0.2);
  transition: all 0.15s ease;
}

.mode-dot.is-active {
  background: rgba(31, 41, 55, 0.7);
}

.pagination-wrapper {
  padding: 12px 8px;
  border-radius: 16px;
}

.pagination-row {
  flex-wrap: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.pagination-row::-webkit-scrollbar {
  display: none;
}

.pagination-page,
.pagination-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  line-height: 1;
}

.pagination-arrow svg {
  display: block;
}

.pagination-page {
  min-width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.8rem;
  background-color: #F6E1E1;
  color: #1f2937;
  transition: all 0.18s ease;
  box-shadow: none;
}

.pagination-page.is-active {
  background-color: #D6A3D1;
  color: #000;
  box-shadow: none;
  transform: translateY(-1px);
}

.pagination-page:hover:not(.is-active) {
  background-color: #EAB8E4;
  transform: translateY(-1px);
}

.pagination-arrow {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 600;
  background-color: rgba(244, 205, 39, 0.45);
  color: #1f2937;
  transition: all 0.18s ease;
}

.pagination-arrow:hover:not(:disabled) {
  background-color: rgba(244, 205, 39, 0.65);
  transform: translateY(-1px);
}

.pagination-arrow:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

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
</style>
