<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: "logged-in",
})

import { useCountdownToUtcMidnight } from "@/composables/daily/useCountdownToUtcMidnight"
import { useXpAnimation } from "@/composables/daily/useXpAnimation"
import {
  playCorrectJingle,
  playIncorrectJingle,
  playQuizCompleteFailSong,
  playQuizCompleteFanfareSong,
  playQuizCompleteOkaySong,
} from "@/utils/sounds"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import type { DailyWord } from "~/types/daily/DailyItem"
import { brandColours } from "~/utils/branding/helpers"
import { shuffleFisherYates } from "~/utils/shuffle"

type DailyAnswer = {
  wordId: string
  correct: boolean
}

type DailySummary = {
  answeredCount: number
  correctCount: number
  xpEarned: number
  totalQuestions: number
}

type DailyQuestion = DailyWord & {
  options: DailyWord[]
  progress?: {
    xp: number
    streak: number
  }
}

type DailySessionResponse = {
  dailyLocked: boolean
  requiredWords: number
  currentWordCount: number
  dailyCompleted: boolean
  backgroundStatus: "idle" | "processing" | "completed"
  daily: DailySummary
  questions: DailyQuestion[]
}

type DailySubmitResponse = {
  daily: DailySummary
  status: "processing" | "completed"
  quizEvent: {
    sessionKey: string
  }
}

type DailyResultResponse = {
  dailyCompleted: boolean
  status: "in_progress" | "processing" | "completed"
  daily: DailySummary
  quizEvent?: {
    sessionKey: string
    processed: boolean
    processedAt: string | null
  }
}

const DAILY_MODE = "daily_meaning_quiz"

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

function getRandomizedAudioSrc(audioKey: string) {
  const voiceDirectories = shuffleFisherYates(['audio-male', 'audio-female'])
  const voiceDirectory = voiceDirectories[0]
  return `${cdnBase}/${voiceDirectory}/${audioKey}.mp3`
}

const { getAccessToken } = await useAuth()
const { timeRemaining } = useCountdownToUtcMidnight()
const { xpDelta, mergingXp, readyForNext, triggerXp } = useXpAnimation()

const loading = ref(true)
const submitting = ref(false)
const submitError = ref<string | null>(null)

const dailyLocked = ref(false)
const requiredWords = ref(100)
const currentWordCount = ref(0)
const dailyCompleted = ref(false)
const backgroundStatus = ref<"idle" | "processing" | "completed">("idle")

const questions = ref<DailyQuestion[]>([])
const currentIndex = ref(0)

const answeredCount = ref(0)
const correctCount = ref(0)
const totalQuestions = ref(0)
const xpToday = ref(0)

const selected = ref<string | null>(null)
const showResult = ref(false)
const showCompleteView = ref(false)

const currentXp = ref(0)
const currentStreak = ref(0)
const answerLog = ref<DailyAnswer[]>([])
const tileColors = ref<string[]>([])
const quizStartedAt = ref<number | null>(null)
const elapsedMs = ref(0)
const frozenElapsedMs = ref<number | null>(null)

let timerInterval: ReturnType<typeof setInterval> | null = null

const animatedAccuracy = ref(0)
const animatedXpEarned = ref(0)
const completionAnimated = ref(false)

const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null)
const questionOptions = computed(() => currentQuestion.value?.options ?? [])

const isBackgroundSyncing = computed(() =>
  dailyCompleted.value && backgroundStatus.value === "processing"
)

const progressPercent = computed(() => {
  if (!totalQuestions.value) return 0
  return Math.min(Math.max((answeredCount.value / totalQuestions.value) * 100, 0), 100)
})

const percentage = computed(() => {
  if (!totalQuestions.value) return 0
  return Math.round((correctCount.value / totalQuestions.value) * 100)
})

const incorrectCount = computed(() =>
  Math.max(0, totalQuestions.value - correctCount.value)
)

const resultHeroClass = computed(() => {
  if (percentage.value >= 80) return "result-3"
  if (percentage.value >= 60) return "result-0"
  if (percentage.value >= 50) return "result-2"
  return "result-1"
})

