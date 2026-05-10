<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: "word-access",
})

import { MAX_AUDIO_BYTES, MAX_RECORDING_SECONDS } from "~/config/audio_config"

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const cdnBase = runtimeConfig.public.cdnBase

type AudioVoice = 'male' | 'female'
const selectedAudioVoice = useCookie<AudioVoice>('audio-voice', {
  default: () => 'male',
  sameSite: 'lax',
})
const audioDirectory = computed(() => selectedAudioVoice.value === 'female' ? 'audio-female' : 'audio-male')
const setAudioVoice = (voice: AudioVoice) => {
  selectedAudioVoice.value = voice
}

const wordSlug = computed(() => decodeURIComponent(route.params.word as string))
const topicSlug = computed(() => String(route.params.topic ?? ""))

const idx = computed(() => {
  const raw = route.params.idx as string | undefined
  const parsed = Number.parseInt(raw ?? "", 10)
  return Number.isNaN(parsed) ? 0 : parsed
})

const { authReady, isLoggedIn } = useMeStateV2()

type WordResponse = {
  examples?: Array<{
    sentence?: string
    jyutping?: string
    meaning?: string
  }>
  audio?: {
    examples?: string[]
  }
}

const { data, error } = await useAsyncData<WordResponse>(
  () => `word-${wordSlug.value}`,
  () => $fetch(`/api/words/${wordSlug.value}` as string),
  {
    server: true,
  }
)

const word = computed(() => data.value)

const selectedExample = computed(() => {
  return word.value?.examples?.[idx.value] ?? null
})

const practiceTarget = computed(() => {
  const example = selectedExample.value

  if (!example?.sentence || !example?.jyutping || !example?.meaning) {
    return null
  }

  return {
    chinese: example.sentence,
    jyutping: example.jyutping,
    meaning: example.meaning,
    mode: "phrase" as const,
  }
})

const phraseAudioSrc = computed(() => {
  const filename = word.value?.audio?.examples?.[idx.value]
  return filename ? `${cdnBase}/${audioDirectory.value}/${filename}` : null
})

const supported = ref(false)
const recording = ref(false)
const loading = ref(false)
const aiState = ref<"" | "error">("")
const recordingTime = ref(0)
const transcript = ref("")
const feedback = ref("")
const score = ref<number | null>(null)
const recordingUrl = ref<string | null>(null)
const mediaRecorder = ref<MediaRecorder | null>(null)
const streamRef = ref<MediaStream | null>(null)
const recorderMimeType = ref("")

const aiUsage = ref<{
  attempts: number
  remaining: number
  limit: number
} | null>(null)

const animatedRemaining = ref(0)
const animatedPercent = ref(0)

const recordedBlob = ref<Blob | null>(null)
const cancelRequested = ref(false)

const progress = computed(() => {
  return (recordingTime.value / MAX_RECORDING_SECONDS) * 100
})

let timer: ReturnType<typeof setInterval> | null = null
let tipTimer: ReturnType<typeof setInterval> | null = null
let audioChunks: Blob[] = []

async function fetchAIUsage() {
  if (!isLoggedIn.value) return

  try {
    const auth = await useAuth()
    const token = await auth.getAccessToken()

    const usage = await $fetch<{
      attempts: number
      remaining: number
      limit: number
    }>(
      "/api/ai/usage",
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      })

    aiUsage.value = usage
    animateCount(animatedRemaining, usage.remaining)
    animateCount(animatedPercent, (usage.remaining / usage.limit) * 100)
  } catch (e) {
    console.error("[frontend] failed to fetch AI usage", e)
  }
}

const echoLabAccess = ref<null | {
  allowed: boolean
  reason: string
  totalXp: number
  unlockedWordCount: number
  minXp: number
  minUnlockedWords: number
  wordUnlocked: boolean
}>(null)

