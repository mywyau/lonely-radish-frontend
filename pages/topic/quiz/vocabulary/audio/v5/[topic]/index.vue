<script setup lang="ts">
definePageMeta({
    middleware: ['topic-access-quiz'],
    ssr: false,
})

import { computed, onUnmounted, ref, watch } from 'vue';

import {
    playCorrectJingle,
    playIncorrectJingle,
    playQuizCompleteFailSong,
    playQuizCompleteFanfareSong,
    playQuizCompleteOkaySong
} from '@/utils/sounds';

import { masteryXp } from '@/config/xp/helpers';
import { brandColours } from '~/utils/branding/helpers';

type TopicWord = {
    id: string
    word: string
    jyutping: string
    meaning: string
}

type WordProgress = {
    xp: number
    streak: number
}

type AudioQuizQuestion = {
    type: 'audio'
    wordId: string
    audioKey: string
    options: string[]
    correctIndex: number
}

type TopicAudioQuizPayload = {
    topic: string
    title: string
    description: string
    totalQuestions: number
    questions: AudioQuizQuestion[]
    progressMap: Record<string, WordProgress>
    wordsById: Record<string, TopicWord>
    guestPreview?: boolean
}

type QuizAnswer = {
    wordId: string
    correct: boolean
}

const route = useRoute()
const slug = computed(() => route.params.topic as string)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

function getRandomizedAudioSrc(audioKey: string) {
    const voiceDirectories = shuffleFisherYates(['audio-male', 'audio-female'])
    const voiceDirectory = voiceDirectories[0]
    return `${cdnBase}/${voiceDirectory}/${audioKey}`
}

const { stop } = useGlobalAudio()
const { getAccessToken } = await useAuth()
const me = useMeStateV2()
const isGuestPreview = computed(() => quizData.value?.guestPreview === true)

type FinalizeResponse = {
    quiz: {
        mode: string
        correctCount: number
        totalQuestions: number
    }
    attemptId: string
    queued?: boolean
    deduped?: boolean
    status?: string
}

const finalizeAttemptId = ref<string | null>(null)
const finalizeCompleted = ref(false)
const finalizeError = ref<string | null>(null)

const currentWord = computed(() => {
    const wordId = question.value?.wordId
    if (!wordId) return null
    return wordsById.value[wordId] ?? null
})

