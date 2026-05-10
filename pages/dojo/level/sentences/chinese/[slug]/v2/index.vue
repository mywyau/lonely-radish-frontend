<script setup lang="ts">

definePageMeta({
  ssr: false,
})

import { computed, nextTick, ref, watch, type Ref } from 'vue'

import {
  playCorrectJingle,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong,
} from '@/utils/sounds'

import { masteryXp } from '@/config/xp/helpers'
import { chineseSentenceXp, chineseSentenceXpHintUsed } from '~/config/dojo/xp_config'
import { levelTitles } from '~/utils/levels/levels'

type TrainSentence = {
  sentenceId: string
  sentence: string
  jyutping: string
  meaning: string
  sourceWordId: string
  sourceWord: string
}

type SentenceBatchAttempt = {
  sentenceId: string
  sourceWordId: string
  passed: boolean
  hintUsed: boolean
}

type SentenceDojoStartResponse = {
  sessionKey: string
  session: {
    mode: string
    level: string
    title: string
    totalSentences: number
    sentences: TrainSentence[]
  }
  progress: Record<string, { xp: number }>
}

type SentenceDojoFinalizeResponse = {
  session: {
    correctCount: number
    totalSentences: number
    xpEarned: number
  }
  queued?: boolean
  deduped?: boolean
}

const route = useRoute()
const slug = computed(() => route.params.slug as string)
const { isLoggedIn } = useMeStateV2()
const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

type AudioVoice = 'male' | 'female'
const selectedVoice = useCookie<AudioVoice>('audio-voice', {
  default: () => 'male',
})
const audioDirectory = computed(() => selectedVoice.value === 'female' ? 'audio-female' : 'audio-male')
const currentAudioSrc = computed(() => {
  if (!current.value?.sentenceId) return ''
  return `${cdnBase}/${audioDirectory.value}/${current.value.sentenceId}.mp3`
})

function setVoice(voice: AudioVoice) {
  selectedVoice.value = voice
}

const auth = await useAuth()

async function authedFetch<T>(
  url: string,
  options: Parameters<typeof $fetch<T>>[1] = {}
) {
  const token = await auth.getAccessToken()

  return $fetch<T>(url, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })
}

function publicFetch<T>(
  url: string,
  options: Parameters<typeof $fetch<T>>[1] = {}
) {
  return $fetch<T>(url, options)
}

const {
  data,
  error,
  refresh,
  pending,
} = await useAsyncData(
  () => `sentence-dojo-start-${slug.value}`,
  () =>
    (isLoggedIn.value ? authedFetch : publicFetch)<SentenceDojoStartResponse>(
      // '/api/typing/sentences/v2/start',
      '/api/typing/sentences/v2/start-v2',
      {
        query: {
          scope: 'level',
          slug: slug.value,
          variant: 'chinese',
        },
      }),
  {
    watch: [slug],
    server: false,
  }
)

const activeSessionKey = ref('')
const title = ref('Sentence Dojo')

const quizStartedAt = ref<number | null>(null)
const elapsedMs = ref(0)
const frozenElapsedMs = ref<number | null>(null)

let timerInterval: ReturnType<typeof setInterval> | null = null

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function startTimer() {
  stopTimer()
  quizStartedAt.value = Date.now()
  elapsedMs.value = 0
  frozenElapsedMs.value = null

  timerInterval = setInterval(() => {
    if (quizStartedAt.value !== null) {
      elapsedMs.value = Date.now() - quizStartedAt.value
    }
  }, 250)
}

