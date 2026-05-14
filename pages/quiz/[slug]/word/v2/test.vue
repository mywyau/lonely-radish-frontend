<script setup lang="ts">

definePageMeta({
    middleware: ['level-quiz-access'],
    ssr: false
})

import { computed, onMounted, ref, watch } from 'vue'
import { generateQuiz } from '~/utils/quiz/generateQuiz'

import {
    playQuizCompleteFailSong,
    playQuizCompleteFanfareSong,
    playQuizCompleteOkaySong
} from '@/utils/sounds'

import { masteryXp } from '@/config/xp/helpers'
import { useQuizTimer } from '~/composables/quiz/useQuizTimer'
import type { LevelData, Word } from '~/types/level/quiz/types'
import { brandColours } from '~/utils/branding/helpers'
import { levelTitles } from '~/utils/levels/levels'

const route = useRoute()
const slug = computed(() => route.params.slug as string)

type QuizAnswer = { wordId: string; correct: boolean }

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

const {
    elapsedMs,
    formattedElapsedTime,
    startTimer,
    resetTimer,
    freezeTimer
} = useQuizTimer()

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase
const playbackRate = ref(1)

let currentWordAudio: HTMLAudioElement | null = null

const currentWordAudioSrc = computed(() => {
    const wordId = question.value?.wordId
    if (!wordId) return null
    return `${cdnBase}/audio/${wordId}.mp3`
})

async function playCurrentWordAudio() {
    if (!currentWordAudioSrc.value) return

    try {
        currentWordAudio?.pause()
        currentWordAudio = new Audio(currentWordAudioSrc.value)
        currentWordAudio.playbackRate = playbackRate.value
        await currentWordAudio.play()
    } catch (err) {
        console.warn('Level quiz word audio failed', err)
    }
}

const finalizeAttemptId = ref<string | null>(null)
const finalizeCompleted = ref(false)
const finalizeError = ref<string | null>(null)
const completionSoundPlayed = ref(false)

