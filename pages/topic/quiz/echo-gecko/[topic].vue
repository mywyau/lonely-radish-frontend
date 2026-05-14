<script setup lang="ts">
import { ArrowRight, Ear, LoaderCircle, Lock, Mic, RotateCcw, Send, SkipForward, Square, Volume2 } from '@lucide/vue'
import { playCorrectJingle, playGoodJingle, playQuizCompleteFailSong, playQuizCompleteFanfareSong, playQuizCompleteOkaySong } from "~/utils/sounds"
definePageMeta({
  ssr: false,
  middleware: ["logged-in", "topic-access-quiz"],
})

type QuizWord = {
  id: string
  word: string
  jyutping?: string
  meaning?: string
}

type PitchContour = {
  values: number[]
}

type AudioVoice = 'male' | 'female'

type ToneApiResponse = {
  toneScore: number
  overallScore: number
  feedback: string
  acousticToneScore: number | null
  referenceToneScore: number | null
  detectedAcousticTones?: Array<{
    syllable: number
    token: string
    expectedTone: string
    detectedTone: string | null
    confidence: number | null
  }>
}

const PASS_SCORE = 25
const NEAR_PERFECT_PASS_SCORE = 60
const GOOD_JINGLE_MIN_SCORE = 25
const JINGLE_DELAY_MS = 400
const SUCCESS_MESSAGE_MS = 20000
const MAX_QUIZ_SIZE = 10
const SKIP_UNLOCK_ATTEMPTS = 3
const FINAL_SCREEN_BUFFER_MS = 250
const FINAL_SCREEN_MIN_DELAY_MS = 2200
const FINAL_SCREEN_MAX_DELAY_MS = 4000

const route = useRoute()
const topicSlug = computed(() => route.params.topic as string)

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

const { volume } = useAudioVolume()
const selectedVoice = useCookie<AudioVoice>('audio-voice', {
  default: () => 'male',
  sameSite: 'lax',
})
const playbackRate = ref(1)
const audioDirectory = computed(() => selectedVoice.value === 'female' ? 'audio-female' : 'audio-male')

const { getAccessToken } = await useAuth()
const token = await getAccessToken()

const { data, pending, error } = await useFetch<{
  title?: string
  wordsById?: Record<string, QuizWord>
}>(() => `/api/topic/quiz/v2/${topicSlug.value}`, {
  key: () => `tone-gate-topic-${topicSlug.value}`,
  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
})

const allWords = computed<QuizWord[]>(() => {
  if (!data.value?.wordsById) return []
  return Object.values(data.value.wordsById).filter((word) => !!word?.id && !!word?.jyutping)
})

const quizWords = ref<QuizWord[]>([])
const currentIndex = ref(0)
const currentWordAttemptCount = ref(0)
const passedCount = ref(0)
const started = ref(false)
const finished = ref(false)
const elapsedSeconds = ref(0)
const startedAtMs = ref<number | null>(null)

const loading = ref(false)
const submitting = ref(false)
const recording = ref(false)
const errorMessage = ref("")
const feedback = ref("")
const successMessage = ref("")
const lastToneScore = ref<number | null>(null)
const detectedToneRows = ref<ToneApiResponse["detectedAcousticTones"]>([])
const nextWordCountdownMs = ref<number | null>(null)
const rapidMode = ref(false)
const completionSoundPlayed = ref(false)
const finalizing = ref(false)

const recordedBlob = ref<Blob | null>(null)
const recordingUrl = ref<string | null>(null)
const recorderMimeType = ref("audio/webm")
const mediaRecorder = ref<MediaRecorder | null>(null)
const streamRef = ref<MediaStream | null>(null)
let audioChunks: Blob[] = []
const activeAttemptId = ref(0)

let timerInterval: ReturnType<typeof setInterval> | null = null
let currentWordAudio: HTMLAudioElement | null = null
let nextWordCountdownInterval: ReturnType<typeof setInterval> | null = null
let finalizeQuizTimeout: ReturnType<typeof setTimeout> | null = null