function freezeTimer() {
  if (quizStartedAt.value === null) return

  const finalMs = Date.now() - quizStartedAt.value
  elapsedMs.value = finalMs
  frozenElapsedMs.value = finalMs
  stopTimer()
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const displayedElapsedMs = computed(() => {
  return frozenElapsedMs.value ?? elapsedMs.value
})

const formattedElapsedTime = computed(() => {
  return formatDuration(displayedElapsedMs.value)
})

const sentences = ref<TrainSentence[]>([])
const wordProgressMap = ref<Record<string, { xp: number }>>({})

const idx = ref(0)
const input = ref('')
const showHint = ref(false)
const hintUsedThisQuestion = ref(false)

const batchAttempts = ref<SentenceBatchAttempt[]>([])

const finishing = ref(false)
const finalizeError = ref<string | null>(null)
const MIN_CALCULATING_MS = 1400

const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)

const inputRef = ref<HTMLTextAreaElement | null>(null)

const animatedCompletedWords = ref(0)
const animatedXpEarned = ref(0)
const completionAnimated = ref(false)
const completionSoundPlayed = ref(false)

const sessionResult = ref<{
  correctCount: number
  totalSentences: number
  xpEarned: number
  guestPreview?: boolean
} | null>(null)

const copied = ref(false)

const current = computed(() => sentences.value[idx.value] ?? null)
const isComplete = computed(() => idx.value >= sentences.value.length)

const completedWordsCount = computed(() =>
  sessionResult.value?.correctCount ?? 0
)

const totalWordsCount = computed(() =>
  sessionResult.value?.totalSentences ?? sentences.value.length
)

const exerciseProgressPercent = computed(() => {
  if (!sentences.value.length) return 0
  return Math.min((idx.value / sentences.value.length) * 100, 100)
})

const hintsUsedCount = computed(() =>
  batchAttempts.value.filter(a => a.hintUsed).length
)

const hintFreeCount = computed(() =>
  Math.max(0, completedWordsCount.value - hintsUsedCount.value)
)

const hintUsageRatio = computed(() => {
  if (!completedWordsCount.value) return 0
  return hintsUsedCount.value / completedWordsCount.value
})

const showTraining = computed(() =>
  !pending.value &&
  !error.value &&
  !finishing.value &&
  !sessionResult.value &&
  !showFinalizeError.value
)

const showCalculating = computed(() => finishing.value)

const showResults = computed(() =>
  !pending.value &&
  !error.value &&
  !finishing.value &&
  !!sessionResult.value
)

const showFinalizeError = computed(() =>
  !pending.value &&
  !error.value &&
  !finishing.value &&
  !sessionResult.value &&
  isComplete.value &&
  !!finalizeError.value
)

const resultHeroClass = computed(() => {
  if (hintsUsedCount.value === 0) return 'result-3'
  if (hintUsageRatio.value <= 0.25) return 'result-0'
  if (hintUsageRatio.value <= 0.6) return 'result-2'
  return 'result-1'
})

