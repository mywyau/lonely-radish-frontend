<script setup lang="ts">
import { masteryXp } from '@/config/xp/helpers';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Mic,
  PencilLine,
  Settings,
  X,
} from '@lucide/vue';
import { useAudioVolume } from '~/composables/useAudioVolume';
import { useAuth } from '~/composables/useAuth';


definePageMeta({
  ssr: true,
  // middleware: ['level-word-access-v2-client'],
  middleware: ["word-access"]
})


type LevelIndex = {
  id?: string
  slug?: string
  title?: string
  description?: string
  categories?: Record<string, Array<{
    id: string
    word: string
    jyutping: string
    meaning: string
  }>>
  words?: Array<{
    id: string
    word: string
    jyutping: string
    meaning: string
  }>
}

type LevelWordItem = {
  id: string
  word: string
  jyutping: string
  meaning: string
  categoryKey?: string
}

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

// Dynamic params
const level = computed(() => route.params.slug as string)
const id = computed(() => decodeURIComponent(route.params.id as string))

// Fetch word data
const { data, error } = await useFetch(
  () => `/api/words/${id.value}`,
  {
    key: () => `word-${id.value}`,
    server: true,
  }
)

const { data: levelIndex } = await useFetch<LevelIndex>(
  () => `/api/index/levels/${level.value}`,
  {
    key: () => `level-index-${level.value}`,
    server: true,
    credentials: 'include',
  }
)

const orderedLevelWords = computed<LevelWordItem[]>(() => {
  if (levelIndex.value?.categories) {
    return Object.entries(levelIndex.value.categories).flatMap(([categoryKey, words]) =>
      words.map((entry) => ({
        ...entry,
        categoryKey
      }))
    )
  }

  if (levelIndex.value?.words) {
    return levelIndex.value.words.map((entry) => ({
      ...entry
    }))
  }

  return []
})

const currentIndex = computed(() => {
  const currentWordId = word.value?.id
  if (!currentWordId) return -1

  return orderedLevelWords.value.findIndex((entry) => entry.id === currentWordId)
})

const prevWord = computed(() => {
  const i = currentIndex.value
  if (i <= 0) return null
  return orderedLevelWords.value[i - 1]
})

