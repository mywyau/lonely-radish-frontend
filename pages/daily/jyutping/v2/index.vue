<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: ['logged-in'],
  // middleware: ['coming-soon'],
})

import {
  playCorrectJingle,
  playIncorrectJingle,
  playQuizCompleteFailSong,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong,
} from '@/utils/sounds'
import { Volume2 } from '@lucide/vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCountdownToUtcMidnight } from '~/composables/daily/useCountdownToUtcMidnight'
import { shuffleFisherYates } from '~/utils/shuffle'

import type {
  AttemptLog,
  DailyDecode,
  DailyStartResponse,
  EligibilityResponse,
  QuizState,
  SessionAnswer
} from '~/types/daily/jyutping/types'

const { getAccessToken } = await useAuth()
const { timeRemaining } = useCountdownToUtcMidnight()

const tips = [
  'No need to be perfect first try. Feel out the word',
  'Tones are not marked.',
  'Focus on the shape of the sound.',
  'Break the word into syllables.',
  'Try saying it out loud before typing.'
]

const MIN_WORDS_REQUIRED = 100
const MAX_ATTEMPTS = 6
const DAILY_MODE = 'daily-jyutping'
const TOTAL_QUESTIONS = 5

const state = ref<QuizState>('loading')
const errorMessage = ref('')

const currentTipIndex = ref(0)
let tipInterval: number | undefined

const challenge = ref<DailyDecode | null>(null)
const wordIds = ref<string[]>([])
const currentIndex = ref(0)

const input = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

const attempts = ref<AttemptLog[]>([])
const sessionAnswers = ref<SessionAnswer[]>([])

const solved = ref(false)
const showNext = ref(false)
const seenWords = ref(0)

const xpEarned = ref(0)
const correctCount = ref(0)
const totalQuestions = ref(0)

const animatedAccuracy = ref(0)
const animatedXpEarned = ref(0)
const completionAnimated = ref(false)

const syncPending = ref(false)
const quizStartedAt = ref<number | null>(null)
const elapsedMs = ref(0)
const frozenElapsedMs = ref<number | null>(null)

let timerInterval: ReturnType<typeof setInterval> | null = null

const audio = ref<HTMLAudioElement | null>(null)

const canPlayQuiz = computed(() => seenWords.value >= MIN_WORDS_REQUIRED)

const wordsRemaining = computed(() =>
  Math.max(0, MIN_WORDS_REQUIRED - seenWords.value)
)

const attemptsLeft = computed(() =>
  Math.max(0, MAX_ATTEMPTS - attempts.value.length)
)

const failed = computed(() =>
  !solved.value && attemptsLeft.value === 0
)

const lastAttempt = computed(
  () => attempts.value[attempts.value.length - 1] || null
)

const totalLetters = computed(() => {
  if (!challenge.value) return 0
  return baseSound(challenge.value.jyutping).length
})

const answerLetters = computed(() => {
  if (!challenge.value) return []
  return baseSound(challenge.value.jyutping).split('')
})

const incorrectCount = computed(() =>
  Math.max(0, totalQuestions.value - correctCount.value)
)

const accuracy = computed(() => {
  if (!totalQuestions.value) return 0
  return Math.round((correctCount.value / totalQuestions.value) * 100)
})

const resultHeroClass = computed(() => {
  if (accuracy.value >= 80) return 'result-3'
  if (accuracy.value >= 60) return 'result-0'
  if (accuracy.value >= 40) return 'result-2'
  return 'result-1'
})

const resultMeta = computed(() => {
  if (accuracy.value === 100) return { title: 'Perfect' }
  if (accuracy.value >= 70) return { title: 'Great job' }
  if (accuracy.value >= 50) return { title: 'Nice try' }
  return { title: 'Keep practicing' }
})

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