const currentWord = computed(() => quizWords.value[currentIndex.value] ?? null)
const quizSize = computed(() => Math.min(MAX_QUIZ_SIZE, allWords.value.length))
const progressLabel = computed(() => `${Math.min(currentIndex.value + 1, quizSize.value)} / ${quizSize.value}`)
const canSkipCurrentWord = computed(() => currentWordAttemptCount.value >= SKIP_UNLOCK_ATTEMPTS)
const skipAttemptsRemaining = computed(() => Math.max(0, SKIP_UNLOCK_ATTEMPTS - currentWordAttemptCount.value))
const currentWordAudioUrl = computed(() => {
  const id = currentWord.value?.id
  return id ? `${cdnBase}/${audioDirectory.value}/${id}.mp3` : ""
})

function stripToneDigit(token: string) {
  return token.replace(/[1-6]$/, "")
}

const detectedToneDisplayRows = computed(() => {
  const rows = detectedToneRows.value ?? []
  const chars = Array.from(currentWord.value?.word ?? "")
  const hasOneToOneChars = chars.length === rows.length

  return rows.map((row, idx) => {
    const base = stripToneDigit(row.token)
    const heardJyutping = row.detectedTone ? `${base}${row.detectedTone}` : `${base}?`
    return {
      ...row,
      character: hasOneToOneChars ? chars[idx] : null,
      heardJyutping,
    }
  })
})
const lastToneLabel = computed(() => {
  if (lastToneScore.value === null) return ""
  if (lastToneScore.value <= PASS_SCORE) return "not quite"
  if (lastToneScore.value <= 60) return "good"
  if (lastToneScore.value <= 80) return "very good"
  return "perfect"
})

const nextWordCountdownSeconds = computed(() => {
  if (nextWordCountdownMs.value === null) return null
  return Math.max(0, Math.ceil(nextWordCountdownMs.value / 1000))
})

const canRecordAgain = computed(() => {
  if (!recordedBlob.value || recording.value || submitting.value) return false
  return Boolean(errorMessage.value) || (lastToneScore.value !== null && lastToneScore.value <= PASS_SCORE)
})

function shuffle<T>(arr: T[]) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function clearNextWordCountdown() {
  if (nextWordCountdownInterval) {
    clearInterval(nextWordCountdownInterval)
    nextWordCountdownInterval = null
  }
  nextWordCountdownMs.value = null
}

function resetRecordingState() {
  recordedBlob.value = null
  if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
  recordingUrl.value = null
}

function getCurrentWordAudioRemainingMs() {
  if (!currentWordAudio) return 0
  if (currentWordAudio.paused || currentWordAudio.ended) return 0

  const duration = currentWordAudio.duration
  const currentTime = currentWordAudio.currentTime
  if (!Number.isFinite(duration) || !Number.isFinite(currentTime)) return 0

  return Math.max(0, Math.round((duration - currentTime) * 1000))
}

function advanceToNextWord(options?: { countAsPass?: boolean }) {
  if (!started.value || finished.value || finalizing.value) return

  if (options?.countAsPass) {
    passedCount.value += 1
  }

  const isFinalWord = currentIndex.value >= quizSize.value - 1

  if (isFinalWord) {
    if (finalizeQuizTimeout) {
      clearTimeout(finalizeQuizTimeout)
      finalizeQuizTimeout = null
    }

    finalizing.value = true

    const remainingAudioMs = getCurrentWordAudioRemainingMs()
    const targetDelayMs = Math.max(FINAL_SCREEN_MIN_DELAY_MS, remainingAudioMs + FINAL_SCREEN_BUFFER_MS)
    const finalizeDelayMs = Math.min(FINAL_SCREEN_MAX_DELAY_MS, targetDelayMs)

    finalizeQuizTimeout = setTimeout(() => {
      if (!started.value || finished.value) return
      finalizing.value = false
      finished.value = true
      if (startedAtMs.value) {
        elapsedSeconds.value = Math.floor((Date.now() - startedAtMs.value) / 1000)
      }
      stopTimer()
      finalizeQuizTimeout = null
    }, finalizeDelayMs)
  } else {
    currentIndex.value += 1
  }

  clearNextWordCountdown()
  resetRecordingState()
  successMessage.value = ""
  feedback.value = ""
  lastToneScore.value = null
  detectedToneRows.value = []
  currentWordAttemptCount.value = 0
}

function invalidateActiveAttempt() {
  activeAttemptId.value += 1
  submitting.value = false
}

function stopTracks() {
  streamRef.value?.getTracks().forEach((track) => track.stop())
  streamRef.value = null
}

function getSupportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return "audio/webm"
}