const nextWord = computed(() => {
  const i = currentIndex.value
  if (i === -1 || i >= orderedLevelWords.value.length - 1) return null
  return orderedLevelWords.value[i + 1]
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

const audioVoiceCookie = useCookie<AudioVoice | null>('audio-voice', {
  default: () => null,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 180
})

const selectedAudioVoice = ref<AudioVoice>(
  audioVoiceCookie.value === 'female' ? 'female' : 'male'
)

const setAudioVoice = (voice: AudioVoice) => {
  selectedAudioVoice.value = voice
  audioVoiceCookie.value = voice
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

const notFound = computed(() => error.value?.statusCode === 404)

const masteryPercent = computed(() => {
  const value = xp.value ?? 0
  return Math.min((value / masteryXp) * 100, 100)
})

const xp = ref<number>(0)
const streak = ref<number>(0)

const isMastered = computed(() => xp.value >= masteryXp)

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

const settingsDetails = ref<HTMLDetailsElement | null>(null)

const closeSettings = () => {
  settingsDetails.value?.removeAttribute('open')
}

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

onMounted(async () => {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()


    const progressMap = await $fetch<
      Record<string, { xp: number; streak: number }>
    >(
      '/api/word-progress',
      {
        query: { wordIds: id.value },
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    xp.value = progressMap[id.value]?.xp ?? 0
    streak.value = progressMap[id.value]?.streak ?? 0

  } catch (err) {
    // not logged in or failed → ignore
  }
})

// ✅ SEO META (runs when word loads)
watchEffect(() => {
  if (!word.value) return

  useSeoMeta({
    title: `How to say "${word.value.meaning}" in Cantonese – ${word.value.word} (${word.value.jyutping}) | TaroTea`,
    description: `Learn how to say "${word.value.meaning}" in Cantonese. Includes pronunciation (${word.value.jyutping}), example sentences and audio.`,
    ogTitle: `How to say "${word.value.meaning}" in Cantonese`,
    ogDescription: `Cantonese word: ${word.value.word} (${word.value.jyutping}). Includes audio and example sentences.`,
    ogType: 'article',
  })
})

</script>

<template>

  <main v-if="word" class="word-page max-w-4xl mx-auto px-4 py-8 space-y-4 sm:space-y-4">

    <div class="flex items-center justify-end gap-4">
      <div class="flex items-center gap-2">
        <details ref="settingsDetails" class="group relative">
          <summary
            class="inline-flex list-none cursor-pointer items-center gap-1.5 rounded-lg bg-gray-200 px-3 py-1.5 text-xs font-semibold text-black shadow-sm transition hover:bg-gray-200">
            <Settings class="h-3.5 w-3.5" />
            <span>Settings</span>
          </summary>
          <div
            class="fixed left-1/2 top-24 z-50 max-h-[calc(100vh-7rem)] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 overflow-y-auto rounded-xl bg-gray-200 p-3 shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-none sm:w-72 sm:translate-x-0 sm:overflow-visible">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-800">
                Settings
              </p>
              <button type="button"
                class="flex h-7 w-7 items-center justify-center rounded-full text-gray-900 transition hover:bg-black/5"
                aria-label="Close settings" @click="closeSettings">
                <X class="h-4 w-4" />
              </button>
            </div>
            <div class="space-y-4">
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
                    class="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-600 transition hover:bg-black/5 hover:text-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="playbackRate <= minPlaybackRate" aria-label="Reduce playback speed by 20%"
                    @click="decreasePlaybackRate">
                    <ChevronLeft class="h-4 w-4" />
                  </button>
                  <span class="w-28 text-center tabular-nums text-xs font-semibold text-gray-900">{{ speedDeltaLabel }}</span>
                  <button type="button"
                    class="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-600 transition hover:bg-black/5 hover:text-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                    :disabled="playbackRate >= maxPlaybackRate" aria-label="Increase playback speed by 20%"
                    @click="increasePlaybackRate">
                    <ChevronRight class="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div class="space-y-2">
                <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Voice</p>
                <div class="flex rounded-full bg-gray-100 p-1" aria-label="Audio voice">
                  <button type="button" class="flex-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:text-xs"
                    :class="selectedAudioVoice === 'male'
                      ? 'bg-blue-200 text-black shadow-sm'
                      : 'bg-transparent text-gray-700 hover:bg-gray-200'
                      " :aria-pressed="selectedAudioVoice === 'male'" @click="setAudioVoice('male')">
                    Male
                  </button>

                  <button type="button" class="flex-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:text-xs"
                    :class="selectedAudioVoice === 'female'
                      ? 'bg-pink-200 text-black shadow-sm'
                      : 'bg-transparent text-gray-700 hover:bg-gray-200'
                      " :aria-pressed="selectedAudioVoice === 'female'" @click="setAudioVoice('female')">
                    Female
                  </button>
                </div>
              </div>

              <div class="space-y-2 border-t border-gray-300 pt-3">
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
          </div>
        </details>
      </div>
    </div>

    <!-- Word header -->
    <section class="text-center space-y-4 sm:space-y-6 word-card rounded-xl p-6 sm:p-8">

      <h1 class="text-4xl font-semibold text-black">
        {{ word.word }}
      </h1>

      <div class="text-lg text-black">
        {{ word.jyutping }}
      </div>

      <div class="text-lg text-black">
        {{ word.meaning }}
      </div>

      <div class="word-nav-row">
        <NuxtLink v-if="prevWord" :to="`/level/${level}/word/${prevWord.id}`" class="edge-arrow"
          aria-label="Previous word">
          <span class="edge-arrow-burst" aria-hidden="true"></span>
          <ChevronLeft class="h-12 w-12" />
        </NuxtLink>
        <div v-else class="edge-arrow-placeholder" aria-hidden="true" />

        <!-- XP block -->
        <div v-if="showXpBar" class="word-nav-progress" aria-label="Word XP progress">
          <div class="word-nav-progress-label text-sm text-gray-600">
            <span>{{ xp }} / {{ masteryXp }} XP</span>
            <span v-if="isMastered" class="inline-flex items-center gap-1 font-semibold text-green-600">
              <CheckCircle2 class="h-4 w-4" />
              <span>Maxed</span>
            </span>
          </div>

          <!-- Progress bar -->
          <div class="word-nav-progress-track">
            <div class="h-2 bg-green-500 transition-all duration-700 ease-out" :style="{ width: masteryPercent + '%' }" />
          </div>
        </div>
        <div v-else class="word-nav-progress-spacer" aria-hidden="true" />

        <NuxtLink v-if="nextWord" :to="`/level/${level}/word/${nextWord.id}`" class="edge-arrow" aria-label="Next word">
          <span class="edge-arrow-burst" aria-hidden="true"></span>
          <ChevronRight class="h-12 w-12" />
        </NuxtLink>
        <div v-else class="edge-arrow-placeholder" aria-hidden="true" />
      </div>

      <div v-if="showPracticeButtons || showAudioButtons" class="main-actions-row">

        <NuxtLink v-if="showPracticeButtons" :to="`/writing/${level}/vocab/${word.id}`" class="action-chip action-chip-write main-action-btn"
          aria-label="Practice writing this word">
          <PencilLine class="mobile-action-icon h-4 w-4" />
          <span class="mobile-action-label">Write</span>
        </NuxtLink>

        <NuxtLink v-if="showPracticeButtons" :to="`/echo-forest/${word.id}`" class="action-chip action-chip-tone-forge main-action-btn"
          aria-label="Open tone checker for this word">
          <Mic class="mobile-action-icon h-4 w-4" />
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
        <summary class="usage-summary text-gray-900" aria-label="Usage notes" title="Usage notes">
          <EyeOff class="usage-icon usage-icon-closed h-4 w-4" aria-hidden="true" />
          <Eye class="usage-icon usage-icon-open h-4 w-4" aria-hidden="true" />
          <span>Usage</span>
        </summary>

        <ul class="usage-list space-y-2 text-gray-700">
          <li v-for="note in word.usage" :key="note" class="usage-list-item">
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

      <ul class="space-y-5">
        <li v-if="currentExample" :key="`${word.id}-${currentExampleIndex}`" class="example-card rounded-lg p-4">
          <div class="space-y-3">
            <div v-if="showPracticeButtons || showAudioButtons" class="flex justify-end">
              <div class="example-actions-row">
                <NuxtLink v-if="showPracticeButtons" :to="`/writing/${level}/sentences/${word.id}/${currentExampleIndex}`"
                  class="action-chip action-chip-sm action-chip-write example-action-btn"
                  aria-label="Practice writing this sentence">
                  <PencilLine class="mobile-action-icon h-3.5 w-3.5" />
                  <span class="mobile-action-label">Write</span>
                </NuxtLink>

                <NuxtLink v-if="showPracticeButtons"
                  :to="`/echo-lab/pronunciation-check/level/${level}/sentences/${word.id}/v2/${currentExampleIndex}`"
                  class="action-chip action-chip-sm action-chip-speak example-action-btn"
                  aria-label="Practice pronunciation for this sentence">
                  <Mic class="mobile-action-icon h-3.5 w-3.5" />
                  <span class="mobile-action-label">Speak</span>
                </NuxtLink>

                <AudioButton v-if="showAudioButtons && word.audio?.examples?.[currentExampleIndex]"
                  :key="`example-audio-${selectedAudioVoice}-${word.id}-${currentExampleIndex}`"
                  :src="getAudioSrc(word.audio.examples[currentExampleIndex])" :playback-rate="playbackRate" size="sm"
                  class="tone-gate-play-btn example-action-btn" />

              </div>
            </div>

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
          @click="showPrevExample">
          <ChevronLeft class="h-7 w-7" />
        </button>
        <div class="example-dots" aria-label="Example position indicator">
          <span v-for="dotIndex in totalExamples" :key="dotIndex" class="example-dot"
            :class="{ 'example-dot-active': dotIndex - 1 === currentExampleIndex }" />
        </div>
        <button class="example-nav-arrow" type="button" aria-label="Next example" @click="showNextExample">
          <ChevronRight class="h-7 w-7" />
        </button>
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

  <div v-else-if="notFound" class="max-w-xl mx-auto px-4 py-24 text-center text-gray-600">
    Word not found
  </div>
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  color: #111827;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.75rem;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 0.2em;
  transition: color 0.2s ease, text-decoration-color 0.2s ease;
}

.usage-summary:hover {
  color: #374151;
  text-decoration-color: currentColor;
}

.usage-icon-open {
  display: none;
}

.usage-details[open] .usage-icon-closed {
  display: none;
}

.usage-details[open] .usage-icon-open {
  display: block;
}

.usage-summary::-webkit-details-marker {
  display: none;
}

.usage-summary::marker {
  content: "";
}

.usage-list {
  list-style: disc;
  margin: 0.85rem 0 0;
  padding-left: 1.25rem;
}

.usage-list-item {
  display: list-item;
}

.usage-list-item::marker {
  color: #111827;
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
  min-height: 2rem;
  padding: 0.3rem 0.55rem !important;
}

.word-nav-row {
  display: grid;
  grid-template-columns: 3.5rem minmax(8rem, 20rem) 3.5rem;
  align-items: center;
  justify-content: center;
  gap: clamp(0.75rem, 4vw, 2rem);
  width: 100%;
  padding-top: 0.5rem;
}

.word-nav-progress {
  display: flex;
  min-width: 0;
  width: 100%;
  flex-direction: column;
  gap: 0.45rem;
}

.word-nav-progress-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  line-height: 1.2;
}

.word-nav-progress-track {
  height: 0.5rem;
  width: 100%;
  overflow: hidden;
  border-radius: 999px;
  background: #d1d5db;
}

.word-nav-progress-spacer {
  min-height: 2rem;
}

.edge-arrow-placeholder {
  width: 3.5rem;
  height: 3.5rem;
}

.edge-arrow {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  line-height: 1;
  color: #4b5563;
  transition: color 0.2s ease, transform 0.2s ease;
}

.edge-arrow svg {
  position: relative;
  z-index: 1;
}

.edge-arrow:hover,
.edge-arrow:focus-visible {
  color: #2563eb;
  transform: scale(1.04);
}

.edge-arrow:hover .edge-arrow-burst,
.edge-arrow:focus-visible .edge-arrow-burst {
  animation: edgeArrowBurst 650ms ease-out both;
}

.edge-arrow-burst {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.28rem;
  height: 0.28rem;
  border-radius: 999px;
  background: transparent;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.35);
  z-index: -1;
  box-shadow:
    -0.18rem -1.42rem 0 -0.03rem rgba(37, 99, 235, 0.95),
    0.58rem -1.18rem 0 -0.08rem rgba(29, 78, 216, 0.9),
    1.42rem -0.36rem 0 -0.05rem rgba(59, 130, 246, 0.92),
    1.28rem 0.84rem 0 -0.08rem rgba(30, 64, 175, 0.86),
    0.24rem 1.44rem 0 -0.04rem rgba(37, 99, 235, 0.92),
    -0.72rem 1.1rem 0 -0.08rem rgba(59, 130, 246, 0.9),
    -1.44rem 0.42rem 0 -0.05rem rgba(29, 78, 216, 0.9),
    -1.08rem -0.82rem 0 -0.1rem rgba(37, 99, 235, 0.86);
  pointer-events: none;
}

.edge-arrow-burst::before,
.edge-arrow-burst::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  background: transparent;
  transform: translate(-50%, -50%);
}