async function fetchEchoLabAccess() {
  if (!isLoggedIn.value) return

  try {
    const auth = await useAuth()
    const token = await auth.getAccessToken()

    echoLabAccess.value = await $fetch(
      "/api/echo-lab/access",
      {
        method: "GET",
        query: { wordId: wordSlug.value, scope: "topic", slug: topicSlug.value },
        headers: { Authorization: `Bearer ${token}` },
      })
  } catch (e) {
    console.error("[frontend] failed to fetch echo lab access", e)
  }
}

const canUseEchoLab = computed(() => echoLabAccess.value?.allowed ?? false)

function getSupportedMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
  ]

  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return ""
}

function stopTracks() {
  streamRef.value?.getTracks().forEach((track) => track.stop())
  streamRef.value = null
}

function clearRecordingTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

async function startRecording() {
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    aiState.value = "error"
    return
  }

  if (!practiceTarget.value) {
    aiState.value = "error"
    return
  }

  try {
    aiState.value = ""
    resetFeedback()
    clearSavedRecording()
    audioChunks = []
    cancelRequested.value = false

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    streamRef.value = stream

    const supportedMimeType = getSupportedMimeType()

    mediaRecorder.value = supportedMimeType
      ? new MediaRecorder(stream, { mimeType: supportedMimeType })
      : new MediaRecorder(stream)

    recorderMimeType.value =
      mediaRecorder.value.mimeType || supportedMimeType || "audio/webm"

    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data)
      }
    }

    mediaRecorder.value.onstop = async () => {
      try {
        const audioBlob = new Blob(audioChunks, { type: recorderMimeType.value })
        audioChunks = []

        if (cancelRequested.value) {
          cancelRequested.value = false
          clearSavedRecording()
          return
        }

        if (audioBlob.size < 1000) {
          console.error("[frontend] audio blob too small")
          aiState.value = "error"
          return
        }

        if (audioBlob.size > MAX_AUDIO_BYTES) {
          alert("Recording is too long. Please keep it under 10 seconds.")
          aiState.value = "error"
          return
        }

        clearSavedRecording()
        recordedBlob.value = audioBlob
        recordingUrl.value = URL.createObjectURL(audioBlob)
      } catch (e) {
        console.error("[frontend] failed to prepare recording", e)
        aiState.value = "error"
      } finally {
        mediaRecorder.value = null
        stopTracks()
      }
    }

    mediaRecorder.value.start()
    recording.value = true
    recordingTime.value = 0

    timer = setInterval(() => {
      recordingTime.value++

      if (recordingTime.value >= MAX_RECORDING_SECONDS) {
        stopRecording()
      }
    }, 1000)
  } catch (e) {
    console.error("[frontend] failed to start recording", e)
    aiState.value = "error"
    recording.value = false
    stopTracks()
  }
}

function stopRecording() {
  if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") return

  recording.value = false
  clearRecordingTimer()
  mediaRecorder.value.stop()
}

function cancelRecording() {
  if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") return

  cancelRequested.value = true
  recording.value = false
  clearRecordingTimer()
  mediaRecorder.value.stop()
}

function tryAgain() {
  resetRecording()
}

function nextTip() {
  tipIndex.value = (tipIndex.value + 1) % tips.length
}

function goBack() {
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo("/")
  }
}

function clearSavedRecording() {
  if (recordingUrl.value) {
    URL.revokeObjectURL(recordingUrl.value)
    recordingUrl.value = null
  }

  recordedBlob.value = null
}

function resetFeedback() {
  transcript.value = ""
  feedback.value = ""
  score.value = null
  aiState.value = ""
}

function resetRecording() {
  resetFeedback()
  clearSavedRecording()

  audioChunks = []
  cancelRequested.value = false
  mediaRecorder.value = null
  recording.value = false
  loading.value = false
  recordingTime.value = 0
  clearRecordingTimer()
  stopTracks()
}