function tokenizeJyutping(raw: string) {
  return (raw || "").toLowerCase().match(/[a-z]+[1-6]?/g) ?? []
}

function estimatePitchHz(frame: Float32Array, sampleRate: number) {
  let rms = 0
  for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i]
  rms = Math.sqrt(rms / frame.length)
  if (rms < 0.006) return 0

  const minHz = 75
  const maxHz = 450
  const minLag = Math.floor(sampleRate / maxHz)
  const maxLag = Math.floor(sampleRate / minHz)

  let bestLag = 0
  let bestCorr = 0

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0
    for (let i = 0; i < frame.length - lag; i++) {
      corr += frame[i] * frame[i + lag]
    }
    if (corr > bestCorr) {
      bestCorr = corr
      bestLag = lag
    }
  }

  if (!bestLag) return 0
  return sampleRate / bestLag
}

function smoothPitches(values: number[]) {
  if (values.length < 5) return values

  const smoothed: number[] = []
  for (let i = 0; i < values.length; i++) {
    const left = Math.max(0, i - 2)
    const right = Math.min(values.length, i + 3)
    const window = values.slice(left, right).sort((a, b) => a - b)
    smoothed.push(window[Math.floor(window.length / 2)])
  }

  return smoothed
}

async function extractPitchContoursFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  expectedTokenCount: number,
): Promise<PitchContour[]> {
  if (!expectedTokenCount) return []
  const audioContext = new AudioContext()

  try {
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
    const channel = audioBuffer.getChannelData(0)
    const frameSize = 2048
    const hop = 512
    const rawPitches: number[] = []

    for (let offset = 0; offset + frameSize < channel.length; offset += hop) {
      const frame = channel.slice(offset, offset + frameSize)
      const pitch = estimatePitchHz(frame, audioBuffer.sampleRate)
      if (pitch > 0) rawPitches.push(Math.round(pitch))
    }

    if (!rawPitches.length) return []

    const smoothed = smoothPitches(rawPitches)
    const trim = Math.floor(smoothed.length * 0.1)
    const trimmed = smoothed.slice(trim, Math.max(smoothed.length - trim, trim + 1))
    if (!trimmed.length) return []

    const contours: PitchContour[] = []
    const bucketSize = Math.max(1, Math.floor(trimmed.length / expectedTokenCount))
    for (let i = 0; i < expectedTokenCount; i++) {
      const start = i * bucketSize
      const end = i === expectedTokenCount - 1 ? trimmed.length : (i + 1) * bucketSize
      contours.push({ values: trimmed.slice(start, end).slice(0, 32) })
    }

    return contours
  } finally {
    await audioContext.close()
  }
}

async function extractPitchContours(blob: Blob, expectedTokenCount: number): Promise<PitchContour[]> {
  const arrayBuffer = await blob.arrayBuffer()
  return extractPitchContoursFromArrayBuffer(arrayBuffer, expectedTokenCount)
}

async function playCurrentWordAudio() {
  if (!currentWordAudioUrl.value) return
  try {
    currentWordAudio?.pause()
    currentWordAudio = new Audio(currentWordAudioUrl.value)
    currentWordAudio.volume = volume.value
    currentWordAudio.playbackRate = playbackRate.value
    await currentWordAudio.play()
  } catch (err) {
    console.warn("[tone-gate] failed to play word audio", err)
  }
}

function startQuiz() {
  if (quizSize.value <= 0) {
    errorMessage.value = "No words available to start this quiz yet."
    return
  }

  errorMessage.value = ""
  feedback.value = ""
  successMessage.value = ""
  lastToneScore.value = null
  detectedToneRows.value = []
  finished.value = false
  finalizing.value = false
  completionSoundPlayed.value = false
  currentIndex.value = 0
  currentWordAttemptCount.value = 0
  passedCount.value = 0
  quizWords.value = shuffle(allWords.value).slice(0, quizSize.value)
  elapsedSeconds.value = 0
  startedAtMs.value = Date.now()
  started.value = true
  resetRecordingState()

  stopTimer()
  timerInterval = setInterval(() => {
    if (!startedAtMs.value) return
    elapsedSeconds.value = Math.floor((Date.now() - startedAtMs.value) / 1000)
  }, 250)
}