function resetTimer() {
  stopTimer()
  quizStartedAt.value = null
  elapsedMs.value = 0
  frozenElapsedMs.value = null
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const displayedElapsedMs = computed(() => frozenElapsedMs.value ?? elapsedMs.value)

const formattedElapsedTime = computed(() => {
  if (quizStartedAt.value === null && frozenElapsedMs.value === null) {
    return '--'
  }

  return formatDuration(displayedElapsedMs.value)
})

const revealedLetters = computed(() => {
  if (!challenge.value) return []

  const answer = baseSound(challenge.value.jyutping).split('')

  if (solved.value || attemptsLeft.value === 0) {
    return answer
  }

  const revealed = Array(answer.length).fill(null)

  for (const attempt of attempts.value) {
    if (!attempt.letters || !attempt.letterStates) continue

    attempt.letters.forEach((letter, i) => {
      if (attempt.letterStates?.[i] === 'correct') {
        revealed[i] = letter
      }
    })
  }

  return revealed
})

onMounted(() => {
  startChallenge()

  tipInterval = window.setInterval(() => {
    currentTipIndex.value =
      (currentTipIndex.value + 1) % tips.length
  }, 5000)
})

onUnmounted(() => {
  if (tipInterval) clearInterval(tipInterval)
  stopTimer()

  if (audio.value) {
    audio.value.pause()
    audio.value = null
  }
})

function normalizeJyutping(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[，。,.;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/-/g, ' ')
}

function baseSound(jp: string): string {
  return normalizeJyutping(jp)
    .replace(/[1-6]/g, '')
    .replace(/\s+/g, '')
}

function scoreAttempt(userRaw: string, answerRaw: string) {
  const user = normalizeJyutping(userRaw)
  const ans = normalizeJyutping(answerRaw)

  if (!user) {
    return {
      passed: false,
      perfect: false,
      message: 'Type the jyutping.'
    }
  }

  const userBase = baseSound(user)
  const ansBase = baseSound(ans)

  const userNoSpace = user.replace(/\s+/g, '')
  const ansNoSpace = ans.replace(/\s+/g, '')

  const baseMatch = userBase === ansBase
  const toneMatch = userNoSpace === ansNoSpace

  if (!baseMatch) {
    return {
      passed: false,
      perfect: false,
      message: 'Try again.'
    }
  }

  if (toneMatch) {
    return {
      passed: true,
      perfect: true,
      message: 'Perfect!'
    }
  }

  return {
    passed: true,
    perfect: false,
    message: 'Well done!'
  }
}

function scoreLetters(userRaw: string, answerRaw: string) {
  const userBase = baseSound(userRaw)
  const answerBase = baseSound(answerRaw)

  const letters = userBase.split('')
  const states: ('correct' | 'wrong')[] = []

  for (let i = 0; i < letters.length; i++) {
    if (letters[i] === answerBase[i]) {
      states.push('correct')
    } else {
      states.push('wrong')
    }
  }

  return {
    letters,
    states
  }
}

function resetRoundState() {
  input.value = ''
  attempts.value = []
  solved.value = false
  showNext.value = false
}

function resetRunState() {
  challenge.value = null
  wordIds.value = []
  currentIndex.value = 0
  sessionAnswers.value = []
  xpEarned.value = 0
  correctCount.value = 0
  totalQuestions.value = 0
  syncPending.value = false
  resetTimer()
  resetRoundState()
}

function resetCompletionAnimations() {
  animatedAccuracy.value = 0
  animatedXpEarned.value = 0
  completionAnimated.value = false
}

function animateCount(target: { value: number }, end: number, duration = 1200) {
  const start = target.value
  const startTime = performance.now()

  function tick(now: number) {
    const progress = Math.min((now - startTime) / duration, 1)
    target.value = Math.round(start + (end - start) * progress)

    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }

  requestAnimationFrame(tick)
}

function playCompletionSound() {
  if (totalQuestions.value <= 0) return

  const percent = (correctCount.value / totalQuestions.value) * 100

  if (percent >= 90) {
    playQuizCompleteFanfareSong()
  } else if (percent >= 50) {
    playQuizCompleteOkaySong()
  } else {
    playQuizCompleteFailSong()
  }
}

const unlockProgressPercent = computed(() => {
  if (!MIN_WORDS_REQUIRED) return 0
  return Math.min(Math.round((seenWords.value / MIN_WORDS_REQUIRED) * 100), 100)
})

const unlockProgressLabel = computed(() => {
  if (unlockProgressPercent.value >= 100) return 'Ready to unlock'
  if (unlockProgressPercent.value >= 75) return 'Nearly there'
  if (unlockProgressPercent.value >= 40) return 'Making progress'
  return 'Just getting started'
})

async function getAuthHeaders() {
  const token = await getAccessToken()
  return {
    Authorization: `Bearer ${token}`
  }
}

async function loadEligibility() {

  const res = await $fetch<EligibilityResponse>('/api/daily/jyutping/v2/stats', {
    headers: await getAuthHeaders()
  })

  seenWords.value = res.words_seen ?? 0
}

async function loadWord(id: string) {
  const data = await $fetch<any>(`/api/daily/jyutping/v2/words/${id}`)

  challenge.value = {
    date: new Date().toISOString().slice(0, 10),
    wordId: data.id,
    word: data.word,
    jyutping: data.jyutping,
    meaning: data.meaning,
    audioUrl: data.audioUrl,
  }

  resetRoundState()

  await nextTick()
  inputRef.value?.focus()

  window.setTimeout(() => {
    playAudio()
  }, 300)
}

function applyCompletedSession(session: DailyStartResponse['session']) {
  xpEarned.value = session.xp_earned ?? 0
  correctCount.value = session.correct_count ?? 0
  totalQuestions.value = session.total_questions ?? 0
  challenge.value = null
  state.value = 'complete'
}

async function fetchDailySession() {
  return await $fetch<DailyStartResponse>('/api/daily/jyutping/v2/start', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: {
      totalQuestions: TOTAL_QUESTIONS,
      mode: DAILY_MODE
    }
  })
}