async function submitRecording() {
  if (!recordedBlob.value || !practiceTarget.value) {
    aiState.value = "error"
    return
  }

  try {
    aiState.value = ""
    loading.value = true

    const extension = recorderMimeType.value.includes("mp4") ? "m4a" : "webm"

    const formData = new FormData()
    formData.append("audio", recordedBlob.value, `recording.${extension}`)
    // formData.append("expectedJyutping", practiceTarget.value.jyutping) // v2
    // formData.append("expectedChinese", practiceTarget.value.chinese) // v2

    formData.append("wordId", wordSlug.value)
    formData.append("exampleIndex", String(idx.value))
    formData.append("scope", "topic")
    formData.append("slug", topicSlug.value)

    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const res = await $fetch<{
      transcript: string
      feedback: string
      score: number
      remainingAttempts: number
      limit: number
    }>(
      "/api/pronunciation-check-v3",
      {
        method: "POST",
        body: formData,
        headers: { Authorization: `Bearer ${token}` },
      })

    transcript.value = res.transcript
    feedback.value = res.feedback
    score.value = res.score

    if (score.value > 65) {
      playCorrectJingle(0.7)
    } else {
      playIncorrectJingle(0.4)
    }

    if (aiUsage.value) {
      aiUsage.value.remaining = res.remainingAttempts
      aiUsage.value.attempts = aiUsage.value.limit - res.remainingAttempts

      animateCount(animatedRemaining, res.remainingAttempts)
      animateCount(
        animatedPercent,
        (res.remainingAttempts / aiUsage.value.limit) * 100
      )
    } else {
      aiUsage.value = {
        remaining: res.remainingAttempts,
        attempts: res.limit - res.remainingAttempts,
        limit: res.limit,
      }

      animateCount(animatedRemaining, res.remainingAttempts)
      animateCount(animatedPercent, (res.remainingAttempts / res.limit) * 100)
    }
  } catch (e) {
    console.error("[frontend] pronunciation upload failed", e)
    aiState.value = "error"
  } finally {
    loading.value = false
  }
}

const tips = [
  "If something looks wrong, try recording again or refreshing the page.",
  "Make sure the environment is quiet and speech is clear.",
  "Speaking slightly slower may improve recognition accuracy.",
  "Pronounce each syllable clearly and confidently.",
  "Listen to the full phrase carefully before recording.",
  "Say the phrase naturally, but not too quickly.",
  "Check the quality of your own recording.",
  "Practice out loud before submitting to use your tokens more efficiently.",
  "Make sure the recording captures the entire phrase.",
  "Free users get 10 requests per month.",
  "Upgrade for 3000 requests per month.",
]

const tipIndex = ref(0)
const showGuidancePanel = ref(false)

// watch([authReady, isLoggedIn], ([ready, loggedIn]) => {
//   if (ready && loggedIn) {
//     fetchAIUsage()
//   }
// }, { immediate: true })

watch([authReady, isLoggedIn], ([ready, loggedIn]) => {
  if (ready && loggedIn) {
    fetchAIUsage()
    fetchEchoLabAccess()
  }
}, { immediate: true })

onMounted(() => {
  supported.value = !!(navigator.mediaDevices && window.MediaRecorder)

  tipTimer = setInterval(() => {
    nextTip()
  }, 6000)
})

onUnmounted(() => {
  if (tipTimer) clearInterval(tipTimer)
  resetRecording()
})
</script>

