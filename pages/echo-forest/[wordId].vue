<script setup lang="ts">
import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Languages,
  LoaderCircle,
  Mic,
  Play,
  Settings,
  Sparkles,
  Sprout,
  Square,
  TriangleAlert,
  Trophy,
  Volume2,
  X,
} from "@lucide/vue"
import { useAudioVolume } from "~/composables/useAudioVolume"
import { playCorrectJingle, playGoodJingle, playIncorrectJingle } from "~/utils/sounds"
definePageMeta({
  ssr: false,
  middleware: "logged-in",
})

type PitchContour = { values: number[] }
type PitchExtractionQuality = {
  canScore: boolean
  shouldWarn: boolean
  totalPoints: number
  avgStepDelta: number
  message: string
}
type WordMeta = {
  id?: string
  word?: string
  jyutping?: string
  audio?: {
    word?: string
  }
}

const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase
const route = useRoute()
const { volume } = useAudioVolume()

type AudioVoice = 'male' | 'female'
const selectedAudioVoice = useCookie<AudioVoice>('audio-voice', {
  default: () => 'male',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 180,
})
const audioDirectory = computed(() => selectedAudioVoice.value === 'female' ? 'audio-female' : 'audio-male')
const setAudioVoice = (voice: AudioVoice) => {
  selectedAudioVoice.value = voice
}