function createAttemptId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `topic-audio-quiz-${slug.value}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function ensureFinalizeAttemptId() {
    if (!finalizeAttemptId.value) {
        finalizeAttemptId.value = createAttemptId()
    }

    return finalizeAttemptId.value
}

function resetFinalizeState() {
    finalizeAttemptId.value = null
    finalizeCompleted.value = false
    finalizeError.value = null
    finishing.value = false
    totalXpEarned.value = 0
    totalXpLost.value = 0
    completionSoundPlayed.value = false
    resetCompletionAnimations()
}

function calculateQuizXpTotals() {
    const localProgress: Record<string, WordProgress> = Object.fromEntries(
        Object.entries(initialProgressMap.value).map(([wordId, progress]) => [
            wordId,
            { ...progress }
        ])
    )

    let earned = 0
    let lost = 0

    for (const answer of answerLog.value) {
        const prev = localProgress[answer.wordId] ?? { xp: 0, streak: 0 }
        const delta = deltaFor(answer.correct, prev.streak)
        const nextXp = Math.max(0, prev.xp + delta)
        const appliedDelta = nextXp - prev.xp

        if (appliedDelta > 0) {
            earned += appliedDelta
        } else if (appliedDelta < 0) {
            lost += Math.abs(appliedDelta)
        }

        localProgress[answer.wordId] = {
            xp: nextXp,
            streak: answer.correct ? prev.streak + 1 : 0
        }
    }

    return { earned, lost }
}

const quizData = ref<TopicAudioQuizPayload | null>(null)
const quizLoading = ref(false)
const quizLoadError = ref<string | null>(null)

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)

const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)
const xpDelta = ref<number | null>(null)

const answerLog = ref<QuizAnswer[]>([])
const finishing = ref(false)
const totalXpEarned = ref<number>(0)
const totalXpLost = ref<number>(0)

const animatedAccuracy = ref(0)
const animatedXpEarned = ref(0)
const animatedXpLost = ref(0)
const completionAnimated = ref(false)
const completionSoundPlayed = ref(false)

const wordProgressMap = ref<Record<string, WordProgress>>({})
const initialProgressMap = ref<Record<string, WordProgress>>({})

const tileColors = ref<string[]>([])
const quizStartedAt = ref<number | null>(null)
const elapsedMs = ref(0)
const frozenElapsedMs = ref<number | null>(null)

let timerInterval: ReturnType<typeof setInterval> | null = null

const STREAK_CAP = 5
const WRONG_PENALTY = -12
const MIN_CALCULATING_MS = 1500

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

function generateTileColors() {
    tileColors.value = shuffleFisherYates(brandColours).slice(0, 4)
}

function deltaFor(correct: boolean, streakBefore: number) {
    if (!correct) return WRONG_PENALTY
    return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function resetCompletionAnimations() {
    animatedAccuracy.value = 0
    animatedXpEarned.value = 0
    animatedXpLost.value = 0
    completionAnimated.value = false
}

function runCompletionAnimations() {
    animateCount(animatedAccuracy, accuracy.value, 2300)
}

function resetQuizState() {
    current.value = 0
    score.value = 0
    answered.value = false
    selectedIndex.value = null
    answerLog.value = []
    wordProgressMap.value = {}
    initialProgressMap.value = {}
    currentXp.value = null
    currentStreak.value = null
    xpDelta.value = null
    resetTimer()
    resetFinalizeState()
}

async function loadQuiz() {
    quizLoading.value = true
    quizLoadError.value = null
    quizData.value = null
    resetQuizState()

    try {
        const token = await getAccessToken()

        const res = await $fetch<TopicAudioQuizPayload>(
            // `/api/topic/audio-quiz/${slug.value}`,
            `/api/topic/audio-quiz/v2/${slug.value}`,
            token
                ? {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
                : undefined
        )

        quizData.value = res

        wordProgressMap.value = Object.fromEntries(
            Object.entries(res.progressMap).map(([wordId, progress]) => [
                wordId,
                { ...progress }
            ])
        )

        initialProgressMap.value = Object.fromEntries(
            Object.entries(res.progressMap).map(([wordId, progress]) => [
                wordId,
                { ...progress }
            ])
        )

        const firstId = res.questions[0]?.wordId
        currentStreak.value = firstId
            ? (res.progressMap[firstId]?.streak ?? 0)
            : 0
        currentXp.value = firstId
            ? (res.progressMap[firstId]?.xp ?? 0)
            : 0
        startTimer()
    } catch (err) {
        console.error('Load topic audio quiz failed', err)
        quizLoadError.value = 'Could not load audio quiz.'
    } finally {
        quizLoading.value = false
    }
}

watch(
    () => [slug.value, me.isLoggedIn.value],
    () => {
        loadQuiz()
    },
    { immediate: true }
)

const questions = computed(() => quizData.value?.questions ?? [])
const question = computed(() => questions.value[current.value] ?? null)
const currentAudioSrc = computed(() =>
    question.value?.type === 'audio' ? getRandomizedAudioSrc(question.value.audioKey) : ''
)
const wordsById = computed(() => quizData.value?.wordsById ?? {})

const pageTitle = computed(() => {
    return quizData.value?.title ?? slug.value
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
})

const accuracy = computed(() => {
    if (!questions.value.length) return 0
    return Math.round((score.value / questions.value.length) * 100)
})

const incorrectCount = computed(() => {
    return Math.max(0, questions.value.length - score.value)
})

const percentage = computed(() => {
    if (questions.value.length === 0) return 0
    return (score.value / questions.value.length) * 100
})

const hasQuestions = computed(() => questions.value.length > 0)

const quizFinished = computed(() => {
    return hasQuestions.value && current.value >= questions.value.length
})

const showQuiz = computed(() => {
    return !quizLoading.value &&
        !quizLoadError.value &&
        hasQuestions.value &&
        current.value < questions.value.length
})

const showCalculating = computed(() => {
    return quizFinished.value && finishing.value
})

const showFinalizeError = computed(() => {
    return quizFinished.value && !finishing.value && !finalizeCompleted.value && !!finalizeError.value
})

const showResults = computed(() => {
    return quizFinished.value && !finishing.value && finalizeCompleted.value
})

const progressPercent = computed(() => {
    const total = questions.value.length
    if (!total) return 0
    const position = Math.min(current.value + 1, total)
    return Math.round((position / total) * 100)
})

const resultHeroClass = computed(() => {
    if (accuracy.value >= 80) return 'result-3'
    if (accuracy.value >= 70) return 'result-0'
    if (accuracy.value >= 50) return 'result-2'
    return 'result-1'
})

const resultMeta = computed(() => {
    if (accuracy.value === 100) {
        return { title: 'Perfect' }
    }

    if (accuracy.value >= 70) {
        return { title: 'Great job' }
    }

    if (accuracy.value >= 50) {
        return { title: 'Nice try' }
    }

    return { title: 'Keep practicing' }
})

const correctWords = computed(() => {
    return answerLog.value
        .filter(a => a.correct)
        .map(a => wordsById.value[a.wordId])
        .filter(Boolean)
})

const missedWords = computed(() => {
    return answerLog.value
        .filter(a => !a.correct)
        .map(a => wordsById.value[a.wordId])
        .filter(Boolean)
})

async function answer(index: number) {
    if (answered.value) return
    if (!question.value) return

    selectedIndex.value = index
    answered.value = true

    const correct = index === question.value.correctIndex

    answerLog.value.push({
        wordId: question.value.wordId,
        correct
    })

    if (correct) {
        score.value++
        playCorrectJingle()
    } else {
        playIncorrectJingle()
    }

    const wordId = question.value.wordId
    const prev = wordProgressMap.value[wordId] ?? { xp: 0, streak: 0 }

    const delta = deltaFor(correct, prev.streak)
    const newStreak = correct ? prev.streak + 1 : 0
    const newXp = Math.max(0, prev.xp + delta)
    const appliedDelta = newXp - prev.xp

    wordProgressMap.value[wordId] = {
        xp: newXp,
        streak: newStreak
    }

    xpDelta.value = appliedDelta
    currentXp.value = newXp
    currentStreak.value = newStreak

    setTimeout(() => {
        xpDelta.value = null
    }, 1000)
}

async function finalizeAudioQuiz() {
    if (finishing.value || finalizeCompleted.value) return
    if (!answerLog.value.length) return

    finishing.value = true
    finalizeError.value = null

    const startedAt = Date.now()

    try {
        const token = await getAccessToken()
        if (!token || isGuestPreview.value) {
            const elapsed = Date.now() - startedAt
            const remaining = Math.max(0, MIN_CALCULATING_MS - elapsed)

            if (remaining > 0) {
                await sleep(remaining)
            }

            totalXpEarned.value = 0
            totalXpLost.value = 0
            freezeTimer()
            finalizeCompleted.value = true
            return
        }

        const attemptId = ensureFinalizeAttemptId()

        const res = await $fetch<FinalizeResponse>('/api/quiz/grind/finalize-v5', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: {
                attemptId,
                mode: 'grind-topic-audio',
                answers: answerLog.value
            }
        })

        const elapsed = Date.now() - startedAt
        const remaining = Math.max(0, MIN_CALCULATING_MS - elapsed)

        if (remaining > 0) {
            await sleep(remaining)
        }

        const { earned, lost } = calculateQuizXpTotals()
        totalXpEarned.value = earned
        totalXpLost.value = lost
        freezeTimer()
        finalizeCompleted.value = true

        console.info('Finalize topic audio quiz succeeded', {
            attemptId: res.attemptId,
            queued: res.queued,
            deduped: res.deduped
        })
    } catch (err) {
        const elapsed = Date.now() - startedAt
        const remaining = Math.max(0, MIN_CALCULATING_MS - elapsed)

        if (remaining > 0) {
            await sleep(remaining)
        }

        finalizeError.value = 'We could not save your quiz result. Please try again.'
        console.error('Finalize audio quiz failed', err)
    } finally {
        finishing.value = false
    }
}

async function next() {
    stop()
    answered.value = false
    selectedIndex.value = null

    current.value++

    if (current.value >= questions.value.length) {
        if (answerLog.value.length > 0) {
            await finalizeAudioQuiz()
        }
        return
    }

    const nextWordId = questions.value[current.value]?.wordId

    if (nextWordId) {
        currentStreak.value =
            wordProgressMap.value[nextWordId]?.streak ?? 0

        currentXp.value =
            wordProgressMap.value[nextWordId]?.xp ?? 0
    }
}

watch(
    () => showResults.value,
    (visible) => {
        if (!visible) return

        if (!completionAnimated.value) {
            completionAnimated.value = true
            runCompletionAnimations()
            animateCount(animatedXpEarned, totalXpEarned.value, 1000)
            animateCount(animatedXpLost, totalXpLost.value, 1000)
        }

        if (!completionSoundPlayed.value) {
            completionSoundPlayed.value = true
            stop()

            setTimeout(() => {
                if (percentage.value >= 80) {
                    playQuizCompleteFanfareSong()
                } else if (percentage.value >= 50) {
                    playQuizCompleteOkaySong()
                } else {
                    playQuizCompleteFailSong()
                }
            }, 250)
        }
    }
)

watch(
    () => question.value?.wordId,
    () => {
        generateTileColors()
    },
    { immediate: true }
)

onUnmounted(() => {
    stopTimer()
})
</script>


<template>
    <main class="max-w-xl mx-auto px-4 pt-16 pb-32 space-y-8">

        <section class="text-center space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3">
                <!-- <h1 class="text-2xl font-semibold">
                    {{ pageTitle }} Audio Quiz
                </h1> -->

                <div v-if="showQuiz && (current + 1) <= questions.length" class="flex items-center justify-center gap-3">
                    <div class="w-32 bg-gray-200 rounded-full h-2 md:w-64 md:h-3">
                        <div class="bg-purple-300 h-2 rounded-full transition-all duration-300 md:h-3"
                            :style="{ width: progressPercent + '%' }" />
                    </div>

                    <span class="text-xs text-gray-500 whitespace-nowrap">
                        {{ current + 1 }} / {{ questions.length }}
                    </span>

                </div>
            </div>

            <div v-if="quizLoading" class="stat-card hero-card result-2 space-y-4">
                <div class="spinner mx-auto" />
                <p class="stat-label">Loading</p>
                <h2 class="hero-title">Preparing your audio quiz...</h2>
            </div>

            <div v-else-if="quizLoadError" class="stat-card hero-card result-1 space-y-4">
                <p class="stat-label">Error</p>
                <h2 class="hero-title">{{ quizLoadError }}</h2>

                <button class="w-full rounded-xl font-medium text-black py-3 hover:brightness-110"
                    style="background-color:#F4C2D7;" @click="loadQuiz">
                    Try again
                </button>
            </div>

            <div v-else-if="showQuiz" class="space-y-6">

                <div class="min-h-[110px] flex flex-col items-center justify-center gap-2">
                    <p v-if="currentWord" class="text-4xl font-semibold" :class="answered
                        ? 'blur-0 opacity-100'
                        : 'blur-md opacity-60 select-none'">
                        {{ currentWord.word }}
                    </p>

                    <p v-if="answered && currentWord?.jyutping" class="text-sm text-gray-500">
                        {{ currentWord.jyutping }}
                    </p>

                    <p v-if="answered && currentWord?.meaning" class="text-sm text-gray-700">
                        {{ currentWord.meaning }}
                    </p>
                </div>

                <div class="min-h-[50px] space-y-3">
                    <div class="flex items-center justify-center gap-3">
                        <div class="w-32 h-1 bg-gray-200 rounded">
                            <div class="h-1 bg-green-500 rounded transition-all duration-500"
                                :style="{ width: Math.min((currentXp ?? 0) / masteryXp * 100, 100) + '%' }" />
                        </div>

                        <div class="relative flex items-center">
                            <span class="text-sm text-gray-500 whitespace-nowrap">
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

                    <div class="h-5 flex items-center justify-center">
                        <span v-if="currentStreak && currentStreak > 0" class="text-xs text-orange-500">
                            {{ currentStreak }} streak
                        </span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button v-for="(option, i) in question?.options ?? []" :key="i" class="answer-tile aspect-square rounded-xl flex items-center justify-center
        text-2xl font-semibold text-center p-6 select-none
        transition-all duration-300 ease-out shadow-sm active:scale-95" :style="{
            backgroundColor:
                !answered
                    ? tileColors[i]
                    : i === question?.correctIndex
                        ? '#BBF7D0'
                        : i === selectedIndex
                            ? '#FECACA'
                            : tileColors[i]
        }" :class="[
            !answered && 'hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:brightness-110',
            answered && i === question?.correctIndex && 'ring-2 ring-emerald-400',
            answered && i === selectedIndex && i !== question?.correctIndex && 'animate-shake ring-2 ring-rose-400'
        ]" @click="answer(i)">
                        {{ option }}
                    </button>
                </div>

                <div class="h-10">
                    <button v-if="answered"
                        class="next-btn-blue w-full rounded-xl font-medium text-black text-lg py-3 hover:brightness-110"
                        @click="next">
                        Next
                    </button>
                </div>
            </div>

            <transition name="fade-scale" mode="out-in">
                <div v-if="showCalculating" key="calculating" class="stat-card hero-card result-2 space-y-4">
                    <div class="spinner mx-auto" />

                    <p class="stat-label">
                        Calculating
                    </p>

                    <h2 class="hero-title">
                        Marking your quiz...
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
                        Could not finish quiz
                    </h2>

                    <p class="hero-subtext">
                        {{ finalizeError }}
                    </p>

                    <button class="w-full rounded-xl font-medium text-black py-3 hover:brightness-110"
                        style="background-color:#F4C2D7;" @click="finalizeAudioQuiz">
                        Retry Saving Results
                    </button>
                </div>

                <div v-else-if="showResults" key="results" class="space-y-6">
                    <transition name="card-fade" appear>
                        <div class="stat-card hero-card" :class="resultHeroClass">
                            <p class="stat-label">
                                Quiz Complete
                            </p>

                            <h2 class="hero-title">
                                {{ resultMeta.title }}
                            </h2>

                            <p class="hero-score">
                                {{ animatedAccuracy }}%
                            </p>
                        </div>
                    </transition>

                    <transition name="card-fade" appear>
                        <QuizCompletionFlipStats :correct="score" :incorrect="incorrectCount"
                            :time="formattedElapsedTime" :xp-earned="animatedXpEarned" :xp-lost="animatedXpLost" />
                    </transition>

                    <div v-if="correctWords.length" class="stat-card text-left result-3">
                        <h3 class="text-sm font-semibold text-gray-900 mb-3">
                            Correct
                        </h3>

                        <div class="flex flex-wrap gap-2">
                            <span v-for="word in correctWords" :key="word!.id"
                                class="rounded-lg text-green-700 px-3 py-1 text-base hover:brightness-125">
                                {{ word!.word }}
                            </span>
                        </div>
                    </div>

                    <div v-if="missedWords.length" class="stat-card text-left result-1">
                        <h3 class="text-sm font-semibold text-gray-900 mb-3">
                            Incorrect
                        </h3>

                        <div class="flex flex-wrap gap-2">
                            <span v-for="word in missedWords" :key="word!.id"
                                class="rounded-lg text-rose-700 px-3 py-1 text-base hover:brightness-125">
                                {{ word!.word }}
                            </span>
                        </div>
                    </div>

                    <div class="pt-2 space-y-3">
                        <GuestQuizGuidance v-if="isGuestPreview" />

                        <NuxtLink :to="`/topics/quiz`"
                            class="block w-full rounded-xl text-black py-3 text-center font-medium hover:brightness-110 transition"
                            style="background-color:#A8CAE0;">
                            Play Again
                        </NuxtLink>
                    </div>
                </div>
            </transition>
        </section>
    </main>

    <FloatingAudioButton v-if="showQuiz && question?.type === 'audio'" :key="question.audioKey"
        :src="currentAudioSrc" />
</template>

<style scoped>
.xp-fall-enter-active {
    transition: transform 0.6s ease, opacity 0.6s ease;
}

.xp-fall-leave-active {
    transition: transform 0.4s ease, opacity 0.4s ease;
}

.xp-fall-enter-from {
    opacity: 0;
    transform: translateY(-10px) scale(0.9);
}

.xp-fall-enter-to {
    opacity: 1;
    transform: translateY(0px) scale(1);
}

.xp-fall-leave-to {
    opacity: 0;
    transform: translateY(35px) scale(0.95);
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

.result-4 {
    background: rgba(196, 181, 253, 0.4);
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

.next-btn-blue {
    background: rgb(126, 147, 255);
}
</style>