.edge-arrow-burst::before {
  width: 0.2rem;
  height: 0.2rem;
  box-shadow:
    0.22rem -1.72rem 0 -0.04rem rgba(30, 64, 175, 0.84),
    1.52rem -0.96rem 0 -0.03rem rgba(37, 99, 235, 0.9),
    1.72rem 0.24rem 0 -0.06rem rgba(59, 130, 246, 0.86),
    0.78rem 1.58rem 0 -0.04rem rgba(29, 78, 216, 0.86),
    -0.32rem 1.78rem 0 -0.06rem rgba(37, 99, 235, 0.88),
    -1.56rem 0.92rem 0 -0.03rem rgba(30, 64, 175, 0.82),
    -1.72rem -0.28rem 0 -0.06rem rgba(59, 130, 246, 0.86),
    -0.84rem -1.44rem 0 -0.05rem rgba(29, 78, 216, 0.86);
}

.edge-arrow-burst::after {
  width: 0.16rem;
  height: 0.16rem;
  background: transparent;
  box-shadow:
    0.96rem -1.68rem 0 -0.03rem rgba(59, 130, 246, 0.78),
    1.9rem -0.08rem 0 -0.04rem rgba(30, 64, 175, 0.84),
    1.22rem 1.22rem 0 -0.03rem rgba(37, 99, 235, 0.86),
    -0.04rem 2.02rem 0 -0.05rem rgba(59, 130, 246, 0.8),
    -1.18rem 1.42rem 0 -0.04rem rgba(29, 78, 216, 0.84),
    -1.92rem 0.04rem 0 -0.03rem rgba(37, 99, 235, 0.82),
    -1.34rem -1.16rem 0 -0.04rem rgba(59, 130, 246, 0.8),
    0.04rem -1.98rem 0 -0.05rem rgba(30, 64, 175, 0.82);
}

@keyframes edgeArrowBurst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2);
  }

  35% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.12);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.45);
  }
}

@media (max-width: 640px) {
  .word-nav-row {
    grid-template-columns: 2.75rem minmax(0, 1fr) 2.75rem;
    gap: 0.5rem;
    padding-top: 0.25rem;
  }

  .word-nav-progress {
    gap: 0.35rem;
  }

  .word-nav-progress-label {
    gap: 0.35rem;
    font-size: 0.75rem;
  }

  .edge-arrow-placeholder {
    width: 2.75rem;
    height: 2.75rem;
  }

  .edge-arrow svg {
    width: 2.75rem;
    height: 2.75rem;
  }

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
}
</style>
