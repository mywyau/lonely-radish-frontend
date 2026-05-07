<script setup lang="ts">

definePageMeta({
    ssr: true,
    // middleware: ['topic-word-access-v2'],
    middleware: ["word-access"]
})

import { masteryXp } from '@/config/xp/helpers';

type TopicIndex = {
    topic: string
    title: string
    description: string
    categories: Record<string, Array<{
        id: string
        word: string
        jyutping: string
        meaning: string
    }>>
}

type TopicWordItem = {
    id: string
    word: string
    jyutping: string
    meaning: string
    categoryKey: string
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const { authReady } = useMeStateV2() // for now just to prevent hydration redirect jitters

const slug = computed(() => decodeURIComponent(route.params.slug as string))
const topic = computed(() => route.params.topic as string)

const { data, error } = await useFetch(
    () => `/api/words/${slug.value}`,
    {
        key: () => `word-${slug.value}`,
        server: true
    }
)

const { data: topicIndex } = await useFetch<TopicIndex>(
    () => `/api/index/topics/${topic.value}`,
    {
        key: () => `topic-index-${topic.value}`,
        server: true
    }
)

const orderedTopicWords = computed<TopicWordItem[]>(() => {
    const categories = topicIndex.value?.categories
    if (!categories) return []

    return Object.entries(categories).flatMap(([categoryKey, words]) =>
        words.map((entry) => ({
            ...entry,
            categoryKey
        }))
    )
})

const currentIndex = computed(() => {
    const currentWordId = word.value?.id
    if (!currentWordId) return -1

    return orderedTopicWords.value.findIndex((entry) => entry.id === currentWordId)
})

const prevWord = computed(() => {
    const i = currentIndex.value
    if (i <= 0) return null
    return orderedTopicWords.value[i - 1]
})

const nextWord = computed(() => {
    const i = currentIndex.value
    if (i === -1 || i >= orderedTopicWords.value.length - 1) return null
    return orderedTopicWords.value[i + 1]
})

const { volume } = useAudioVolume()

const showXpBar = useCookie<boolean>('word-page-show-xp-bar', {
    default: () => true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 180
})
const showPracticeButtons = useCookie<boolean>('word-page-show-practice-buttons', {
    default: () => true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 180
})
const showAudioButtons = useCookie<boolean>('word-page-show-audio-buttons', {
    default: () => true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 180
})

type AudioVoice = 'male' | 'female'

const selectedAudioVoice = useCookie<AudioVoice>('audio-voice', {
    default: () => 'male',
    sameSite: 'lax'
})

const setAudioVoice = (voice: AudioVoice) => {
    selectedAudioVoice.value = voice
}

const audioDirectory = computed(() => {
    return selectedAudioVoice.value === 'female'
        ? 'audio-female'
        : 'audio-male'
})

const getAudioSrc = (fileName?: string | null) => {
    if (!fileName) return ''
    return `${cdnBase}/${audioDirectory.value}/${fileName}`
}

const word = computed(() => data.value)

const xp = ref<number>(0)
const streak = ref<number>(0)

const playbackRate = ref(1)
const minPlaybackRate = 0.4
const maxPlaybackRate = 2
const playbackStep = 0.2
const speedDeltaPercent = computed(() => Math.round((playbackRate.value - 1) * 100))
const speedDeltaLabel = computed(() => {
    if (speedDeltaPercent.value === 0) return 'Normal speed'
    return speedDeltaPercent.value > 0
        ? `+${speedDeltaPercent.value}% faster`
        : `${Math.abs(speedDeltaPercent.value)}% slower`
})
const decreasePlaybackRate = () => {
    playbackRate.value = Math.max(minPlaybackRate, Number((playbackRate.value - playbackStep).toFixed(2)))
}
const increasePlaybackRate = () => {
    playbackRate.value = Math.min(maxPlaybackRate, Number((playbackRate.value + playbackStep).toFixed(2)))
}
const currentExampleIndex = ref(0)
const totalExamples = computed(() => word.value?.examples?.length ?? 0)
const currentExample = computed(() => word.value?.examples?.[currentExampleIndex.value] ?? null)

const showPrevExample = () => {
    if (!totalExamples.value) return
    currentExampleIndex.value = (currentExampleIndex.value - 1 + totalExamples.value) % totalExamples.value
}

const showNextExample = () => {
    if (!totalExamples.value) return
    currentExampleIndex.value = (currentExampleIndex.value + 1) % totalExamples.value
}

watch(
    () => word.value?.id,
    () => {
        currentExampleIndex.value = 0
    }
)


const masteryPercent = computed(() => {
    return Math.min((xp.value / masteryXp) * 100, 100)
})

const isMastered = computed(() => xp.value >= masteryXp)

onMounted(async () => {
    try {
        const { getAccessToken } = await useAuth()
        const token = await getAccessToken()

        const progressMap = await $fetch<Record<string, { xp: number; streak: number }>>(
            '/api/word-progress',
            {
                query: { wordIds: slug.value },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        xp.value = progressMap[slug.value]?.xp ?? 0
        streak.value = progressMap[slug.value]?.streak ?? 0
    } catch {
        // not logged in or error → ignore
    }
})

watchEffect(() => {
    if (!word.value) return

    const topicLabel = topic.value.replace(/-/g, " ")

    useSeoMeta({
        title: `How to say "${word.value.meaning}" in Cantonese (${topicLabel}) – ${word.value.word}`,
        description: `Learn the Cantonese word for "${word.value.meaning}" in the ${topicLabel} topic. Includes pronunciation (${word.value.jyutping}) and example sentences.`,
        ogTitle: `${word.value.word} (${word.value.jyutping}) – Cantonese meaning`,
        ogDescription: `Cantonese vocabulary for "${word.value.meaning}" in ${topicLabel}.`,
        ogType: 'article',
    })
})

</script>

<template>
    <main v-if="authReady && word" class="word-page max-w-4xl mx-auto px-4 py-8 space-y-4 sm:space-y-6">

        <div class="flex items-center justify-between gap-4">
            <NuxtLink :to="`/topic/words/${topic}/v2#${word.id}`" class="text-sm text-black hover:underline">
                ← Back
            </NuxtLink>

            <div class="flex items-center gap-2">
                <details class="group relative">
                    <summary
                        class="list-none cursor-pointer rounded-full bg-yellow-100 px-3 py-1.5 text-xs font-semibold text-black shadow-sm transition hover:bg-yellow-200">
                        Settings
                    </summary>
                    <div
                        class="absolute left-1/2 z-20 mt-2 w-[min(18rem,calc(100vw-1rem))] -translate-x-1/2 rounded-xl border border-yellow-200 bg-yellow-50 p-3 shadow-lg space-y-4 sm:left-auto sm:right-0 sm:w-72 sm:translate-x-0">
                        <div class="space-y-1">
                            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Volume</p>
                            <div class="flex items-center gap-2">
                                <input type="range" min="0" max="1" step="0.01" v-model="volume"
                                    class="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600" />
                                <span class="w-8 text-xs tabular-nums text-gray-700">{{ Math.round(volume * 100) }}%</span>
                            </div>
                        </div>
                        <div class="space-y-1">
                            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Speed</p>
                            <div class="flex items-center justify-between gap-2">
                                <button type="button"
                                    class="px-1 text-2xl font-semibold leading-none text-gray-600 transition hover:text-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                                    :disabled="playbackRate <= minPlaybackRate" aria-label="Reduce playback speed by 20%"
                                    @click="decreasePlaybackRate">
                                    ‹
                                </button>
                                <span class="w-28 text-center tabular-nums text-xs font-semibold text-gray-900">{{ speedDeltaLabel }}</span>
                                <button type="button"
                                    class="px-1 text-2xl font-semibold leading-none text-gray-600 transition hover:text-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                                    :disabled="playbackRate >= maxPlaybackRate" aria-label="Increase playback speed by 20%"
                                    @click="increasePlaybackRate">
                                    ›
                                </button>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Voice</p>
                            <div class="flex rounded-full bg-gray-100 p-1" aria-label="Audio voice">
                                <button type="button" class="flex-1 rounded-full px-3 py-1 text-xs font-semibold transition" :class="selectedAudioVoice === 'male'
                                        ? 'bg-blue-100 text-black shadow-sm'
                                        : 'bg-transparent text-gray-700 hover:bg-gray-200'
                                    " :aria-pressed="selectedAudioVoice === 'male'" @click="setAudioVoice('male')">
                                    Male
                                </button>

                                <button type="button" class="flex-1 rounded-full px-3 py-1 text-xs font-semibold transition" :class="selectedAudioVoice === 'female'
                                        ? 'bg-pink-100 text-black shadow-sm'
                                        : 'bg-transparent text-gray-700 hover:bg-gray-200'
                                    " :aria-pressed="selectedAudioVoice === 'female'" @click="setAudioVoice('female')">
                                    Female
                                </button>
                            </div>
                        </div>
                        <div class="space-y-2 border-t border-yellow-200 pt-3">
                            <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Page display</p>
                            <label class="flex cursor-pointer items-center justify-between gap-3 text-xs font-medium text-gray-700">
                                <span>Show XP bar</span>
                                <input v-model="showXpBar" type="checkbox" class="h-4 w-4 rounded border-gray-300 accent-blue-600" />
                            </label>
                            <label class="flex cursor-pointer items-center justify-between gap-3 text-xs font-medium text-gray-700">
                                <span>Show practice buttons</span>
                                <input v-model="showPracticeButtons" type="checkbox" class="h-4 w-4 rounded border-gray-300 accent-blue-600" />
                            </label>
                            <label class="flex cursor-pointer items-center justify-between gap-3 text-xs font-medium text-gray-700">
                                <span>Show audio buttons</span>
                                <input v-model="showAudioButtons" type="checkbox" class="h-4 w-4 rounded border-gray-300 accent-blue-600" />
                            </label>
                        </div>
                    </div>
                </details>
            </div>
        </div>

        <!-- Word header -->
        <section class="text-center space-y-4 sm:space-y-4 word-card rounded-xl p-6 sm:p-8">

            <h1 class="text-4xl font-semibold text-gray-900">
                {{ word.word }}
            </h1>

            <div class="text-lg text-gray-500">
                {{ word.jyutping }}
            </div>

            <div class="text-lg text-gray-700">
                {{ word.meaning }}
            </div>

            <!-- XP block -->
            <div v-if="showXpBar" class="pt-6 space-y-3">

                <div class="flex justify-between text-sm text-gray-600 max-w-xs mx-auto">
                    <span>{{ xp }} / {{ masteryXp }} XP</span>
                    <span v-if="isMastered" class="font-semibold text-green-600">
                        ✓ Maxed
                    </span>
                </div>

                <div class="w-full max-w-xs mx-auto h-2 rounded-full overflow-hidden bg-gray-300">
                    <div class="h-2 bg-green-500 transition-all duration-700 ease-out"
                        :style="{ width: masteryPercent + '%' }" />
                </div>

            </div>

            <div class="flex items-center justify-between w-full pt-1">
                <NuxtLink v-if="prevWord" :to="`/topic/word/${topic}/${prevWord.id}`" class="edge-arrow"
                    aria-label="Previous word">
                    ‹
                </NuxtLink>

                <div v-else class="w-10" />

                <NuxtLink v-if="nextWord" :to="`/topic/word/${topic}/${nextWord.id}`" class="edge-arrow"
                    aria-label="Next word">
                    ›
                </NuxtLink>
            </div>

            <div v-if="showPracticeButtons || showAudioButtons" class="main-actions-row">

                <NuxtLink v-if="showPracticeButtons" :to="`/writing/${topic}/vocab/${word.id}`"
                    class="action-chip action-chip-write main-action-btn" aria-label="Practice writing this word">
                    <span aria-hidden="true" class="mobile-action-icon">✏️</span>
                    <span class="mobile-action-label">Write</span>
                </NuxtLink>

                <NuxtLink v-if="showPracticeButtons" :to="`/tone-garden/${word.id}`" class="action-chip action-chip-tone-forge main-action-btn"
                    aria-label="Open tone checker for this word">
                    <span aria-hidden="true" class="mobile-action-icon">🎤</span>
                    <span class="mobile-action-label">Speak</span>
                </NuxtLink>

                <AudioButton v-if="showAudioButtons && word.audio?.word" :key="`word-audio-${selectedAudioVoice}-${word.audio.word}`"
                    :src="getAudioSrc(word.audio.word)" :playback-rate="playbackRate" size="md"
                    class="tone-gate-play-btn main-action-btn" />

            </div>

        </section>

        <!-- Usage -->
        <section v-if="word.usage?.length" class="section-card rounded-xl p-6">
            <details class="usage-details">
                <summary class="usage-summary text-lg font-semibold text-gray-900">
                    Usage
                </summary>

                <ul class="pl-10 list-disc space-y-2 text-gray-700 mt-3">
                    <li v-for="note in word.usage" :key="note">
                        {{ note }}
                    </li>
                </ul>
            </details>
        </section>

        <!-- Examples -->
        <section v-if="word.examples?.length" class="section-card rounded-xl p-6">

            <h2 class="text-lg font-semibold mb-4 text-gray-900">
                Examples
            </h2>

            <ul class="space-y-5 list-none pl-0">
                <li v-if="currentExample" :key="`${word.id}-${currentExampleIndex}`"
                    class="example-card rounded-lg p-4">
                    <div class="space-y-3">
                        <!-- buttons aligned right -->
                        <div v-if="showPracticeButtons || showAudioButtons" class="flex justify-end">
                            <div class="example-actions-row">
                                <NuxtLink v-if="showPracticeButtons" :to="`/writing/${topic}/sentences/${word.id}/${currentExampleIndex}`"
                                    class="action-chip action-chip-sm action-chip-write example-action-btn"
                                    aria-label="Practice writing this sentence">
                                    <span aria-hidden="true" class="mobile-action-icon">✏️</span>
                                    <span class="mobile-action-label">Write</span>
                                </NuxtLink>

                                <NuxtLink v-if="showPracticeButtons"
                                    :to="`/echo-lab/pronunciation-check/topic/${topic}/sentences/${word.id}/v2/${currentExampleIndex}`"
                                    class="action-chip action-chip-sm action-chip-speak example-action-btn"
                                    aria-label="Practice pronunciation for this sentence">
                                    <span aria-hidden="true" class="mobile-action-icon">🎤</span>
                                    <span class="mobile-action-label">Speak</span>
                                </NuxtLink>

                                <AudioButton v-if="showAudioButtons && word.audio?.examples?.[currentExampleIndex]"
                                    :key="`example-audio-${selectedAudioVoice}-${word.id}-${currentExampleIndex}`"
                                    :src="getAudioSrc(word.audio.examples[currentExampleIndex])"
                                    :playback-rate="playbackRate" size="sm"
                                    class="tone-gate-play-btn example-action-btn" />
                            </div>
                        </div>

                        <!-- sentence on its own line -->
                        <div class="example-scroll-block">
                            <div class="example-scroll-content">
                                <div class="text-lg leading-relaxed text-gray-900 whitespace-nowrap">
                                    {{ currentExample.sentence }}
                                </div>

                                <div class="mt-2 text-sm text-gray-500 whitespace-nowrap">
                                    {{ currentExample.jyutping }}
                                </div>

                                <div class="mt-2 text-sm text-gray-700 whitespace-nowrap">
                                    {{ currentExample.meaning }}
                                </div>
                            </div>
                        </div>
                    </div>
                </li>
            </ul>

            <div v-if="totalExamples > 1" class="example-pagination mt-4">
                <button class="example-nav-arrow" type="button" aria-label="Previous example"
                    @click="showPrevExample">‹</button>
                <div class="example-dots" aria-label="Example position indicator">
                    <span v-for="dotIndex in totalExamples" :key="dotIndex" class="example-dot"
                        :class="{ 'example-dot-active': dotIndex - 1 === currentExampleIndex }" />
                </div>
                <button class="example-nav-arrow" type="button" aria-label="Next example"
                    @click="showNextExample">›</button>
            </div>

            <div class="text-center mt-10">
                <p class="text-center mt-10 text-sm"> Spot an error? Report to:
                    <a href="mailto:errors@tarotea.co.uk" class="font-medium text-gray-600">
                        errors@tarotea.co.uk
                    </a>
                </p>
            </div>
        </section>

    </main>
</template>

<style scoped>
.word-page {
    --pink: #EAB8E4;
    --purple: #D6A3D1;
    --blue: #A8CAE0;
    --yellow: #F4CD27;
    --blush: #F6E1E1;

    border-radius: 18px;
    padding-bottom: 2rem;
}

/* Main word card */
.word-card {
    backdrop-filter: blur(6px);
}

/* Section cards */
.section-card {
    backdrop-filter: blur(6px);
}

.usage-details {
    width: 100%;
}

.usage-summary {
    width: fit-content;
    cursor: pointer;
    text-decoration: underline;
    text-decoration-color: transparent;
    text-underline-offset: 0.2em;
    transition: text-decoration-color 0.2s ease;
}

.usage-summary:hover {
    text-decoration-color: currentColor;
}

/* Examples */
.example-card {
    background: rgba(168, 202, 224, 0.20);
    border-left: 4px solid rgba(168, 202, 224, 0.70);
}

.example-scroll-block {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 0.15rem;
}

.example-scroll-content {
    width: max-content;
    min-width: 100%;
}

/* Progress bar */
.progress-bar {
    background: linear-gradient(90deg,
            #D6A3D1,
            #EAB8E4);
}

.action-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #d1d5db;
    background: #ffffff;
    color: #111827;
    font-size: 0.875rem;
    font-weight: 500;
    padding: 0.45rem 0.75rem;
    border-radius: 0.6rem;
    transition: all 0.2s ease;
}

.main-actions-row {
    display: flex;
    width: 100%;
    justify-content: center;
    align-items: stretch;
    gap: 0.5rem;
    padding-top: 0.25rem;
    flex-wrap: wrap;
}

.main-action-btn {
    min-height: 2.5rem;
    gap: 0.35rem;
}

.example-actions-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.5rem;
}

.example-action-btn {
    min-height: 2rem;
}

.voice-toggle {
    display: inline-flex;
    align-items: center;
    border: 1px solid #d1d5db;
    border-radius: 9999px;
    background: #ffffff;
    padding: 0.15rem;
    min-height: 2.5rem;
}

.voice-toggle-btn {
    border: none;
    background: transparent;
    color: #4b5563;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.35rem 0.65rem;
    border-radius: 9999px;
    transition: background 0.2s ease, color 0.2s ease;
}

.voice-toggle-btn:hover {
    background: #f3f4f6;
}

.voice-toggle-btn-active {
    background: #F6E1E1;
    color: #111827;
}

.voice-toggle-btn-active:hover {
    background: #f2d8d8;
}

.example-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
}

.example-nav-arrow {
    color: #6b7280;
    font-size: 1.75rem;
    line-height: 1;
    border: none;
    background: transparent;
    padding: 0.1rem 0.3rem;
}

.example-dots {
    display: flex;
    align-items: center;
    gap: 0.55rem;
}

.example-dot {
    width: 0.62rem;
    height: 0.62rem;
    border-radius: 9999px;
    background: #d1d5db;
}

.example-dot-active {
    background: #6b7280;
}

.action-chip:hover {
    border-color: #9ca3af;
    background: #f9fafb;
}

.action-chip-write {
    border-color: transparent;
    background: #F6E1E1;
}

.action-chip-write:hover {
    background: #f2d8d8;
    border-color: transparent;
}

.action-chip-speak {
    border-color: transparent;
    background: #CDE8C9;
}

.action-chip-speak:hover {
    background: #b7d4e7;
    border-color: transparent;
}

.action-chip-tone-forge {
    border-color: transparent;
    background: #CDE8C9;
}

.action-chip-tone-forge:hover {
    background: #d8edd4;
    border-color: transparent;
}

.action-chip-sm {
    font-size: 0.75rem;
    padding: 0.3rem 0.55rem;
}

:deep(.tone-gate-play-btn) {
    min-height: 2.0rem;
    border-color: transparent !important;
    background: #a3c0d6 !important;
}

:deep(.tone-gate-play-btn:hover) {
    background: #aecbe3 !important;
    border-color: transparent !important;
}

:deep(.main-actions-row .tone-gate-play-btn) {
    padding: 0.45rem 0.75rem !important;
}

:deep(.example-actions-row .tone-gate-play-btn) {
    padding: 0.3rem 0.55rem !important;
}

.edge-arrow {
    font-size: 4rem;
    line-height: 1;
    color: #4b5563;
    transition: color 0.2s ease, transform 0.2s ease;
}

.edge-arrow:hover {
    color: #49b0ff;
    transform: scale(1.04);
}

@media (max-width: 640px) {
    .main-actions-row {
        flex-wrap: nowrap;
        justify-content: center;
        align-items: center;
        gap: 0.35rem;
    }

    .main-action-btn {
        min-height: 2rem;
        padding: 0.3rem 0.55rem;
        font-size: 0.75rem;
        white-space: nowrap;
    }

    :deep(.main-actions-row .tone-gate-play-btn) {
        min-height: 2rem;
        padding: 0.3rem 0.5rem !important;
        font-size: 0.75rem !important;
        gap: 0.2rem !important;
    }

    :deep(.main-actions-row .tone-gate-play-btn span:last-child) {
        display: none;
    }

    .example-actions-row {
        flex-wrap: nowrap;
        gap: 0.35rem;
    }

    .example-action-btn {
        min-height: 1.9rem;
        padding: 0.25rem 0.45rem;
    }

    .mobile-action-label {
        display: none;
    }

    .mobile-action-icon {
        font-size: 0.95rem;
        line-height: 1;
    }

    .voice-toggle {
        min-height: 2rem;
    }

    .voice-toggle-btn {
        font-size: 0.7rem;
        padding: 0.25rem 0.45rem;
    }
}
</style>