const playbackRate = ref(1)
const minPlaybackRate = 0.4
const maxPlaybackRate = 2
const playbackStep = 0.2
const speedDeltaPercent = computed(() => Math.round((playbackRate.value - 1) * 100))
const speedDeltaLabel = computed(() => {
  if (speedDeltaPercent.value === 0) return "Normal speed"
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

const settingsDetails = ref<HTMLDetailsElement | null>(null)

const closeSettings = () => {
  settingsDetails.value?.removeAttribute("open")
}

const wordIdFromRoute = computed(() => {
  const fromParam = route.params.wordId

  if (typeof fromParam === "string") {
    return decodeURIComponent(fromParam)
  }

  if (Array.isArray(fromParam) && fromParam.length) {
    return decodeURIComponent(fromParam[0])
  }

  const fromQuery = route.query.wordId
  return typeof fromQuery === "string" ? decodeURIComponent(fromQuery) : ""
})

const { data: selectedWord } = await useAsyncData<WordMeta | null>(
  () => `tone-word-debug-${wordIdFromRoute.value || "none"}`,
  async () => {
    if (!wordIdFromRoute.value) return null
    return await $fetch(`/api/words/${encodeURIComponent(wordIdFromRoute.value)}` as string)
  },
  { watch: [wordIdFromRoute] },
)

const expectedChinese = computed(() => selectedWord.value?.word ?? "")
const expectedJyutping = computed(() => selectedWord.value?.jyutping ?? "")
const referenceAudioPath = computed(() => {
  const filename = selectedWord.value?.audio?.word
  return filename ? `${audioDirectory.value}/${filename}` : ""
})
const referenceAudioUrl = computed(() => {
  return referenceAudioPath.value ? `${cdnBase}/${referenceAudioPath.value}` : ""
})

const NEAR_PERFECT_PASS_SCORE = 80
const GOOD_JINGLE_MIN_SCORE = 30
const JINGLE_DELAY_MS = 400

const recording = ref(false)
const loading = ref(false)
const errorMessage = ref("")
const recordingUrl = ref<string | null>(null)
const mediaRecorder = ref<MediaRecorder | null>(null)
const streamRef = ref<MediaStream | null>(null)
const recorderMimeType = ref("audio/webm")
const recordedBlob = ref<Blob | null>(null)

const result = ref<null | {
  expectedJyutping: string
  acousticToneScore: number | null
  referenceToneScore: number | null
  toneScore: number
  overallScore: number
  matchType: string
  feedback: string
}>(null)

const extractedPitchContours = ref<PitchContour[]>([])
const referencePitchContours = ref<PitchContour[]>([])

let audioChunks: Blob[] = []

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getSupportedMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return "audio/webm"
}

function stopTracks() {
  streamRef.value?.getTracks().forEach((track) => track.stop())
  streamRef.value = null
}

function tokenizeJyutping(raw: string) {
  return (raw || "").toLowerCase().match(/[a-z]+[1-6]?/g) ?? []
}

function estimatePitchHz(frame: Float32Array, sampleRate: number) {
  let rms = 0
  for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i]

  rms = Math.sqrt(rms / frame.length)
  if (rms < 0.01) return 0

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

function hzToSemitone(hz: number) {
  return 12 * Math.log2(Math.max(hz, 1) / 55)
}

function evaluateContourQuality(contours: PitchContour[], expectedTokenCount: number): PitchExtractionQuality {
  const merged = contours
    .flatMap((contour) => contour.values)
    .filter((value) => Number.isFinite(value))

  const minPoints = Math.max(6, expectedTokenCount * 5)

  if (merged.length < minPoints) {
    return {
      canScore: false,
      shouldWarn: false,
      totalPoints: merged.length,
      avgStepDelta: Number.POSITIVE_INFINITY,
      message: "I couldn't capture enough steady pitch yet. Try again and hold each syllable a little longer.",
    }
  }

  const deltas: number[] = []

  for (let i = 1; i < merged.length; i++) {
    deltas.push(Math.abs(merged[i] - merged[i - 1]))
  }

  const avgStepDelta = deltas.length
    ? deltas.reduce((sum, value) => sum + value, 0) / deltas.length
    : 0
  // Single-syllable words (e.g. 企 / kei5) naturally have steeper local movement.
  // Use a softer jitter threshold to avoid over-flagging clean recordings as "noisy".
  const deltaLimit = expectedTokenCount > 1 ? 2.2 : 2.55
  const shouldWarn =
    avgStepDelta > deltaLimit &&
    (expectedTokenCount > 1 || merged.length >= 10)

  return {
    canScore: true,
    shouldWarn,
    totalPoints: merged.length,
    avgStepDelta,
    message: shouldWarn
      ? "This recording is a bit noisy, so your score may vary. Try again in a quieter place for a steadier result."
      : "",
  }
}

function resampleContour(values: number[], targetLength = 8) {
  if (values.length < 2 || values.length >= targetLength) return values

  const output: number[] = []

  for (let i = 0; i < targetLength; i++) {
    const t = (i * (values.length - 1)) / Math.max(targetLength - 1, 1)
    const left = Math.floor(t)
    const right = Math.min(values.length - 1, left + 1)
    const alpha = t - left
    output.push(values[left] * (1 - alpha) + values[right] * alpha)
  }

  return output
}

async function extractPitchContoursFromArrayBuffer(arrayBuffer: ArrayBuffer, expectedTokenCount: number): Promise<PitchContour[]> {
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

      if (pitch > 0) rawPitches.push(hzToSemitone(pitch))
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
      const bucket = trimmed.slice(start, end)
      const edgeTrim = bucket.length >= 10 ? Math.floor(bucket.length * 0.12) : 0
      const core =
        edgeTrim > 0 && bucket.length - edgeTrim * 2 >= 3
          ? bucket.slice(edgeTrim, bucket.length - edgeTrim)
          : bucket
      const normalized = resampleContour(core, 8)
      contours.push({
        values: normalized
          .slice(0, 32)
          .map((value) => Number(value.toFixed(2))),
      })
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

async function fetchReferenceContours(expectedTokenCount: number): Promise<PitchContour[]> {
  if (!referenceAudioPath.value || !expectedTokenCount) return []

  try {
    const response = await fetch(referenceAudioUrl.value)

    if (!response.ok) {
      console.warn("[tone-word-v1] reference audio fetch failed", response.status)
      return []
    }

    const buffer = await response.arrayBuffer()
    return extractPitchContoursFromArrayBuffer(buffer, expectedTokenCount)
  } catch (error) {
    console.warn("[tone-word-v1] failed to process reference audio", error)
    return []
  }
}

function playReferenceAudio() {
  if (!referenceAudioUrl.value) return
  const audio = new Audio(referenceAudioUrl.value)
  audio.volume = volume.value
  audio.playbackRate = playbackRate.value
  audio.play().catch(() => {
    errorMessage.value = "Unable to play reference audio."
  })
}

async function startRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    errorMessage.value = "MediaRecorder is not available on this browser/device."
    return
  }

  if (!expectedJyutping.value) {
    errorMessage.value = "Missing word data. Open this page from a word link."
    return
  }

  errorMessage.value = ""
  result.value = null
  extractedPitchContours.value = []
  referencePitchContours.value = []
  audioChunks = []

  try {
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

      if (recordingUrl.value) URL.revokeObjectURL(recordingUrl.value)
      recordingUrl.value = URL.createObjectURL(blob)

      stopTracks()
      mediaRecorder.value = null
    }

    mediaRecorder.value.start()
    recording.value = true
  } catch (error) {
    console.error("[tone-word-v1] failed to record", error)
    errorMessage.value = "Could not start microphone recording."
    stopTracks()
  }
}