const resultMeta = computed(() => {
  if (hintsUsedCount.value === 0) {
    return { title: 'Excellent work' }
  }

  if (hintUsageRatio.value <= 0.25) {
    return { title: 'Great job' }
  }

  if (hintUsageRatio.value <= 0.6) {
    return { title: 'Nice progress' }
  }

  return { title: 'Keep practicing' }
})

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function animateCount(target: Ref<number>, end: number, duration = 1000) {
  const start = target.value
  const diff = end - start
  const startTime = performance.now()

  const tick = (now: number) => {
    const progress = Math.min((now - startTime) / duration, 1)
    target.value = Math.round(start + diff * progress)

    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}

function resetCompletionAnimations() {
  animatedCompletedWords.value = 0
  animatedXpEarned.value = 0
  completionAnimated.value = false
  completionSoundPlayed.value = false
}

function normalizeChineseSentence(value: string) {
  return (value || '')
    .replace(/[，。！？、,.!?；：'"“”‘’（）()\[\]\s]/g, '')
    .trim()
}

const normalizedInput = computed(() =>
  normalizeChineseSentence(input.value)
)

const normalizedAnswer = computed(() =>
  normalizeChineseSentence(current.value?.sentence ?? '')
)

const live = computed(() => {
  if (!current.value) return { state: 'idle' as const }

  const u = normalizedInput.value
  const a = normalizedAnswer.value

  if (!u) return { state: 'idle' as const }
  if (u === a) return { state: 'perfect' as const }
  if (a.startsWith(u)) return { state: 'partial' as const }

  return { state: 'miss' as const }
})

function applyStartPayload(payload: SentenceDojoStartResponse) {
  stopTimer()

  activeSessionKey.value = payload.sessionKey
  title.value = payload.session.title ?? `Sentence Dojo - ${levelTitles[slug.value]}`

  sentences.value = payload.session.sentences ?? []
  wordProgressMap.value = payload.progress ?? {}

  idx.value = 0
  input.value = ''
  showHint.value = false
  hintUsedThisQuestion.value = false
  batchAttempts.value = []
  sessionResult.value = null
  finishing.value = false
  finalizeError.value = null
  xpDelta.value = null
  copied.value = false
  elapsedMs.value = 0
  frozenElapsedMs.value = null
  quizStartedAt.value = null
  resetCompletionAnimations()

  const firstId = sentences.value[0]?.sourceWordId
  currentXp.value = firstId ? (wordProgressMap.value[firstId]?.xp ?? 0) : 0

  if (sentences.value.length > 0) {
    startTimer()
  }

  nextTick(() => {
    inputRef.value?.focus()
  })
}

async function restartSession() {
  finalizeError.value = null
  sessionResult.value = null
  await refresh()
}

async function finalizeBatch() {
  if (finishing.value) return
  if (!isLoggedIn.value) {
    sessionResult.value = {
      correctCount: batchAttempts.value.length,
      totalSentences: sentences.value.length,
      xpEarned: 0,
      guestPreview: true,
    }
    idx.value = sentences.value.length
    return
  }
  if (!activeSessionKey.value) return

  finishing.value = true
  finalizeError.value = null

  try {
    const [res] = await Promise.all([
      authedFetch<SentenceDojoFinalizeResponse>('/api/typing/sentences/v2/finalize', {
        method: 'POST',
        body: {
          sessionKey: activeSessionKey.value,
          attempts: batchAttempts.value,
        },
      }),
      sleep(MIN_CALCULATING_MS),
    ])

    sessionResult.value = res.session
    idx.value = sentences.value.length

    console.info('Sentence dojo finalized', {
      sessionKey: activeSessionKey.value,
      queued: res.queued,
      deduped: res.deduped,
    })
  } catch (err) {
    console.error('Sentence dojo finalize failed', err)
    finalizeError.value = 'Failed to save your session.'
  } finally {
    finishing.value = false
  }
}

async function copyJyutping() {
  if (!current.value?.jyutping) return

  try {
    await navigator.clipboard.writeText(current.value.jyutping)
    copied.value = true

    setTimeout(() => {
      copied.value = false
    }, 1200)
  } catch (err) {
    console.error('Clipboard failed:', err)
  }
}

let advancing = false

function advance() {
  if (isComplete.value) return

  if (idx.value < sentences.value.length - 1) {
    idx.value++
    input.value = ''
    hintUsedThisQuestion.value = false
    showHint.value = false

    nextTick(() => {
      inputRef.value?.focus()
    })
  }
}

watch(
  () => data.value,
  (value) => {
    if (!value) return
    applyStartPayload(value)
  },
  { immediate: true }
)

watch(
  () => current.value?.sourceWordId,
  (id) => {
    if (!id) return
    currentXp.value = wordProgressMap.value[id]?.xp ?? 0
    xpDelta.value = null
  },
  { immediate: true }
)

watch(
  () => live.value.state,
  async (state) => {
    if (state !== 'perfect') return
    if (advancing) return
    if (!current.value) return

    advancing = true

    if (!batchAttempts.value.some(a => a.sentenceId === current.value!.sentenceId)) {
      const hintWasUsed = hintUsedThisQuestion.value
      const delta = hintWasUsed ? chineseSentenceXpHintUsed : chineseSentenceXp

      xpDelta.value = delta
      currentXp.value = Math.min((currentXp.value ?? 0) + delta, masteryXp)

      batchAttempts.value.push({
        sentenceId: current.value.sentenceId,
        sourceWordId: current.value.sourceWordId,
        passed: true,
        hintUsed: hintWasUsed,
      })

      setTimeout(() => {
        xpDelta.value = null
      }, 1000)
    }

    playCorrectJingle(0.7)
    await new Promise(r => setTimeout(r, 600))

    if (batchAttempts.value.length >= sentences.value.length) {
      freezeTimer()
      await finalizeBatch()
      advancing = false
      return
    }

    advance()
    advancing = false
  }
)

watch(
  () => showResults.value,
  (visible) => {
    if (!visible || !sessionResult.value) return

    if (!completionAnimated.value) {
      completionAnimated.value = true
      animateCount(animatedCompletedWords, completedWordsCount.value, 900)
      animateCount(animatedXpEarned, sessionResult.value.xpEarned, 1000)
    }

    if (!completionSoundPlayed.value) {
      completionSoundPlayed.value = true

      if (hintsUsedCount.value === 0) {
        playQuizCompleteFanfareSong()
      } else {
        playQuizCompleteOkaySong()
      }
    }
  }
)

watch(
  () => slug.value,
  () => {
    stopTimer()
    activeSessionKey.value = ''
    title.value = 'Sentence Dojo'
    sentences.value = []
    wordProgressMap.value = {}
    idx.value = 0
    input.value = ''
    showHint.value = false
    hintUsedThisQuestion.value = false
    batchAttempts.value = []
    sessionResult.value = null
    finishing.value = false
    finalizeError.value = null
    xpDelta.value = null
    currentXp.value = 0
    copied.value = false
    elapsedMs.value = 0
    frozenElapsedMs.value = null
    quizStartedAt.value = null
    resetCompletionAnimations()
  }
)

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<template>
  <main class="dojo-training-page mx-auto max-w-2xl px-6 py-12">

    <!-- <BackLink /> -->

    <header class="dojo-training-header space-y-4">
      <TypewriterTitleBlock :heading-text="title || `Sentence Dojo - ${levelTitles[slug]}`"
        subheading-text="Read the Chinese and type the full sentence in Chinese."
        heading-class="text-2xl font-semibold tracking-tight text-gray-900" subheading-class="text-sm text-gray-600" />
    </header>

    <section :class="[
      'mt-8',
      showCalculating || showResults || showFinalizeError
        ? 'bg-transparent shadow-none p-0'
        : 'rounded-2xl bg-white p-5 shadow-sm'
    ]">
      <div v-if="pending" class="text-sm text-gray-600">
        Loading training sentences…
      </div>

      <div v-else-if="error" class="space-y-4">
        <p class="text-sm text-red-700">
          Failed to load sentence dojo session.
        </p>

        <button class="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          type="button" @click="restartSession">
          Retry
        </button>
      </div>

      <div v-else class="space-y-5">
        <div v-if="showTraining" class="space-y-5">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="w-full sm:w-auto">
              <div class="text-xs text-black">
                Sentence {{ idx + 1 }} / {{ sentences.length }}
              </div>

              <div class="mt-2 h-1.5 w-full min-w-[180px] overflow-hidden rounded-full bg-gray-200/80">
                <div class="dojo-mini-progress h-full rounded-full transition-all duration-300"
                  :style="{ width: `${exerciseProgressPercent}%` }" />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <div class="inline-flex items-center rounded-full border border-gray-200 bg-white p-0.5 text-xs">
                <button type="button" class="rounded-full px-2 py-1 transition" :class="selectedVoice === 'male'
                  ? 'bg-blue-100 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'" @click="setVoice('male')">
                  Male
                </button>
                <button type="button" class="rounded-full px-2 py-1 transition" :class="selectedVoice === 'female'
                  ? 'bg-pink-100 text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'" @click="setVoice('female')">
                  Female
                </button>
              </div>
              <AudioButton :key="`audio-${selectedVoice}-${current?.sentenceId}`" :src="currentAudioSrc" />
              <span class="rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-gray-700">
                {{ formattedElapsedTime }}
              </span>
            </div>
          </div>

          <div class="rounded-2xl bg-gray-50 p-5 space-y-5">
            <div class="space-y-2">
              <div class="text-xs uppercase tracking-wide text-gray-500">
                Sentence
              </div>

              <div class="text-2xl font-medium text-gray-900 leading-relaxed no-copy" @copy.prevent @cut.prevent
                @contextmenu.prevent @dragstart.prevent @selectstart.prevent>
                {{ current?.sentence }}
              </div>

              <div class="text-sm text-gray-400 leading-relaxed">
                {{ current?.meaning }}
              </div>
            </div>

            <div class="mt-4 min-h-[36px]">
              <button type="button" @click="() => {
                showHint = !showHint
                if (showHint) hintUsedThisQuestion = true
              }" class="text-xs text-gray-500 hover:text-gray-700 transition underline">
                {{ showHint ? 'Hide Jyutping' : 'Show Jyutping (hint)' }}
              </button>

              <transition name="fade-word">
                <div v-if="showHint" class="mt-2">
                  <div class="text-base font-mono break-all leading-relaxed text-gray-500">
                    {{ current?.jyutping }}
                  </div>

                  <button type="button" @click="copyJyutping"
                    class="mt-2 bg-white text-xs px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-100 transition">
                    {{ copied ? '✓' : 'copy' }}
                  </button>
                </div>
              </transition>
            </div>

            <div class="space-y-2 mt-2">
              <div class="text-sm text-gray-500">
                Target word:
                <span class="font-medium text-gray-700">{{ current?.sourceWord }}</span>
              </div>

              <div class="flex items-center max-w-xs">
                <div class="w-28 mr-2">
                  <div class="h-[3px] bg-gray-200 rounded">
                    <div class="h-[3px] bg-green-500 rounded transition-all duration-500"
                      :style="{ width: Math.min((currentXp ?? 0) / masteryXp * 100, 100) + '%' }" />
                  </div>
                </div>

                <div class="relative flex items-center">
                  <span class="text-sm text-gray-600 whitespace-nowrap">
                    {{ currentXp ?? 0 }} / {{ masteryXp }} XP
                  </span>

                  <transition name="xp-fall">
                    <span v-if="xpDelta !== null"
                      class="absolute left-full ml-2 text-sm font-semibold pointer-events-none"
                      :class="xpDelta > 0 ? 'text-green-600' : 'text-red-600'">
                      {{ xpDelta > 0 ? '+' + xpDelta : xpDelta }}
                    </span>
                  </transition>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <label class="block text-sm font-medium text-gray-800">
                Type the Chinese sentence:
              </label>

              <textarea ref="inputRef" v-model="input" rows="3" autocomplete="off"
                class="w-full rounded-2xl border-2 border-gray-300 px-4 py-4 text-xl font-mono tracking-wide outline-none focus:border-black transition resize-none" />

              <div class="pt-2 text-xs text-gray-500">
                Spaces and punctuation are ignored for matching.
              </div>
            </div>
          </div>
        </div>

        <transition name="fade-scale" mode="out-in">
          <div v-if="showCalculating" key="calculating" class="stat-card hero-card result-2 space-y-4">
            <div class="spinner mx-auto" />

            <p class="stat-label">
              Calculating
            </p>

            <h2 class="hero-title">
              Saving your session...
            </h2>

            <p class="hero-subtext">
              Updating your XP and preparing your results
            </p>
          </div>

          <div v-else-if="showFinalizeError" key="finalize-error" class="stat-card hero-card result-1 space-y-4">
            <p class="stat-label">
              Save Failed
            </p>

            <h2 class="hero-title">
              Could not finish session
            </h2>

            <p class="hero-subtext">
              {{ finalizeError }}
            </p>

            <button
              class="block w-full rounded-xl text-black py-3 text-center font-medium hover:brightness-110 transition"
              style="background-color:#A8CAE0;" @click="finalizeBatch">
              Retry Saving Session
            </button>
          </div>

          <div v-else-if="showResults" key="results" class="space-y-6">
            <div class="stat-card hero-card" :class="resultHeroClass">
              <p class="stat-label">
                Session Complete
              </p>

              <h2 class="hero-title">
                {{ resultMeta.title }}
              </h2>

              <p class="hero-subtext">
                {{ completedWordsCount }} / {{ totalWordsCount }} sentences completed
              </p>
            </div>

            <QuizCompletionFlipStats correct-label="Hint-Free" incorrect-label="Hints Used" :correct="hintFreeCount"
              :incorrect="hintsUsedCount" :time="formattedElapsedTime" :xp-earned="animatedXpEarned" />

            <div class="pt-2 space-y-3">
              <button
                class="block w-full rounded-xl text-black py-3 text-center font-medium hover:brightness-110 transition"
                style="background-color:#A8CAE0;" @click="restartSession">
                Play again
              </button>

              <NuxtLink to="/dojo/level/"
                class="block w-full rounded-xl text-gray-900 py-3 text-center font-medium hover:brightness-110 transition"
                style="background-color:rgba(244,205,39,0.35);">
                Back to Level Dojo
              </NuxtLink>
            </div>
          </div>
        </transition>
      </div>
    </section>
  </main>
</template>

<style scoped>
.dojo-training-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: rgba(244, 205, 39, 0.35);
  --blush: #F6E1E1;
  min-height: 70vh;
}