<template>
  <div class="min-h-[70vh] flex items-center justify-center p-6">
    <div class="max-w-xl w-full text-center space-y-6">
      <!-- <div class="w-full text-left mb-6">
        <button @click="goBack" class="inline-flex items-center text-sm text-black hover:underline">
          ← Back
        </button>
      </div> -->

      <!-- <BackLink /> -->

      <div v-if="supported" class="flex justify-end">
        <div class="flex rounded-full bg-gray-100 p-1" aria-label="Audio voice">
          <button type="button" class="rounded-full px-3 py-1 text-xs font-medium transition"
            :class="selectedAudioVoice === 'male' ? 'bg-blue-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'"
            :aria-pressed="selectedAudioVoice === 'male'" @click="setAudioVoice('male')">
            Male
          </button>
          <button type="button" class="rounded-full px-3 py-1 text-xs font-medium transition"
            :class="selectedAudioVoice === 'female' ? 'bg-pink-100 text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'"
            :aria-pressed="selectedAudioVoice === 'female'" @click="setAudioVoice('female')">
            Female
          </button>
        </div>
      </div>

      <h1 class="text-2xl font-bold mb-2">Echo Lab</h1>
      <p class="text-sm text-gray-500">
        Practice the phrase by listening, recording, and reviewing feedback.
      </p>

      <div v-if="aiState === 'error'" class="text-red-500 text-sm space-y-6">
        <p>
          Something went wrong analysing your pronunciation.
          Please try again.
        </p>

        <button @click="tryAgain" class="px-4 py-2 bg-gray-300 text-black rounded">
          Try Again
        </button>
      </div>

      <div v-if="supported" class="space-y-8">
        <div v-if="practiceTarget" class="mt-4 space-y-2">
          <p class="text-3xl font-bold">{{ practiceTarget.chinese }}</p>
          <p class="text-gray-500 text-sm">{{ practiceTarget.jyutping }}</p>
          <p class="text-gray-500 text-sm">{{ practiceTarget.meaning }}</p>
        </div>

        <div v-if="phraseAudioSrc" class="flex justify-center pt-2">
          <AudioButton :src="phraseAudioSrc" size="lg" />
        </div>

        <div class="mt-4 mb-4 text-sm text-gray-500 space-y-1">
          <p>1. Listen to the phrase</p>
          <p>2. Record your pronunciation</p>
          <p>3. Review your recording</p>
          <p>4. Submit when ready</p>
        </div>

        <div v-if="echoLabAccess && !echoLabAccess.allowed"
          class="mx-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
          <p class="font-semibold">Echo Lab unlock required</p>

          <p v-if="echoLabAccess.reason === 'needs_more_xp'">
            Earn {{ Math.max(echoLabAccess.minXp - echoLabAccess.totalXp, 0) }} more XP to unlock free pronunciation
            feedback.
          </p>

          <p v-else-if="echoLabAccess.reason === 'needs_more_unlocks'">
            Unlock {{ Math.max(echoLabAccess.minUnlockedWords - echoLabAccess.unlockedWordCount, 0) }} more words to
            use free pronunciation feedback.
          </p>

          <p v-else-if="echoLabAccess.reason === 'word_locked'">
            Unlock this word first before using Echo Lab on it.
          </p>
        </div>

        <div class="flex flex-col items-center gap-8">
          <button v-if="!recording && !recordingUrl" :disabled="loading || !practiceTarget || !canUseEchoLab"
            @click="startRecording" class="px-4 py-2 bg-black font-semibold rounded disabled:opacity-50">
            <span
              class="bg-gradient-to-r from-[#7ec6f3] via-[#5aaee6] to-[#3f8fd8] bg-clip-text text-transparent hover:brightness-125 transition">
              Start Recording
            </span>
          </button>

          <div v-if="aiUsage" class="text-sm text-gray-700 mt-3 space-y-6 w-full max-w-xs">

            <div class="font-medium">AI Usage</div>

            <span>
              {{ animatedRemaining.toLocaleString() }} requests remaining
            </span>

            <div class="w-full h-2 bg-gray-300 rounded overflow-hidden">
              <div class="h-2 bg-blue-300" :style="{ width: animatedPercent + '%' }" />
            </div>
          </div>

          <div v-if="recording" class="w-64 space-y-4">
            <p class="text-red-500 text-sm">
              Recording... {{ recordingTime }} / {{ MAX_RECORDING_SECONDS }}s
            </p>

            <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div class="bg-red-500 h-2 transition-all duration-200 ease-out" :style="{ width: progress + '%' }" />
            </div>
          </div>

          <div v-if="recordingUrl" class="flex flex-col items-center gap-2">
            <p class="text-sm text-gray-500">Your recording</p>
            <audio :src="recordingUrl" controls class="w-64" />
          </div>

          <div v-if="recording" class="flex items-center gap-3">

            <button @click="stopRecording" :disabled="loading"
              class="px-4 py-2 bg-red-500 text-black font-semibold rounded hover:brightness-125 transition">
              Stop Recording
            </button>

            <button @click="cancelRecording" :disabled="loading"
              class="px-4 py-2 bg-gray-300 text-black font-semibold rounded hover:brightness-110 transition">
              Cancel Recording
            </button>
          </div>

          <div v-if="recordingUrl && !recording && !feedback" class="flex items-center gap-3">
            <button @click="submitRecording" :disabled="loading || !canUseEchoLab"
              class="px-4 py-2 bg-black text-white font-semibold rounded hover:brightness-110 transition disabled:opacity-50">
              Submit Recording
            </button>

            <button @click="tryAgain" :disabled="loading"
              class="px-4 py-2 bg-gray-300 text-black rounded hover:brightness-110 transition">
              Record Again
            </button>
          </div>

          <p v-if="loading" class="text-gray-500 text-sm flex items-center gap-2">
            <span class="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
            Processing pronunciation...
          </p>
        </div>

        <div v-if="feedback"
          class="mx-auto max-w-md text-left bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <h2 class="font-semibold text-gray-700">Feedback</h2>

          <p class="text-gray-800 leading-relaxed">
            {{ feedback }}
          </p>

          <div v-if="score !== null" class="rounded-lg p-4 text-center" :class="{
            'bg-green-50 border border-green-200': score >= 90,
            'bg-yellow-50 border border-yellow-200': score >= 70 && score < 90,
            'bg-red-50 border border-red-200': score < 70
          }">
            <p class="text-sm text-gray-500">Pronunciation Score</p>
            <p class="text-3xl font-bold">{{ score }}</p>
          </div>
        </div>

        <button v-if="transcript && !recording" @click="tryAgain"
          class="px-4 py-2 bg-gray-300 text-black rounded hover:brightness-110 transition">
          Try Again
        </button>
      </div>

      <div v-else>
        Your browser does not support microphone recording.
      </div>

      <section class="mt-6 max-w-md mx-auto text-xs text-gray-500">
        <button
          class="w-full rounded-md px-3 py-2 text-center hover:underline font-medium text-gray-700 hover:bg-[#A8CAE0]/30 transition"
          type="button" @click="showGuidancePanel = !showGuidancePanel">
          {{ showGuidancePanel ? 'Hide warning and tips' : 'Show warning and tips' }}
        </button>

        <Transition name="tip-expand">
          <div v-if="showGuidancePanel" class="mt-3 space-y-4">
            <div class="bg-gray-50 border border-gray-200 rounded-md p-3 space-y-2">
              <p class="font-medium text-gray-600">
                ⚠️ AI pronunciation feedback
              </p>

              <p>
                This feature uses AI speech recognition to estimate pronunciation.
                Results may occasionally be inaccurate.
              </p>

              <p>
                <strong>Privacy:</strong> Your voice recording is processed securely for
                pronunciation only and is <strong>not stored</strong>. Audio is temporary and is deleted
                immediately after processing.
              </p>
            </div>

            <div class="p-4">
              <p class="font-medium text-gray-600 mb-3">
                Tips
              </p>

              <div class="flex items-center justify-between gap-3">
                <Transition name="tip-fade" mode="out-in">
                  <p :key="tipIndex" class="text-center flex-1 leading-relaxed">
                    {{ tips[tipIndex] }}
                  </p>
                </Transition>
              </div>

              <div class="flex justify-center gap-1 mt-3">
                <span v-for="(tip, i) in tips" :key="i" class="w-1.5 h-1.5 rounded-full"
                  :class="i === tipIndex ? 'bg-gray-600' : 'bg-gray-300'" />
              </div>
            </div>
          </div>
        </Transition>
      </section>
    </div>
  </div>
</template>

<style scoped>
.tip-expand-enter-active,
.tip-expand-leave-active {
  transition: all 0.2s ease;
}

.tip-expand-enter-from,
.tip-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.tip-fade-enter-active,
.tip-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.tip-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.tip-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