function stopRecording() {
  if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") return
  mediaRecorder.value.stop()
  recording.value = false
}

async function runToneCheck() {
  if (!recordedBlob.value) {
    errorMessage.value = "Please record audio first."
    return
  }

  if (!expectedJyutping.value) {
    errorMessage.value = "Missing word data. Open this page from a word link."
    return
  }

  loading.value = true
  errorMessage.value = ""

  try {
    const form = new FormData()
    const extension = recorderMimeType.value.includes("mp4") ? "m4a" : "webm"

    const expectedTokens = tokenizeJyutping(expectedJyutping.value)
    const contours = await extractPitchContours(recordedBlob.value, expectedTokens.length)
    extractedPitchContours.value = contours
    const quality = evaluateContourQuality(contours, expectedTokens.length)

    if (!quality.canScore) {
      errorMessage.value = quality.message
      return
    }

    if (quality.shouldWarn) {
      errorMessage.value = quality.message
    }

    const referenceContours = await fetchReferenceContours(expectedTokens.length)
    referencePitchContours.value = referenceContours

    form.append("audio", recordedBlob.value, `tone-word.${extension}`)
    form.append("expectedJyutping", expectedJyutping.value)
    form.append("pitchSummary", JSON.stringify(contours))
    form.append("referenceSummary", JSON.stringify(referenceContours))

    const auth = await useAuth()
    const token = await auth.getAccessToken()

    result.value = await $fetch("/api/pronunciation-tone-word-v1", {
      method: "POST",
      body: form,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    await wait(JINGLE_DELAY_MS)

    if (result.value.toneScore < GOOD_JINGLE_MIN_SCORE) {
      playIncorrectJingle(0.5)
    } else if (result.value.toneScore < NEAR_PERFECT_PASS_SCORE) {
      playGoodJingle(0.55)
    } else {
      playCorrectJingle(0.85)
    }
  } catch (error: any) {
    console.error("[tone-word-v1] failed", error)
    errorMessage.value = error?.data?.statusMessage || error?.message || "Tone check request failed."
  } finally {
    loading.value = false
  }
}
</script>

<template>

  <div class="min-h-screen text-gray-900">

    <div class="mx-auto max-w-4xl px-4 py-10">

      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-3">
          <span
            class="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#CDE8C9] text-gray-900 shadow-sm"
            aria-hidden="true">
            <Sprout class="h-6 w-6" />
          </span>
          <div>
            <h1 class="text-3xl font-bold">Echo Forest</h1>
            <p class="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <AudioLines class="h-4 w-4 text-gray-500" aria-hidden="true" />
              Listen, record, then check your Cantonese tone shape.
            </p>
          </div>
        </div>

        <details ref="settingsDetails" class="group relative self-end sm:self-auto">
          <summary
            class="inline-flex list-none cursor-pointer items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-black shadow-sm transition hover:bg-gray-200">
            <Settings class="h-3.5 w-3.5" />
            <span>Settings</span>
          </summary>
          <div
            class="fixed left-1/2 top-24 z-50 max-h-[calc(100vh-7rem)] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 overflow-y-auto rounded-xl bg-gray-100 p-3 shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-none sm:w-72 sm:translate-x-0 sm:overflow-visible">
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
                  <input v-model="volume" type="range" min="0" max="1" step="0.01"
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
                  <span class="w-28 text-center tabular-nums text-xs font-semibold text-gray-900">{{ speedDeltaLabel
                    }}</span>
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
                  <button type="button"
                    class="flex-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:text-xs"
                    :class="selectedAudioVoice === 'male'
                      ? 'bg-blue-200 text-black shadow-sm'
                      : 'bg-transparent text-gray-700 hover:bg-gray-200'
                      " :aria-pressed="selectedAudioVoice === 'male'" @click="setAudioVoice('male')">
                    Male
                  </button>

                  <button type="button"
                    class="flex-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:text-xs"
                    :class="selectedAudioVoice === 'female'
                      ? 'bg-pink-200 text-black shadow-sm'
                      : 'bg-transparent text-gray-700 hover:bg-gray-200'
                      " :aria-pressed="selectedAudioVoice === 'female'" @click="setAudioVoice('female')">
                    Female
                  </button>
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div class="mt-6 rounded-2xl p-5">

        <p class="mt-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <Languages class="h-3.5 w-3.5" aria-hidden="true" />
          <span>Target Chinese</span>
        </p>
        <p class="text-3xl font-semibold">{{ expectedChinese || "—" }}</p>

        <p class="mt-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <AudioLines class="h-3.5 w-3.5" aria-hidden="true" />
          <span>Target Jyutping</span>
        </p>
        <p class="text-xl">{{ expectedJyutping || "—" }}</p>

        <div class="mt-10 flex flex-wrap items-center gap-3">
          <button
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B8DFAE] px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            :disabled="!referenceAudioUrl" @click="playReferenceAudio">
            <Volume2 class="h-4 w-4" aria-hidden="true" />
            <span>Play Reference Audio</span>
          </button>

          <button
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#8CCB81] px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            :disabled="recording || loading || !expectedJyutping" @click="startRecording">
            <Mic class="h-4 w-4" aria-hidden="true" />
            <span>Start Recording</span>
          </button>

          <button
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D8E8B3] px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            :disabled="!recording || loading" @click="stopRecording">
            <Square class="h-4 w-4" aria-hidden="true" />
            <span>Stop</span>
          </button>

          <button
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#A8D76F] px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
            :disabled="recording || !recordedBlob || loading || !expectedJyutping" @click="runToneCheck">
            <LoaderCircle v-if="loading" class="h-4 w-4 animate-spin" aria-hidden="true" />
            <Sparkles v-else class="h-4 w-4" aria-hidden="true" />
            <span>{{ loading ? "Checking..." : "Run Tone Check" }}</span>
          </button>
        </div>

        <p v-if="referenceAudioPath" class="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
          <Play class="h-3.5 w-3.5" aria-hidden="true" />
          <span>Reference: {{ referenceAudioPath }}</span>
        </p>

        <p v-else class="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
          <TriangleAlert class="h-3.5 w-3.5" aria-hidden="true" />
          <span>No reference audio found for this word.</span>
        </p>

        <p v-if="recording" class="mt-2 flex items-center gap-1.5 text-sm text-amber-700">
          <Mic class="h-4 w-4" aria-hidden="true" />
          <span>Recording... speak now.</span>
        </p>

        <audio v-if="recordingUrl" class="mt-3 w-full" controls :src="recordingUrl" />

        <p v-if="errorMessage"
          class="mt-3 flex items-start gap-2 rounded-lg border border-rose-300 bg-rose-100 p-3 text-sm text-rose-700">
          <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{{ errorMessage }}</span>
        </p>
      </div>

      <div v-if="result" class="mt-6 rounded-2xl border border-fuchsia-100 bg-white/90 p-5 shadow-sm">
        <h2 class="flex items-center gap-2 text-xl font-semibold">
          <Trophy class="h-5 w-5 text-gray-700" aria-hidden="true" />
          <span>Result</span>
        </h2>

        <dl class="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt class="flex items-center gap-1.5 text-gray-500">
              <AudioLines class="h-3.5 w-3.5" aria-hidden="true" />
              <span>Expected Jyutping</span>
            </dt>
            <dd>{{ result.expectedJyutping }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-gray-500">
              <Mic class="h-3.5 w-3.5" aria-hidden="true" />
              <span>Acoustic Tone Score</span>
            </dt>
            <dd>{{ result.acousticToneScore ?? "n/a" }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-gray-500">
              <Sparkles class="h-3.5 w-3.5" aria-hidden="true" />
              <span>Final Tone Score</span>
            </dt>
            <dd>{{ result.toneScore }}</dd>
          </div>
          <div>
            <dt class="flex items-center gap-1.5 text-gray-500">
              <CircleCheck class="h-3.5 w-3.5" aria-hidden="true" />
              <span>Overall Score</span>
            </dt>
            <dd>{{ result.overallScore }}</dd>
          </div>
        </dl>

        <p class="mt-3 flex items-start gap-2 text-sm text-gray-700">
          <CircleCheck class="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
          <span>{{ result.feedback }}</span>
        </p>

        <p class="mt-2 text-xs text-gray-500">
          Extracted pitch contours: {{ extractedPitchContours.length }} syllable bucket(s) · reference contours: {{
            referencePitchContours.length }}
        </p>
      </div>
    </div>
  </div>
</template>
