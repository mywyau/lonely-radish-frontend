<script setup lang="ts">
useSeoMeta({
    title: 'Cantonese Topic Quizzes',
    description: 'Practice Cantonese topic quizzes with vocabulary, audio-only, and sentence modes.',
    ogTitle: 'Cantonese Topic Quizzes | TaroTea',
    ogDescription: 'Train Cantonese by topic with multiple quiz modes and adaptive repetition.',
})

import { computed, onMounted, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/vue'
import { useMeStateV2 } from '~/composables/useMeStateV2'
import type { TopicQuiz } from '~/types/topic'
import { sortedTopics } from '~/utils/topics/topics'

const {
    isLoggedIn,
    entitlement,
    resolve,
} = useMeStateV2()

const ITEMS_PER_PAGE = 8
const currentPage = ref(1)

const MAX_VISIBLE_PAGES = 4

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

const totalPages = computed(() =>
    Math.ceil(sortedTopics.length / ITEMS_PER_PAGE)
)

const paginatedTopics = computed(() => {
    const start = (currentPage.value - 1) * ITEMS_PER_PAGE
    const end = start + ITEMS_PER_PAGE
    return sortedTopics.slice(start, end)
})

function goToPage(page: number) {
    if (page < 1 || page > totalPages.value) return
    currentPage.value = page
    window.scrollTo({ top: 0, behavior: 'smooth' })
}

function canEnterTopic(topic: TopicQuiz): boolean {

    // if (topic.comingSoon) return false

    // // ✅ Free topic → always accessible
    // if (!topic.quizRequiresPaid) return true

    // 🔒 Paid topic → requires login + entitlement
    // if (!isLoggedIn.value) return false

    // return canAccessTopicQuiz(isLoggedIn.value, entitlement.value, topic.id)
    // if (isLoggedIn.value) { return true } else { return false }
    return true
}

const topicQuizModes = [
    {
        id: 'vocab',
        label: 'Vocab',
        buttonClass: 'topic-btn-blue',
        to: (topicId: string) => `/topic/quiz/vocabulary/word/v5/start-quiz/${topicId}`,
    },
    {
        id: 'audio',
        label: 'Audio Only',
        buttonClass: 'topic-btn-purple',
        to: (topicId: string) => `/topic/quiz/vocabulary/audio/v5/${topicId}/start-quiz`,
    },
    {
        id: 'sentences',
        label: 'Sentences',
        buttonClass: 'topic-btn-yellow',
        to: (topicId: string) => `/topic/quiz/sentences/no-audio/${topicId}/v3/start-quiz`,
    },
    {
        id: 'sentences-audio',
        label: 'Audio Only Sentences',
        buttonClass: 'topic-btn-blush',
        to: (topicId: string) => `/topic/quiz/sentences/audio/${topicId}/v3/start-quiz`,
    },
    {
        id: 'echo-gecko',
        label: 'Echo Gecko',
        buttonClass: 'topic-btn-green',
        to: (topicId: string) => `/topic/quiz/echo-gecko/${topicId}`,
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


watch(sortedTopics, () => {
    currentPage.value = 1
})

onMounted(async () => {
    // Resolve auth once on mount (safe + idempotent)
    await resolve()
})

</script>

<template>
    <main class="topics-page max-w-4xl mx-auto py-10 px-4 space-y-8">

        <div class="mb-6">
            <BackLink />
        </div>

        <!-- Intro -->
        <header class="text-center space-y-3 max-w-4xl mx-auto">
            <h1 class="font-semibold topics-heading">
                Topic Quiz
            </h1>
            <p class="text-sm sm:text-base topics-subheading">
                Practice Cantonese by topic. Your weakest words appear more often as you improve.
            </p>
        </header>

        <!-- Grid -->
        <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">

            <li v-for="topic in paginatedTopics" :key="topic.id" class="topic-card" :class="[
                topic.comingSoon || (topic.quizRequiresPaid && !canEnterTopic(topic))
                    ? 'topic-locked'
                    : ''
            ]">

                <!-- Header -->
                <div class="space-y-2">
                    <h2 class="text-lg font-semibold text-gray-900">
                        {{ topic.title }}
                    </h2>

                    <p class="text-sm text-gray-600 leading-relaxed">
                        {{ topic.description }}
                    </p>

                    <p v-if="topic.comingSoon" class="text-xs text-gray-400 font-medium">
                        Coming soon
                    </p>
                </div>

                <!-- Buttons -->
                <div class="pt-4 space-y-3">
                    <div class="quiz-mode-selector">
                        <button class="topic-mode-toggle" @click="cycleTopicMode(topic.id, -1)"
                            aria-label="Previous quiz mode" :disabled="!canEnterTopic(topic) || topic.comingSoon">
                            <ChevronLeft class="h-5 w-5" aria-hidden="true" />
                        </button>

                        <NuxtLink :to="canEnterTopic(topic) ? getSelectedTopicMode(topic.id).to(topic.id) : undefined"
                            class="topic-btn"
                            :class="[getSelectedTopicMode(topic.id).buttonClass, { 'pointer-events-none opacity-60': topic.comingSoon || !canEnterTopic(topic) }]">
                            {{ getSelectedTopicMode(topic.id).label }}
                        </NuxtLink>

                        <button class="topic-mode-toggle" @click="cycleTopicMode(topic.id, 1)" aria-label="Next quiz mode"
                            :disabled="!canEnterTopic(topic) || topic.comingSoon">
                            <ChevronRight class="h-5 w-5" aria-hidden="true" />
                        </button>
                    </div>

                    <div class="mode-dots" :aria-label="`Mode ${getSelectedTopicModeIndex(topic.id) + 1} of ${topicQuizModes.length}`">
                        <span v-for="(mode, modeIndex) in topicQuizModes" :key="`${topic.id}-${mode.id}`" class="mode-dot"
                            :class="{ 'is-active': modeIndex === getSelectedTopicModeIndex(topic.id) }" />
                    </div>
                </div>

                <p v-if="!canEnterTopic(topic)" class="text-xs text-center text-gray-500 pt-3">
                    Upgrade to unlock
                </p>

            </li>

        </ul>

        <div v-if="totalPages > 1" class="pagination-wrapper flex flex-col items-center gap-3 pt-8">
            <div class="pagination-row flex items-center justify-center gap-1.5 sm:gap-3 max-w-full overflow-x-auto">
                <button v-if="showFirstButton" @click="goToPage(1)" :disabled="currentPage === 1"
                    class="pagination-jump">
                    <ChevronsLeft class="h-4 w-4" aria-hidden="true" />
                </button>

                <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination-arrow">
                    <ChevronLeft class="h-4 w-4" aria-hidden="true" />
                </button>

                <button v-for="page in visiblePages" :key="page" @click="goToPage(page)" class="pagination-page"
                    :class="{ 'is-active': page === currentPage }">
                    {{ page }}
                </button>

                <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
                    class="pagination-arrow">
                    <ChevronRight class="h-4 w-4" aria-hidden="true" />
                </button>

                <button v-if="showLastButton" @click="goToPage(totalPages)" :disabled="currentPage === totalPages"
                    class="pagination-jump">
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
.topics-page {
    --pink: #EAB8E4;
    --purple: #D6A3D1;
    --blue: #A8CAE0;
    --yellow: #F4CD27;
    --blush: #F6E1E1;
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
    min-height: 52px;
    padding: 0.6rem 0.75rem;
    font-size: 0.85rem;
    border-radius: 8px;
    font-weight: 600;
    line-height: 1.2;
    transition: all 0.15s ease;
}

/* Colour variations */
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

.topic-btn-green {
    background: rgba(205, 232, 201, 0.7);
    color: #1f2937;
}

.topic-btn-green:hover {
    background: rgba(192, 223, 188, 0.85);
}

.quiz-mode-selector {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem;
    align-items: stretch;
    column-gap: 0.75rem;
}

.topic-mode-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 52px;
    border-radius: 8px;
    background: transparent;
    color: #1f2937;
    font-size: 1.25rem;
    line-height: 1;
    font-weight: 700;
    transition: color 0.15s ease, transform 0.15s ease;
}

.topic-mode-toggle:hover:not(:disabled) {
    color: rgba(31, 41, 55, 0.7);
    transform: translateY(-1px);
}

.topic-mode-toggle:disabled {
    opacity: 0.4;
    cursor: not-allowed;
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
.pagination-arrow,
.pagination-jump {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    line-height: 1;
}

/* Mobile first */
.pagination-page {
    min-width: 32px;
    height: 32px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.8rem;
    background-color: #F6E1E1;
    color: #1f2937;
    transition: all 0.18s ease;
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.05);
}

.pagination-page:hover:not(.is-active) {
    background-color: #EAB8E4;
    transform: translateY(-1px);
}

.pagination-page.is-active {
    background-color: #D6A3D1;
    color: #000;
    box-shadow: 0 8px 20px rgba(214, 163, 209, 0.35);
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

.pagination-jump {
    min-width: 40px;
    height: 32px;
    padding: 0 8px;
    border-radius: 10px;
    font-weight: 600;
    font-size: 0.8rem;
    background-color: rgba(168, 202, 224, 0.45);
    color: #1f2937;
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

    .pagination-jump {
        min-width: 48px;
        height: 38px;
        border-radius: 12px;
        font-size: 0.85rem;
    }
}
</style>