const resultMeta = computed(() => {
  if (percentage.value === 100) return { title: "Perfect" }
  if (percentage.value >= 70) return { title: "Great job" }
  if (percentage.value >= 50) return { title: "Nice try" }
  return { title: "Keep practicing" }
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
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

const displayedElapsedMs = computed(() => frozenElapsedMs.value ?? elapsedMs.value)

const formattedElapsedTime = computed(() => {
  if (quizStartedAt.value === null && frozenElapsedMs.value === null) {
    return "--"
  }

  return formatDuration(displayedElapsedMs.value)
})

const completionTiles = computed(() => [
  {
    label: "Correct",
    value: correctCount.value,
    suffix: "",
    className: "result-0",
  },
  {
    label: "Incorrect",
    value: incorrectCount.value,
    suffix: "",
    className: "result-1",
  },
  {
    label: "XP Earned",
    value: animatedXpEarned.value,
    suffix: "XP",
    className: "result-2",
    prefix: animatedXpEarned.value > 0 ? "+" : "",
  },
  {
    label: "Time",
    value: formattedElapsedTime.value,
    suffix: "",
    className: "result-3",
  },
])

const showQuizView = computed(() => {
  return !loading.value && !dailyLocked.value && !showCompleteView.value && !submitting.value && !!currentQuestion.value
})

const showCalculating = computed(() => {
  return !loading.value && !dailyLocked.value && submitting.value
})

const showResults = computed(() => {
  return !loading.value && !dailyLocked.value && showCompleteView.value
})

const showEmptyState = computed(() => {
  return !loading.value && !dailyLocked.value && !showCompleteView.value && !submitting.value && !currentQuestion.value
})

const STREAK_CAP = 5

function dailyDeltaFor(correct: boolean, streakBefore: number) {
  if (!correct) return 0
  return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function generateTileColors() {
  tileColors.value = shuffleFisherYates([...brandColours]).slice(0, 4)
}

function applyDailySummary(summary: DailySummary) {
  answeredCount.value = summary.answeredCount
  correctCount.value = summary.correctCount
  xpToday.value = summary.xpEarned
  totalQuestions.value = summary.totalQuestions
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

    if (progress < 1) requestAnimationFrame(tick)
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

function syncQuestionProgressFromServer() {
  currentXp.value = currentQuestion.value?.progress?.xp ?? 0
  currentStreak.value = currentQuestion.value?.progress?.streak ?? 0
}

function resetQuestionUi() {
  selected.value = null
  showResult.value = false
  readyForNext.value = false
  mergingXp.value = false
}

const wordsRemaining = computed(() =>
  Math.max(0, requiredWords.value - currentWordCount.value)
)

const unlockProgressPercent = computed(() => {
  if (!requiredWords.value) return 0
  return Math.min(Math.round((currentWordCount.value / requiredWords.value) * 100), 100)
})

const unlockProgressLabel = computed(() => {
  if (unlockProgressPercent.value >= 100) return "Ready to unlock"
  if (unlockProgressPercent.value >= 75) return "Nearly there"
  if (unlockProgressPercent.value >= 40) return "Making progress"
  return "Just getting started"
})

async function pollForCompletionInBackground() {
  try {
    const token = await getAccessToken()

    for (let i = 0; i < 20; i++) {
      const result = await $fetch<DailyResultResponse>("/api/daily/vocab/v2/reload", {
        headers: { Authorization: `Bearer ${token}` },
        query: { mode: DAILY_MODE },
      })

      if (result.status === "completed") {
        backgroundStatus.value = "completed"
        applyDailySummary(result.daily)
        return
      }

      if (result.status === "processing") {
        backgroundStatus.value = "processing"
        await sleep(800)
        continue
      }

      return
    }
  } catch (err) {
    console.error("Background daily result polling failed", err)
  }
}

async function loadDailySession() {
  loading.value = true
  submitError.value = null

  try {
    const token = await getAccessToken()

    const session = await $fetch<DailySessionResponse>("/api/daily/vocab/v2/session", {
      headers: { Authorization: `Bearer ${token}` },
    })

    dailyLocked.value = session.dailyLocked
    requiredWords.value = session.requiredWords
    currentWordCount.value = session.currentWordCount
    dailyCompleted.value = session.dailyCompleted
    backgroundStatus.value = session.backgroundStatus

    questions.value = session.questions ?? []
    applyDailySummary(session.daily)

    if (!totalQuestions.value) {
      totalQuestions.value = session.questions.length
    }

    currentIndex.value = 0
    answerLog.value = []
    resetQuestionUi()
    resetTimer()
    syncQuestionProgressFromServer()
    generateTileColors()

    if (session.dailyCompleted) {
      showCompleteView.value = true

      if (session.backgroundStatus === "processing") {
        void pollForCompletionInBackground()
      }

      return
    }

    if (session.questions.length > 0) {
      startTimer()
    }
  } catch (err) {
    console.error("Failed to load daily session", err)
    submitError.value =
      err instanceof Error ? err.message : "Could not load daily session."
  } finally {
    loading.value = false
  }
}

async function submitAnswers() {
  submitting.value = true
  submitError.value = null

  try {
    const token = await getAccessToken()

    const submit = await $fetch<DailySubmitResponse>("/api/daily/vocab/v2/finalize", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: {
        mode: DAILY_MODE,
        answers: answerLog.value,
      },
    })

    applyDailySummary(submit.daily)
    dailyCompleted.value = true
    backgroundStatus.value = submit.status

    await sleep(1300)
    freezeTimer()

    showCompleteView.value = true
    playCompletionSound()

    if (submit.status === "processing") {
      void pollForCompletionInBackground()
    }
  } catch (err: unknown) {
    console.error("Daily finalize failed", err)
    submitError.value =
      err instanceof Error ? err.message : "Could not finalize daily quiz."
  } finally {
    submitting.value = false
  }
}

async function selectAnswer(answer: string) {
  if (!currentQuestion.value || showResult.value || submitting.value) return

  selected.value = answer
  showResult.value = true

  const wordId = currentQuestion.value.id
  const correct = answer === currentQuestion.value.meaning

  if (correct) {
    playCorrectJingle()
  } else {
    playIncorrectJingle()
  }

  if (answerLog.value.some(entry => entry.wordId === wordId)) {
    return
  }

  const delta = dailyDeltaFor(correct, currentStreak.value)

  answerLog.value.push({ wordId, correct })
  answeredCount.value += 1
  if (correct) correctCount.value += 1

  xpToday.value += delta
  currentXp.value = Math.max(0, currentXp.value + delta)
  currentStreak.value = correct ? currentStreak.value + 1 : 0

  const isLastQuestion = answerLog.value.length >= questions.value.length
  triggerXp(delta, isLastQuestion)

  if (isLastQuestion && !dailyCompleted.value) {
    await submitAnswers()
  }
}

function nextQuestion() {
  if (currentIndex.value >= questions.value.length - 1) return

  currentIndex.value += 1
  resetQuestionUi()
  syncQuestionProgressFromServer()
  generateTileColors()
}

watch(
  () => showCompleteView.value,
  visible => {
    if (!visible || completionAnimated.value) return

    freezeTimer()
    completionAnimated.value = true
    animateCount(animatedAccuracy, percentage.value, 2200)
    animateCount(animatedXpEarned, xpToday.value, 1000)
  }
)

watch(
  () => currentQuestion.value?.id,
  () => {
    syncQuestionProgressFromServer()
    generateTileColors()
  }
)

onMounted(async () => {
  await loadDailySession()
})

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="max-w-xl mx-auto px-4 py-8">
    <div class="mb-6">
      <BackLink />
    </div>

    <h1 v-if="!showCompleteView && !submitting && currentQuestion" class="text-2xl font-semibold text-center mb-4">
      Daily Training
    </h1>

    <div v-if="loading" class="text-center py-10 text-gray-500">
      Loading daily training...
    </div>

    <div v-else>
      <div v-if="dailyLocked" class="py-8 text-center space-y-6">
        <div class="inline-block rounded-xl px-4 py-2 text-2xl font-medium text-black">
          Daily Training Locked
        </div>

        <p class="text-sm text-gray-600">
          Quiz more words to unlock this daily challenge.
        </p>

        <div class="max-w-md mx-auto text-left space-y-3">

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

        <div class="pt-2">
          <NuxtLink to="/topics/quiz" class="inline-block rounded-lg px-4 py-3 font-medium text-black hover:underline">
            Explore quizzes
          </NuxtLink>
        </div>
      </div>

      <div v-else class="min-h-[700px]">
        <div v-if="showQuizView">
          <div class="flex items-center gap-3 mb-6">
            <div class="flex-1 bg-gray-200 rounded-lg h-3 relative overflow-hidden">
              <div :class="[
                'h-3 rounded-lg transition-[width] duration-500 ease-out relative',
                progressPercent > 80
                  ? 'bg-purple-400 animate-pulse shadow-[0_0_20px_rgba(168,85,247,0.9)]'
                  : 'bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.6)]'
              ]" :style="{ width: `${progressPercent}%` }" />
            </div>

            <span class="text-sm text-gray-500 whitespace-nowrap">
              {{ answeredCount }} / {{ totalQuestions }}
            </span>
          </div>

          <div class="py-8 rounded-2xl transition-all">
            <p class="text-3xl font-medium text-center mb-2">
              {{ currentQuestion.word }}
            </p>

            <div class="flex flex-col items-center gap-2 mb-6">
              <div class="w-40 h-2 bg-gray-200 rounded">
                <div :class="[
                  'h-2 bg-green-500 rounded transition-[width] duration-500 ease-out',
                  mergingXp ? 'ring-2 ring-green-300' : ''
                ]" :style="{ width: `${Math.min((currentXp / 1000) * 100, 100)}%` }" />
              </div>

              <div class="relative text-sm text-gray-500">
                {{ currentXp }} XP

                <transition name="xp-fall">
                  <span v-if="xpDelta !== null" :class="[
                    'absolute left-full ml-2 font-semibold transition-all duration-200',
                    xpDelta > 0 ? 'text-green-600' : 'text-red-600',
                    mergingXp ? 'opacity-0 scale-75 -translate-y-2' : ''
                  ]">
                    {{ xpDelta > 0 ? `+${xpDelta}` : xpDelta }}
                  </span>
                </transition>
              </div>

              <div class="h-5 flex items-center justify-center">
                <span class="text-xs text-orange-500">
                  {{ currentStreak > 0 ? `${currentStreak} streak` : '' }}
                </span>
              </div>

              <div class="text-center">
                <!-- <AudioButton :key="currentQuestion.id" :src="`${cdnBase}/audio/${currentQuestion.id}.mp3`" autoplay /> -->
                <AudioButton :key="currentQuestion.id" :src="getRandomizedAudioSrc(currentQuestion.id)" autoplay />
              </div>
            </div>

            <div class="grid gap-4">
              <button v-for="(option, i) in questionOptions" :key="option.id" :disabled="showResult || submitting"
                @click="selectAnswer(option.meaning)"
                class="rounded-lg px-6 py-4 text-center transition-all duration-300 ease-out shadow-sm active:scale-95 hover:brightness-110 disabled:opacity-80 disabled:cursor-not-allowed"
                :style="{
                  backgroundColor:
                    !showResult
                      ? tileColors[i]
                      : option.meaning === currentQuestion.meaning
                        ? '#BBF7D0'
                        : selected === option.meaning
                          ? '#FECACA'
                          : tileColors[i]
                }" :class="[
                  showResult && option.meaning === currentQuestion.meaning && 'ring-2 ring-emerald-400',
                  showResult && selected === option.meaning && option.meaning !== currentQuestion.meaning && 'animate-shake ring-2 ring-rose-400'
                ]">
                {{ option.meaning }}
              </button>
            </div>

            <transition name="next-fade">
              <button v-if="showResult && readyForNext && currentIndex < questions.length - 1" @click="nextQuestion"
                class="mt-6 w-full next-btn-blue font-medium text-black p-3 rounded-lg transition-transform duration-150 hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]">
                Next
              </button>
            </transition>

            <div v-if="submitError" class="mt-6 rounded-xl p-4 text-center result-1">
              <p class="font-medium text-gray-900">
                {{ submitError }}
              </p>

              <button class="mt-3 px-5 py-3 rounded-lg bg-black text-white hover:opacity-90" @click="submitAnswers">
                Retry finalise
              </button>
            </div>
          </div>
        </div>

        <transition name="fade-scale" mode="out-in">

          <div v-if="showCalculating" key="calculating" class="stat-card hero-card result-2 space-y-4">
            <div class="spinner mx-auto"></div>

            <p class="stat-label">
              Calculating
            </p>

            <h2 class="hero-title">
              Finalising your daily training...
            </h2>

            <p class="hero-subtext">
              Saving answers and calculating XP
            </p>
          </div>

          <div v-else-if="showResults" key="results" class="space-y-6">
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

            <transition-group name="card-fade" tag="div" class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <div v-for="tile in completionTiles" :key="tile.label" class="stat-card hover:brightness-110"
                :class="tile.className">
                <p class="stat-label">
                  {{ tile.label }}
                </p>

                <p class="stat-value">
                  {{ tile.prefix ?? '' }}{{ tile.value }} {{ tile.suffix }}
                </p>
              </div>
            </transition-group>

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

        <div v-if="showEmptyState" class="text-center py-10 text-gray-500">
          No daily questions available right now.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.finalise-fade-enter-active,
.finalise-fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.finalise-fade-enter-from,
.finalise-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.97);
}

.complete-fade-enter-active {
  transition:
    opacity 0.7s cubic-bezier(.22, 1, .36, 1),
    transform 0.7s cubic-bezier(.22, 1, .36, 1);
}

.complete-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
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

.fade-streak-enter-active,
.fade-streak-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-streak-enter-from,
.fade-streak-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.next-fade-enter-active {
  transition: opacity 0.18s ease-out, transform 0.18s ease-out;
}

.next-fade-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}

.next-fade-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.97);
}

.next-fade-enter-to {
  opacity: 1;
  transform: translateY(0px) scale(1);
}

.next-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.shimmer-layer {
  background: linear-gradient(110deg,
      transparent 25%,
      rgba(255, 255, 255, 0.5) 50%,
      transparent 75%);
  background-size: 200% 100%;
  animation: shimmer 2.5s infinite linear;
  mix-blend-mode: overlay;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }

  100% {
    background-position: 200% 0;
  }
}

@keyframes progressPulse {
  0% {
    box-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
  }

  50% {
    box-shadow: 0 0 18px rgba(168, 85, 247, 0.8);
  }

  100% {
    box-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
  }
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