async function recoverCompletedSession() {
  const daily = await fetchDailySession()

  if (!daily.session.completed) {
    throw new Error('Could not recover completed daily session')
  }

  applyCompletedSession(daily.session)
}

async function startChallenge() {
  state.value = 'loading'
  errorMessage.value = ''
  resetRunState()
  resetCompletionAnimations()

  try {
    await loadEligibility()

    if (!canPlayQuiz.value) {
      state.value = 'locked'
      return
    }

    const daily = await fetchDailySession()

    if (daily.session.completed) {
      applyCompletedSession(daily.session)
      return
    }

    const ids = shuffleFisherYates(
      [...new Set(daily.session.word_ids ?? [])]
    )

    if (!ids.length) {
      state.value = 'locked'
      return
    }

    wordIds.value = ids
    currentIndex.value = 0

    await loadWord(wordIds.value[0])

    startTimer()
    state.value = 'playing'
  } catch (e: any) {
    errorMessage.value =
      e?.data?.message ??
      e?.message ??
      'Failed to load challenge'

    state.value = 'error'
  }
}

function playAudio() {
  if (!challenge.value?.audioUrl) return

  if (!audio.value || audio.value.src !== challenge.value.audioUrl) {
    audio.value = new Audio(challenge.value.audioUrl)
  }

  audio.value.currentTime = 0
  audio.value.play().catch(() => { })
}

async function finalizeDaily() {
  const res = await $fetch<{
    daily: {
      answeredCount: number
      correctCount: number
      xpEarned: number
      totalQuestions: number
    }
    quizEvent?: {
      queued?: boolean
      alreadyCompleted?: boolean
    }
  }>('/api/daily/jyutping/v2/finalize', {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: {
      answers: sessionAnswers.value
    }
  })

  xpEarned.value = res.daily.xpEarned
  correctCount.value = res.daily.correctCount
  totalQuestions.value = res.daily.totalQuestions
  syncPending.value = res.quizEvent?.queued === true
}

async function finishChallenge() {
  state.value = 'finalizing'

  try {
    await finalizeDaily()
  } catch (err) {
    console.error('Daily finalize failed, attempting recovery', err)

    await recoverCompletedSession()

    // safest UX assumption after a dropped finalize response
    syncPending.value = true
  }

  playCompletionSound()
  challenge.value = null
  freezeTimer()
  state.value = 'complete'
}

async function nextWord() {
  if (!showNext.value) return

  showNext.value = false
  currentIndex.value++

  if (currentIndex.value < wordIds.value.length) {
    await loadWord(wordIds.value[currentIndex.value])
    return
  }

  await finishChallenge()
}

async function submit() {
  if (state.value !== 'playing') return
  if (!challenge.value) return
  if (solved.value) return
  if (attemptsLeft.value <= 0) return

  const result = scoreAttempt(input.value, challenge.value.jyutping)
  const letterScore = scoreLetters(input.value, challenge.value.jyutping)

  attempts.value.push({
    input: input.value.trim(),
    passed: result.passed,
    perfect: result.perfect,
    message: result.message,
    letters: letterScore.letters,
    letterStates: letterScore.states
  })

  input.value = ''

  if (result.passed) {
    playCorrectJingle()

    sessionAnswers.value.push({
      wordId: challenge.value.wordId,
      correct: true
    })

    solved.value = true
    showNext.value = true
    return
  }

  if (attemptsLeft.value > 0) {
    await nextTick()
    inputRef.value?.focus()
    return
  }

  playIncorrectJingle()

  sessionAnswers.value.push({
    wordId: challenge.value.wordId,
    correct: false
  })

  showNext.value = true
}