.dojo-training-header h1 {
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.dojo-training-header p {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-size: 0.72rem;
}

.xp-fall-enter-active {
  transition: transform 0.45s ease-out, opacity 0.45s ease-out;
}

.xp-fall-leave-active {
  transition: transform 0.35s ease-in, opacity 0.35s ease-in;
}

.xp-fall-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.9);
}

.xp-fall-enter-to {
  opacity: 1;
  transform: translateY(0px) scale(0.95);
}

.xp-fall-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.9);
}

.fade-word-enter-active,
.fade-word-leave-active {
  transition: opacity 0.15s ease;
}

.fade-word-enter-from,
.fade-word-leave-to {
  opacity: 0;
}

.stat-card {
  border-radius: 22px;
  padding: 1.5rem;
  text-align: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 700;
  margin-top: 0.75rem;
  color: #111827;
}

.result-0 {
  background: rgba(168, 202, 224, 0.45);
}

.result-1 {
  background: rgba(246, 225, 225, 0.75);
}

.result-2 {
  background: rgba(244, 205, 39, 0.35);
}

.result-3 {
  background: rgba(168, 224, 182, 0.45);
}

.hero-card {
  padding: 2rem 1.5rem;
}

.hero-title {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 0.35rem;
  color: #111827;
}

.hero-score {
  font-size: 3rem;
  line-height: 1;
  font-weight: 600;
  margin-top: 0.9rem;
  color: #111827;
}

.hero-subtext {
  margin-top: 0.65rem;
  font-size: 0.95rem;
  color: rgba(17, 24, 39, 0.68);
}

.dojo-mini-progress {
  background: linear-gradient(90deg, #f5b7b1 0%, #f8d58f 45%, #9fd6bf 100%);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(0.98);
}

.spinner {
  width: 52px;
  height: 52px;
  border-radius: 9999px;
  border: 4px solid rgba(17, 24, 39, 0.12);
  border-top-color: rgba(17, 24, 39, 0.75);
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.no-copy {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-touch-callout: none;
}
</style>