async function startRecording() {
  if (!started.value || finished.value) return

  if (!navigator.mediaDevices || !window.MediaRecorder) {
    errorMessage.value = "MediaRecorder is not available on this browser/device."
    return
  }

  try {
    errorMessage.value = ""
    feedback.value = ""
    successMessage.value = ""
    lastToneScore.value = null
    detectedToneRows.value = []
    resetRecordingState()
    audioChunks = []

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.value = stream
    const mimeType = getSupportedMimeType()
    recorderMimeType.value = mimeType
    mediaRecorder.value = new MediaRecorder(stream, { mimeType })

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) audioChunks.push(event.data)
    }

    mediaRecorder.value.onstop = () => {
      const blob = new Blob(audioChunks, { type: recorderMimeType.value })
      recordedBlob.value = blob
      recordingUrl.value = URL.createObjectURL(blob)
      stopTracks()
      mediaRecorder.value = null
    }

    mediaRecorder.value.start()
    recording.value = true
  } catch (err) {
    console.error("[tone-gate] failed to start recording", err)
    errorMessage.value = "Could not start microphone recording."
    stopTracks()
  }
}

function stopRecording() {
  if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") return
  mediaRecorder.value.stop()
  recording.value = false
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForNextWord(ms: number) {
  clearNextWordCountdown()
  const endsAt = Date.now() + ms
  nextWordCountdownMs.value = ms
  nextWordCountdownInterval = setInterval(() => {
    nextWordCountdownMs.value = Math.max(0, endsAt - Date.now())
  }, 100)

  await wait(ms)
  clearNextWordCountdown()
}

async function submitAttempt() {
  if (!started.value || finished.value || !currentWord.value) return
  if (!recordedBlob.value) {
    errorMessage.value = "Please record your pronunciation first."
    return
  }
  if (!currentWord.value.jyutping) {
    errorMessage.value = "Missing target jyutping for this word."
    return
  }

  submitting.value = true
  const attemptId = activeAttemptId.value + 1
  activeAttemptId.value = attemptId
  const wordIdAtSubmit = currentWord.value.id
  errorMessage.value = ""
  feedback.value = ""
  successMessage.value = ""
  clearNextWordCountdown()

  try {
    const expectedTokens = tokenizeJyutping(currentWord.value.jyutping)
    const contours = await extractPitchContours(recordedBlob.value, expectedTokens.length)

    const form = new FormData()
    const extension = recorderMimeType.value.includes("mp4") ? "m4a" : "webm"
    form.append("audio", recordedBlob.value, `tone-gate.${extension}`)
    form.append("expectedJyutping", currentWord.value.jyutping)
    form.append("pitchSummary", JSON.stringify(contours))

    const result = await $fetch<ToneApiResponse>("/api/pronunciation-tone-word-v1", {
      method: "POST",
      body: form,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    if (attemptId !== activeAttemptId.value || currentWord.value?.id !== wordIdAtSubmit) return

    currentWordAttemptCount.value += 1
    lastToneScore.value = result.toneScore
    feedback.value = result.feedback
    detectedToneRows.value = result.detectedAcousticTones ?? []

    if (!rapidMode.value) {
      await wait(JINGLE_DELAY_MS)
      if (attemptId !== activeAttemptId.value || currentWord.value?.id !== wordIdAtSubmit) return
    }

    if (result.toneScore < GOOD_JINGLE_MIN_SCORE) {
      playIncorrectJingle(0.5)
    } else if (result.toneScore < NEAR_PERFECT_PASS_SCORE) {
      playGoodJingle(0.55)
    }

    if (result.toneScore > PASS_SCORE) {
      if (result.toneScore >= NEAR_PERFECT_PASS_SCORE) {
        playCorrectJingle(0.85)
      }

      if (!rapidMode.value) {
        successMessage.value = "Nice pronunciation — moving to the next word!"
        await waitForNextWord(SUCCESS_MESSAGE_MS)
        if (attemptId !== activeAttemptId.value || currentWord.value?.id !== wordIdAtSubmit) return
      }

      advanceToNextWord({ countAsPass: true })
    }
  } catch (err) {
    console.error("[tone-gate] submit failed", err)
    errorMessage.value = "Could not score your pronunciation. Please try again."
  } finally {
    if (attemptId === activeAttemptId.value) {
      submitting.value = false
    }
  }
}

const formattedElapsedTime = computed(() => {
  const minutes = Math.floor(elapsedSeconds.value / 60)
  const seconds = elapsedSeconds.value % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
})
const missedCount = computed(() => Math.max(0, quizSize.value - passedCount.value))
const passPercentage = computed(() => {
  if (!quizSize.value) return 0
  return Math.round((passedCount.value / quizSize.value) * 100)
})
const resultTitle = computed(() => {
  if (passPercentage.value >= 90) return "Perfect"
  if (passPercentage.value >= 70) return "Great job"
  if (passPercentage.value >= 50) return "Nice try"
  return "Keep practicing"
})

watch(
  () => finished.value,
  (isFinished) => {
    if (!isFinished || completionSoundPlayed.value) return
    completionSoundPlayed.value = true

    if (passPercentage.value >= 80) {
      playQuizCompleteFanfareSong()
    } else if (passPercentage.value >= 50) {
      playQuizCompleteOkaySong()
    } else {
      playQuizCompleteFailSong()
    }
  }
)

watch(volume, (newVolume) => {
  if (currentWordAudio) currentWordAudio.volume = newVolume
})

watch(playbackRate, (newPlaybackRate) => {
  if (currentWordAudio) currentWordAudio.playbackRate = newPlaybackRate
})

watch(selectedVoice, () => {
  currentWordAudio?.pause()
})

function setVoice(voice: AudioVoice) {
  selectedVoice.value = voice
}

watch(rapidMode, (enabled) => {
  if (!enabled) return
  clearNextWordCountdown()
  successMessage.value = ""
})

function goToNextWord() {
  if (recording.value) stopRecording()
  const hasPassingAttempt = lastToneScore.value !== null && lastToneScore.value > PASS_SCORE
  if (!hasPassingAttempt && !canSkipCurrentWord.value) {
    errorMessage.value = `Try this word ${skipAttemptsRemaining.value} more ${skipAttemptsRemaining.value === 1 ? "time" : "times"} before skipping.`
    return
  }

  invalidateActiveAttempt()
  advanceToNextWord({ countAsPass: hasPassingAttempt })
}

function skipWord() {
  if (recording.value) stopRecording()
  if (!canSkipCurrentWord.value) {
    errorMessage.value = `Try this word ${skipAttemptsRemaining.value} more ${skipAttemptsRemaining.value === 1 ? "time" : "times"} before skipping.`
    return
  }

  invalidateActiveAttempt()
  advanceToNextWord({ countAsPass: false })
}

onBeforeUnmount(() => {
  stopTimer()
  clearNextWordCountdown()
  stopTracks()
  if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
  currentWordAudio?.pause()
  if (finalizeQuizTimeout) clearTimeout(finalizeQuizTimeout)
  finalizing.value = false
})
</script>

<template>

  <main class="min-h-screen text-gray-900">

    <div class="mx-auto max-w-3xl px-4 py-10">

      <header class="mb-6 mt-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold">Echo Gecko</h1>
          <p class="mt-1 text-sm text-gray-600">{{ data?.title ?? topicSlug }}</p>
        </div>
        <DojoAudioSettings :voice="selectedVoice" :playback-rate="playbackRate" @update:voice="setVoice"
          @update:playback-rate="playbackRate = $event" />
      </header>

      <section class="rounded-2xl p-5 sm:p-6" :class="(finished || finalizing) ? 'bg-transparent shadow-none' : ''">
        <div v-if="pending || loading" class="text-sm text-gray-600">Loading quiz words…</div>
        <div v-else-if="error" class="rounded-lg border border-rose-300 bg-rose-100 p-3 text-sm text-rose-700">
          Failed to load topic quiz data. Please refresh and try again.
        </div>
        <div v-else-if="!started" class="space-y-6 text-center">
          <div class="space-y-2">
            <p class="text-xs uppercase tracking-[0.2em] text-gray-500">
              Topic Pronunciation Challenge
            </p>
            <p class="text-sm text-gray-600">
              Complete {{ quizSize }} words from this topic and pass each pronunciation attempt.
            </p>
          </div>

          <button
            class="w-full rounded-xl bg-[#BFEA83] px-4 py-3 text-base font-semibold text-gray-900 transition hover:brightness-105"
            @click="startQuiz">
            Start pronunciation quiz
          </button>

          <section class="rounded-xl p-4 text-left">
            <h3 class="text-sm font-semibold text-gray-900">Before you start</h3>
            <ul class="mt-3 space-y-2 text-sm text-gray-700">
              <li class="flex items-start gap-2">
                <Ear class="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-700" aria-hidden="true" />
                <span>Make sure you are in a quiet area and can speak clearly.</span>
              </li>
              <li class="flex items-start gap-2">
                <Mic class="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-700" aria-hidden="true" />
                <span>Make sure there are no microphone obstructions.</span>
              </li>
              <li class="flex items-start gap-2">
                <SkipForward class="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-700" aria-hidden="true" />
                <span>Use “Skip” if you are still stuck after 3 scored attempts.</span>
              </li>
            </ul>
          </section>
        </div>

        <div v-else-if="finalizing" class="space-y-6 text-center">
          <div class="stat-card hero-card result-2 space-y-4">
            <div class="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-gray-500" />
            <p class="stat-label">Finalising</p>
            <h2 class="hero-title">Wrapping up your quiz...</h2>
            <p class="hero-subtext">Letting the final audio complete before showing your results.</p>
          </div>
        </div>

        <div v-else-if="finished" class="space-y-6">
          <div class="stat-card hero-card result-3 text-center">
            <p class="stat-label">Quiz Complete</p>
            <h2 class="hero-title">{{ resultTitle }}</h2>
            <p class="hero-score">{{ passPercentage }}%</p>
          </div>

          <QuizCompletionFlipStats correct-label="Passed Words" incorrect-label="Skipped Words" :correct="passedCount"
            :incorrect="missedCount" :time="formattedElapsedTime" :show-xp="false" />

          <button
            class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#BFEA83] px-4 py-3 text-base font-semibold text-gray-900 transition hover:brightness-105"
            @click="startQuiz">
            <RotateCcw class="h-5 w-5" aria-hidden="true" />
            <span>Play again</span>
          </button>
        </div>

        <div v-else-if="currentWord" class="space-y-5">
          <!-- Top status bar -->
          <div class="rounded-2xl p-4">
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Echo Gecko
                </p>
                <p class="mt-1 text-sm font-medium text-gray-800">
                  Word {{ Math.min(currentIndex + 1, quizSize) }} of {{ quizSize }}
                </p>
              </div>

              <div class="text-right">
                <p class="text-xs text-gray-500">Passed</p>
                <p class="text-lg font-bold text-gray-900">{{ passedCount }}/{{ quizSize }}</p>
              </div>
            </div>

            <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
              <div class="h-full rounded-full bg-[#BFEA83] transition-all"
                :style="{ width: `${((currentIndex + 1) / quizSize) * 100}%` }" />
            </div>

            <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>{{ formattedElapsedTime }}</span>

              <label class="inline-flex items-center gap-2">
                <input v-model="rapidMode" type="checkbox" class="h-4 w-4 rounded border-gray-300" />
                Rapid mode
              </label>
            </div>
          </div>

          <!-- Main word card -->
          <section class="rounded-3xl p-6 text-center">
            <p class="mt-4 text-6xl font-bold text-gray-900">
              {{ currentWord.word }}
            </p>

            <p v-if="currentWord.meaning" class="mt-3 text-base text-gray-600">
              {{ currentWord.meaning }}
            </p>
          </section>

          <!-- Recording preview -->
          <div v-if="recording || recordingUrl" class="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <p v-if="recording" class="text-sm font-medium text-amber-800">
              Recording... speak now.
            </p>

            <audio v-if="recordingUrl" class="mt-2 w-full" controls :src="recordingUrl" />
          </div>

          <!-- Primary action dock -->
          <div class="sticky bottom-4 z-10 rounded-3xl p-3">
            <div class="grid grid-cols-[1fr_auto_auto] gap-2">
              <button v-if="!recording && !recordedBlob"
                class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#BFEA83] px-4 py-3 text-base font-bold text-gray-900 transition hover:brightness-105 disabled:opacity-50"
                :disabled="submitting" @click="startRecording">
                <Mic class="h-5 w-5" aria-hidden="true" />
                <span>Record</span>
              </button>

              <button v-else-if="recording"
                class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FDBA74] px-4 py-3 text-base font-bold text-gray-900 transition hover:brightness-105 disabled:opacity-50"
                :disabled="submitting" @click="stopRecording">
                <Square class="h-5 w-5" aria-hidden="true" />
                <span>Stop</span>
              </button>

              <div v-else class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button v-if="canRecordAgain"
                  class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#BFEA83] px-4 py-3 text-base font-bold text-gray-900 transition hover:brightness-105 disabled:opacity-50"
                  :disabled="submitting" @click="startRecording">
                  <Mic class="h-5 w-5" aria-hidden="true" />
                  <span>Record again</span>
                </button>

                <button
                  class="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FCD34D] px-4 py-3 text-base font-bold text-gray-900 transition hover:brightness-105 disabled:opacity-50"
                  :class="canRecordAgain ? '' : 'sm:col-span-2'"
                  :disabled="recording || !recordedBlob || submitting" @click="submitAttempt">
                  <LoaderCircle v-if="submitting" class="h-5 w-5 animate-spin" aria-hidden="true" />
                  <Send v-else class="h-5 w-5" aria-hidden="true" />
                  <span>{{ submitting ? "Scoring..." : "Submit" }}</span>
                </button>
              </div>

              <button
                class="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="submitting || !canSkipCurrentWord" @click="skipWord" aria-label="Skip word"
                :title="canSkipCurrentWord ? 'Skip word' : `Try ${skipAttemptsRemaining} more ${skipAttemptsRemaining === 1 ? 'time' : 'times'} to unlock skip`">
                <Lock v-if="!canSkipCurrentWord" class="h-5 w-5" aria-hidden="true" />
                <SkipForward v-else class="h-5 w-5" aria-hidden="true" />
              </button>

              <button
                class="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                :disabled="submitting" @click="playCurrentWordAudio" aria-label="Replay audio">
                <Volume2 class="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p v-if="!canSkipCurrentWord" class="mt-2 text-center text-xs text-gray-500">
              Skip unlocks after {{ skipAttemptsRemaining }} more scored {{ skipAttemptsRemaining === 1 ? "attempt" : "attempts" }}.
            </p>
          </div>

          <!-- Success message -->
          <p v-if="successMessage && !rapidMode"
            class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {{ successMessage }}
            <span v-if="nextWordCountdownSeconds !== null" class="ml-1">
              Next word in {{ nextWordCountdownSeconds }}s
            </span>
          </p>

          <!-- Feedback -->
          <div v-if="lastToneScore !== null"
            class="rounded-3xl border border-black/5 bg-white/70 p-5 shadow-sm backdrop-blur">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Feedback
                </p>

                <p class="mt-2 text-xl font-bold"
                  :class="lastToneScore > PASS_SCORE ? 'text-emerald-700' : 'text-amber-700'">
                  {{ lastToneLabel }}
                </p>
              </div>

              <div class="rounded-2xl bg-gray-100 px-4 py-2 text-center">
                <p class="text-xs text-gray-500">Score</p>
                <p class="text-lg font-bold text-gray-900">{{ lastToneScore }}</p>
              </div>
            </div>

            <p class="mt-4 text-sm leading-6 text-gray-700">
              {{ feedback }}
            </p>

            <button
              class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#86EFAC] px-4 py-3 text-sm font-bold text-gray-900 transition hover:brightness-105 disabled:opacity-50"
              :disabled="submitting || (lastToneScore <= PASS_SCORE && !canSkipCurrentWord)" @click="goToNextWord">
              <ArrowRight class="h-4 w-4" aria-hidden="true" />
              <span>Next word</span>
            </button>

            <details v-if="detectedToneDisplayRows.length" class="mt-4 rounded-2xl bg-gray-50 p-4">
              <summary class="cursor-pointer text-sm font-semibold text-gray-700">
                Detected tones
              </summary>

              <ul class="mt-3 space-y-2 text-sm text-gray-700">
                <li v-for="row in detectedToneDisplayRows" :key="`tone-row-${row.syllable}`">
                  <span class="font-medium">
                    {{ row.character ? `Character: ${row.character}` : `Syllable ${row.syllable}` }}
                  </span>
                  <span class="text-gray-500">
                    target <span class="font-medium text-black">{{ row.token }}</span>,
                  </span>
                  heard <span class="font-semibold">{{ row.heardJyutping }}</span>
                </li>
              </ul>
            </details>
          </div>
        </div>

        <p v-if="errorMessage" class="mt-4 rounded-lg border border-rose-300 bg-rose-100 p-3 text-sm text-rose-700">
          {{ errorMessage }}
        </p>
      </section>
    </div>

  </main>
</template>

<style scoped>
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
</style>