function createAttemptId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `quiz-${slug.value}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
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
    totalXpEarned.value = 0
    totalXpLost.value = 0
    finishing.value = false
    completionSoundPlayed.value = false
    resetCompletionAnimations()
}

function resetQuizRunState() {
    answerLog.value = []
    current.value = 0
    score.value = 0
    answered.value = false
    selectedIndex.value = null
    xpDelta.value = null
    currentXp.value = null
    currentStreak.value = null
    initialProgressMap.value = {}
    wordProgressMap.value = {}
    resetTimer()
}

function calculateQuizXpTotals() {
    const localProgress: Record<string, { xp: number; streak: number }> = Object.fromEntries(
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

const answerLog = ref<QuizAnswer[]>([])
const finishing = ref(false)
const totalXpEarned = ref<number>(0)
const totalXpLost = ref<number>(0)

const animatedAccuracy = ref(0)
const animatedXpEarned = ref(0)
const animatedXpLost = ref(0)
const completionAnimated = ref(false)

const tileColors = ref<string[]>([])
const weakestIds = ref<string[]>([])

const current = ref(0)
const score = ref(0)
const answered = ref(false)
const selectedIndex = ref<number | null>(null)
const xpDelta = ref<number | null>(null)
const currentXp = ref<number | null>(null)
const currentStreak = ref<number | null>(null)

const wordProgressMap = ref<Record<string, { xp: number; streak: number }>>({})
const initialProgressMap = ref<Record<string, { xp: number; streak: number }>>({})

const { getAccessToken } = await useAuth()

const token = await getAccessToken()

const { isLoggedIn } = useMeStateV2() // for now just to prevent hydration redirect jitters

const { data, error } = await useFetch<LevelData>(
    () =>
        `/api/vocab-quiz/v2/${slug.value}`,
    {
        key: () => `vocab-quiz-${slug.value}-${isLoggedIn.value ? 'authed' : 'anon'}`,
        headers: token
            ? { Authorization: `Bearer ${token}` }
            : undefined,
        // server: true
    }
)

const wordsForLevel = computed<Word[]>(() => {
    if (!data.value) return []
    return Object.values(data.value.categories).flat()
})

function generateTileColors() {
    tileColors.value = shuffleFisherYates(brandColours).slice(0, 4)
}

const weightedWords = computed(() => {
    const words = wordsForLevel.value

    if (!words.length) {
        return []
    }

    const totalQuestions = 20

    if (!weakestIds.value.length) {
        return shuffleFisherYates(words).slice(0, totalQuestions)
    }

    const weakestPool = shuffleFisherYates(
        words.filter(w => weakestIds.value.includes(w.id))
    )

    const nonWeakestPool = shuffleFisherYates(
        words.filter(w => !weakestIds.value.includes(w.id))
    )

    const weakestTarget = Math.floor(totalQuestions * weakestWordRatio)

    const selected: Word[] = []

    selected.push(...weakestPool.slice(0, weakestTarget))
    selected.push(
        ...nonWeakestPool.slice(0, totalQuestions - selected.length)
    )

    if (selected.length < totalQuestions) {
        const remaining = shuffleFisherYates(
            words.filter(w => !selected.some(s => s.id === w.id))
        )

        selected.push(
            ...remaining.slice(0, totalQuestions - selected.length)
        )
    }

    return shuffleFisherYates(selected)
})

const questions = computed(() =>
    weightedWords.value.length
        ? generateQuiz(weightedWords.value)
        : []
)

const question = computed(() => questions.value[current.value])

const STREAK_CAP = 5
const WRONG_PENALTY = -12
const MIN_CALCULATING_MS = 1800

function deltaFor(correct: boolean, streakBefore: number) {
    if (!correct) return WRONG_PENALTY
    return 5 + Math.min(streakBefore, STREAK_CAP) * 2
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

const accuracy = computed(() => {
    if (!questions.value.length) return 0
    return Math.round((score.value / questions.value.length) * 100)
})

const incorrectCount = computed(() => {
    return Math.max(0, questions.value.length - score.value)
})

const percentage = computed(() => {
    const total = questions.value.length
    if (!total) return 0
    return (score.value / total) * 100
})

const progressPercent = computed(() => {
    const total = questions.value.length
    if (!total) return 0
    const position = Math.min(current.value + 1, total)
    return Math.round((position / total) * 100)
})

const resultHeroClass = computed(() => {
    if (accuracy.value >= 80) return 'result-3'
    if (accuracy.value >= 60) return 'result-0'
    if (accuracy.value >= 40) return 'result-2'
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
        .map(a => wordsForLevel.value.find(w => w.id === a.wordId))
        .filter(Boolean)
})

const missedWords = computed(() => {
    return answerLog.value
        .filter(a => !a.correct)
        .map(a => wordsForLevel.value.find(w => w.id === a.wordId))
        .filter(Boolean)
})

const hasQuestions = computed(() => questions.value.length > 0)

const quizFinished = computed(() => {
    return hasQuestions.value && current.value >= questions.value.length
})

const showQuiz = computed(() => {
    return hasQuestions.value && current.value < questions.value.length
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
const isGuestMode = computed(() => !isLoggedIn.value)
function resetCompletionAnimations() {
    animatedAccuracy.value = 0
    animatedXpEarned.value = 0
    animatedXpLost.value = 0
    completionAnimated.value = false
}

function runCompletionAnimations() {
    animateCount(animatedAccuracy, accuracy.value, 2300)
}

async function finalizeQuiz() {
    if (finishing.value || finalizeCompleted.value) return
    if (!answerLog.value.length) return

    finishing.value = true
    finalizeError.value = null

    const attemptId = ensureFinalizeAttemptId()
    const startedAt = Date.now()

    try {
        const token = await getAccessToken()
        if (!token || isGuestMode.value) {
            const elapsed = Date.now() - startedAt
            const remaining = Math.max(0, MIN_CALCULATING_MS - elapsed)

            if (remaining > 0) {
                await sleep(remaining)
            }

            totalXpEarned.value = 0
            totalXpLost.value = 0
            finalizeCompleted.value = true
            return
        }

        const res = await $fetch<FinalizeResponse>(
            // '/api/quiz/grind/finalize-v4',
            '/api/quiz/grind/finalize-v5',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: {
                    attemptId,
                    mode: 'grind-level',
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
        finalizeCompleted.value = true

        console.info('Quiz finalized', {
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
        console.error('Finalize failed', {
            attemptId,
            err
        })
    } finally {
        finishing.value = false
    }
}

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

    await playCurrentWordAudio()

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

async function next() {
    currentWordAudio?.pause()
    currentWordAudio = null

    answered.value = false
    selectedIndex.value = null

    current.value++

    if (current.value >= questions.value.length) {
        freezeTimer()

        if (answerLog.value.length > 0) {
            await finalizeQuiz()
        }
        return
    }

    const nextWordId = questions.value[current.value]?.wordId
    if (nextWordId) {
        currentStreak.value = wordProgressMap.value[nextWordId]?.streak ?? 0
        currentXp.value = wordProgressMap.value[nextWordId]?.xp ?? 0
    }
}

onMounted(async () => {
    if (isGuestMode.value) {
        weakestIds.value = []
        return
    }

    try {
        const token = await getAccessToken()
        if (!token) {
            weakestIds.value = []
            return
        }

        const weakest = await $fetch<{ id: string }[]>(
            // '/api/word-progress/weakestV3',
            '/api/word-progress/weakestV4',
            {
                query: { level: slug.value, limit: 30 },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        )

        weakestIds.value = weakest.map(w => w.id)
    } catch {
        weakestIds.value = []
    }
})

watch(
    () => questions.value,
    async (qs) => {
        resetQuizRunState()
        resetFinalizeState()

        if (!qs.length) return

        const token = await getAccessToken()
        if (!token || isGuestMode.value) {
            const defaultProgress = Object.fromEntries(
                [...new Set(qs.map(q => q.wordId))].map(wordId => [wordId, { xp: 0, streak: 0 }])
            )

            wordProgressMap.value = defaultProgress
            initialProgressMap.value = defaultProgress

            const firstId = qs[0]?.wordId
            currentStreak.value = firstId ? (defaultProgress[firstId]?.streak ?? 0) : 0
            currentXp.value = firstId ? (defaultProgress[firstId]?.xp ?? 0) : 0
            startTimer()
            return
        }

        const wordIds = [...new Set(qs.map(q => q.wordId))]

        const progressMap = await $fetch<
            Record<string, { xp: number; streak: number }>
        >(
            '/api/word-progress/v3',
            {
                query: { wordIds: wordIds.join(',') },
                headers: { Authorization: `Bearer ${token}` }
            }
        )

        wordProgressMap.value = Object.fromEntries(
            Object.entries(progressMap).map(([wordId, progress]) => [
                wordId,
                { ...progress }
            ])
        )

        initialProgressMap.value = Object.fromEntries(
            Object.entries(progressMap).map(([wordId, progress]) => [
                wordId,
                { ...progress }
            ])
        )

        const firstId = qs[0]?.wordId
        currentStreak.value = progressMap[firstId]?.streak ?? 0
        currentXp.value = progressMap[firstId]?.xp ?? 0

        startTimer()
    },
    { immediate: true }
)

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

            setTimeout(() => {
                const p = percentage.value

                if (p >= 70) {
                    playQuizCompleteFanfareSong()
                } else if (p >= 50) {
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

onBeforeUnmount(() => {
    stopTimer()
    currentWordAudio?.pause()
    currentWordAudio = null
})

</script>

<template>
    <main class="max-w-xl mx-auto px-4 py-16 space-y-8">

        <section class="text-center space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-3">
                <h1 class="text-2xl font-semibold text-center level-heading">
                    {{ levelTitles[slug] ?? 'Unknown level' }}
                </h1>

                <div v-if="showQuiz && (current + 1) <= questions.length"
                    class="flex items-center justify-center gap-3">
                    <div class="w-32 bg-gray-200 rounded-full h-2 md:w-64 md:h-3">
                        <div class="bg-blue-300 h-2 rounded-full transition-all duration-300 md:h-3"
                            :style="{ width: progressPercent + '%' }" />
                    </div>

                    <span class="text-xs text-gray-500 whitespace-nowrap">
                        {{ current + 1 }} / {{ questions.length }}
                    </span>
                </div>
            </div>

            <div v-if="showQuiz" class="space-y-6">
                <div class="text-center">
                    <p class="text-4xl mb-3 min-h-[64px] flex items-center justify-center text-center">
                        {{ question.prompt }}
                    </p>

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
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <button v-for="(option, i) in question.options" :key="i" class="answer-tile aspect-square rounded-xl flex items-center justify-center
              text-xl sm:text-lg md:text-xl lg:text-2xl font-semibold text-center p-6 select-none
              transition-all duration-200 ease-out shadow-sm active:scale-95" :style="{
                backgroundColor:
                    !answered
                        ? tileColors[i]
                        : i === question.correctIndex
                            ? '#BBF7D0'
                            : i === selectedIndex
                                ? '#FECACA'
                                : tileColors[i]
            }" :class="[
                !answered && 'hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg hover:brightness-110',
                answered && i === question.correctIndex && 'ring-2 ring-emerald-400',
                answered && i === selectedIndex && i !== question.correctIndex && 'animate-shake ring-2 ring-rose-400'
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

                    <button
                        class="next-btn-blue w-full rounded-xl font-medium text-black text-lg py-3 hover:brightness-110"
                        @click="finalizeQuiz">
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

                    <GuestQuizGuidance v-if="isGuestMode" />

                    <div class="pt-2 space-y-3">
                        <NuxtLink :to="`/quiz/${slug}/word/start-quiz`"
                            class="block w-full rounded-xl text-black py-3 text-center font-medium hover:brightness-110 transition"
                            style="background-color:#A8CAE0;">
                            Play Again
                        </NuxtLink>

                        <!-- <NuxtLink :to="`/level/${slug}`"
                            class="block w-full rounded-xl bg-white text-gray-900 py-3 text-center font-medium hover:brightness-110 transition"
                            style="background-color:rgba(244,205,39,0.35);">
                            Back to {{ levelTitles[slug] }}
                        </NuxtLink> -->
                    </div>
                </div>
            </transition>
        </section>
    </main>
</template>

<style scoped>
.level-heading {
    font-size: 1.3rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(0, 0, 0);
}

.level-subheading {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(17, 24, 39, 0.65);
}

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