watch(
  () => state.value,
  (value) => {
    if (value !== 'complete') return
    if (completionAnimated.value) return

    freezeTimer()
    completionAnimated.value = true
    animateCount(animatedAccuracy, accuracy.value, 2200)
    animateCount(animatedXpEarned, xpEarned.value, 1000)
  }
)
</script>

<template>
  <main class="mx-auto max-w-2xl px-6 py-12">

    <!-- <BackLink /> -->

    <header v-if="state !== 'complete' && state !== 'loading' && state !== 'locked' && state !== 'finalizing'"
      class="space-y-3">
      <h1 class="text-2xl font-semibold tracking-tight text-gray-900">
        Daily Jyutping Challenge
      </h1>

      <p class="text-sm text-gray-600">
        Guess the jyutping.
      </p>
    </header>

    <section :class="[
      'mt-8 p-5',
      state === 'complete'
        ? 'bg-transparent border-0 shadow-none'
        : 'rounded-xl'
    ]">
      <div v-if="state === 'loading'" class="text-gray-600 text-center">
        Loading today’s words…
      </div>

      <div v-else-if="state === 'error'" class="text-sm text-red-700">
        {{ errorMessage }}
      </div>

      <transition v-else-if="state === 'finalizing' || state === 'complete'" name="fade-scale" mode="out-in">
        <div v-if="state === 'finalizing'" key="finalizing" class="stat-card hero-card result-2 space-y-4">
          <div class="spinner mx-auto"></div>

          <p class="stat-label">
            Calculating
          </p>

          <h2 class="hero-title">
            Finalising your daily challenge...
          </h2>

          <p class="hero-subtext">
            Saving your result and preparing your score
          </p>
        </div>

        <div v-else key="complete" class="space-y-6">
          <transition name="card-fade" appear>
            <div class="stat-card hero-card" :class="resultHeroClass">
              <p class="stat-label">
                Daily Exercise Complete
              </p>

              <h2 class="hero-title">
                {{ resultMeta.title }}
              </h2>

              <p class="hero-score">
                {{ animatedAccuracy }}%
              </p>

              <p class="hero-subtext">
                {{ correctCount }} / {{ totalQuestions }} correct
              </p>
            </div>
          </transition>

          <transition name="card-fade" appear>
            <QuizCompletionFlipStats :correct="correctCount" :incorrect="incorrectCount" :time="formattedElapsedTime"
              :xp-earned="animatedXpEarned" />
          </transition>

          <div class="text-center">
            <p class="stat-label">
              Next daily unlocks in
            </p>

            <div class="countdown-pill mt-4">
              <span class="countdown-text brightness-125">
                {{ timeRemaining }}
              </span>
            </div>
          </div>

          <div class="pt-2 space-y-3">
            <NuxtLink to="/"
              class="block w-full rounded-xl text-black py-3 text-center font-medium hover:brightness-110 transition"
              style="background-color:#A8CAE0;">
              Back to home
            </NuxtLink>

            <NuxtLink to="/topics/quiz"
              class="block w-full rounded-xl text-gray-900 py-3 text-center font-medium hover:brightness-110 transition"
              style="background-color:rgba(244,205,39,0.35);">
              Explore more practice
            </NuxtLink>
          </div>
        </div>
      </transition>

      <div v-else-if="state === 'locked'" class="py-8 text-center space-y-6">
        <div class="inline-block rounded-xl px-4 py-2 text-2xl font-medium text-black">
          Daily Jyutping Challenge locked
        </div>

        <p class="text-sm text-gray-600">
          Quiz more words to unlock this daily challenge.
        </p>

        <div class="max-w-md mx-auto text-left space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-gray-800">
              {{ unlockProgressLabel }}
            </span>

            <span class="text-sm font-semibold text-purple-600">
              {{ unlockProgressPercent }}%
            </span>
          </div>

          <div class="w-full h-3 rounded-full bg-gray-200 overflow-hidden">
            <div class="h-3 rounded-full bg-purple-300 transition-[width] duration-500 ease-out"
              :style="{ width: `${unlockProgressPercent}%` }" />
          </div>

          <p class="text-xs text-gray-500">
            {{ wordsRemaining }} more word<span v-if="wordsRemaining !== 1">s</span> to unlock.
          </p>
        </div>

        <div class="mt-10">
          <NuxtLink to="/topics/quiz" class="rounded-lg px-4 py-3 font-medium text-black hover:underline">
            Explore quizzes
          </NuxtLink>
        </div>
      </div>

      <div v-else-if="state === 'playing' && challenge" class="space-y-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-4xl font-medium text-gray-900">
              {{ challenge.word }}
            </div>

            <div v-if="challenge.meaning" class="mt-1 text-sm text-gray-600">
              {{ challenge.meaning }}
            </div>

            <div class="flex gap-1 mt-2 font-mono">
              <div v-for="(letter, i) in answerLetters" :key="i"
                class="w-5 h-6 border-b flex items-end justify-center text-sm" :class="[
                  failed
                    ? 'border-red-400 text-red-500'
                    : revealedLetters[i]
                      ? 'border-green-500 text-green-600'
                      : 'border-gray-400 text-transparent'
                ]">
                {{ failed ? letter : (revealedLetters[i] ?? '•') }}
              </div>
            </div>

            <div class="text-xs text-gray-800 mt-2">
              {{ totalLetters }} letters
            </div>
          </div>

          <div class="flex flex-col items-end gap-2">
            <button v-if="challenge.audioUrl"
              class="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
              @click="playAudio" type="button">
              <Volume2 class="h-4 w-4" aria-hidden="true" />
              <span>Play audio</span>
            </button>

            <div class="text-xs text-gray-800">
              Word {{ currentIndex + 1 }} / {{ wordIds.length }}
            </div>
          </div>
        </div>

        <form class="space-y-3" @submit.prevent="submit">
          <label class="block text-sm font-medium text-gray-800">
            Your answer:
          </label>

          <input ref="inputRef" v-model="input" :disabled="solved || showNext" autocomplete="off" inputmode="text"
            class="w-full rounded-xl border border-gray-200 px-4 py-3 text-base outline-none focus:border-gray-400" />

          <div class="flex items-center justify-between">
            <div class="text-xs text-gray-600">
              Attempts left: {{ attemptsLeft }} / {{ MAX_ATTEMPTS }}
            </div>

            <button
              class="next-btn-blue rounded-lg px-4 py-2 text-sm font-medium text-black hover:brightness-110 transition disabled:opacity-40"
              :disabled="attemptsLeft <= 0 || !input.trim() || solved || showNext" type="submit">
              Submit
            </button>
          </div>

          <p v-if="lastAttempt" class="text-sm" :class="lastAttempt.passed ? 'text-emerald-700' : 'text-red-700'">
            {{ lastAttempt.message }}
          </p>

          <button v-if="showNext" @click="nextWord"
            class="next-btn-blue w-full mt-3 rounded-lg px-4 py-3 text-black font-medium hover:brightness-110 transition"
            type="button">
            Next
          </button>
        </form>

        <div v-if="attempts.length" class="pt-2">
          <div class="text-xs font-semibold text-gray-700 mb-2">
            Attempts
          </div>

          <ul class="space-y-2">
            <li v-for="(a, idx) in attempts" :key="idx" class="rounded-xl px-3 py-2">
              <div class="flex items-center justify-between">
                <div class="flex gap-1 font-mono">
                  <div v-for="(letter, i) in a.letters" :key="i"
                    class="w-5 h-6 border-b flex items-end justify-center text-sm" :class="a.letterStates?.[i] === 'correct'
                      ? 'border-green-500 text-green-600'
                      : 'border-red-300 text-red-500'">
                    {{ letter }}
                  </div>
                </div>

                <div class="text-xs" :class="a.passed ? 'text-emerald-700' : 'text-red-500'">
                  <span v-if="a.perfect">Perfect</span>
                  <span v-else>Attempt {{ idx + 1 }}</span>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div class="text-xs text-gray-500 h-5 relative overflow-hidden">
          <transition name="fade" mode="out-in">
            <div :key="currentTipIndex" class="absolute inset-0">
              Tip: {{ tips[currentTipIndex] }}
            </div>
          </transition>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
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

.card-fade-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.card-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
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

.countdown-pill {
  background: #111827;
  border-radius: 14px;
  padding: 0.9rem 1rem;
}

.countdown-text {
  font-size: 1.75rem;
  font-weight: 600;
  background: linear-gradient(90deg,
      #EAB8E4 0%,
      #A8CAE0 50%,
      #D6A3D1 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.next-btn-blue {
  background: rgb(126, 147, 255);
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
</style>
