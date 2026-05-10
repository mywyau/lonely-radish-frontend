<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"

definePageMeta({
  ssr: false,
  // middleware: ["writing-access"]
  middleware: ["word-access"]
})

type VocabWord = {
  id: string
  word: string
  jyutping?: string
  meaning?: string
}

type WriterLike = {
  animateCharacter: (options?: Record<string, unknown>) => Promise<void> | void
  loopCharacterAnimation: () => void
  showCharacter: (options?: Record<string, unknown>) => void
  hideCharacter: (options?: Record<string, unknown>) => void
  showOutline: (options?: Record<string, unknown>) => void
  hideOutline: (options?: Record<string, unknown>) => void
}

const route = useRoute()
const wordId = computed(() => route.params.id as string)

const ready = ref(false)

const {
  data: word,
  pending,
  error,
} = await useFetch<VocabWord>(() => `/api/words/${wordId.value}`, {
  key: () => `word-${wordId.value}`,
  watch: [wordId],
})

const writerHost = ref<HTMLDivElement | null>(null)
const writer = ref<WriterLike | null>(null)

const currentCharIndex = ref(0)
const isLoading = ref(false)
const isReady = ref(false)
const loadError = ref<string | null>(null)

const unsupportedCharacter = ref<string | null>(null)

async function animateCurrentCharacter() {
  if (!writer.value) return

  writer.value.hideCharacter({ duration: 0 })
  writer.value.showOutline({ duration: 0 })
  await writer.value.animateCharacter()
}

function loopAnimation() {
  if (!writer.value) return

  writer.value.hideCharacter({ duration: 0 })
  writer.value.showOutline({ duration: 0 })
  writer.value.loopCharacterAnimation()
}

async function animateWholeWord() {
  if (!selectedCharacters.value.length) return

  for (let i = 0; i < selectedCharacters.value.length; i += 1) {
    currentCharIndex.value = i
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 150))
    await animateCurrentCharacter()
    await new Promise((resolve) => setTimeout(resolve, 350))
  }
}

function showOnlyOutline() {
  if (!writer.value) return
  writer.value.hideCharacter({ duration: 0 })
  writer.value.showOutline({ duration: 0 })
}

function showCharacterAndOutline() {
  if (!writer.value) return
  writer.value.showCharacter({ duration: 0 })
  writer.value.showOutline({ duration: 0 })
}

function isHanCharacter(char: string): boolean {
  return /\p{Script=Han}/u.test(char)
}

const selectedCharacters = computed(() => {
  return Array.from(word.value?.word ?? "").filter(isHanCharacter)
})

const currentCharacter = computed(() => {
  return selectedCharacters.value[currentCharIndex.value] ?? ""
})

const progressLabel = computed(() => {
  const total = selectedCharacters.value.length
  if (total === 0) return "0 / 0"
  return `${currentCharIndex.value + 1} / ${total}`
})

function previousCharacter() {
  if (currentCharIndex.value > 0) currentCharIndex.value -= 1
}

function nextCharacter() {
  if (currentCharIndex.value < selectedCharacters.value.length - 1) {
    currentCharIndex.value += 1
  }
}

async function loadWriter(char: string) {
  if (!process.client || !char || !writerHost.value) return

  isLoading.value = true
  isReady.value = false
  loadError.value = null
  unsupportedCharacter.value = null

  try {
    writerHost.value.innerHTML = ""

    const mod = await import("hanzi-writer")
    const HanziWriter = (mod as { default?: any }).default ?? mod

    writer.value = HanziWriter.create(writerHost.value, char, {
      width: writerSize.value,
      height: writerSize.value,
      padding: writerSize.value < 260 ? 12 : 20,
      showOutline: true,
      showCharacter: false,
      // outlineColor: "#d6a3d1",
      // strokeColor: "#7e93ff",

      outlineColor: "rgba(17, 24, 39, 0.18)",
      strokeColor: "#111827",
      radicalColor: "#111827",

      strokeAnimationSpeed: 1,
      strokeHighlightSpeed: 2,
      delayBetweenStrokes: 250,
      delayBetweenLoops: 1200,
      drawingWidth: writerSize.value < 260 ? 14 : 18,
      onLoadCharDataSuccess: () => {
        isReady.value = true
        isLoading.value = false
        unsupportedCharacter.value = null
        writer.value?.hideCharacter({ duration: 0 })
        writer.value?.showOutline({ duration: 0 })
      },
      onLoadCharDataError: () => {
        unsupportedCharacter.value = char
        isReady.value = false
        isLoading.value = false
        loadError.value = null

        if (writerHost.value) {
          writerHost.value.innerHTML = ""
        }
      },
    })

  } catch (err) {
    console.error(err)
    unsupportedCharacter.value = null
    loadError.value = "Failed to initialise Hanzi Writer."
    isLoading.value = false
  }
}

const writerSize = ref(320)

function updateWriterSize() {
  if (!process.client) return

  const width = window.innerWidth
  if (width < 400) writerSize.value = 220
  else if (width < 640) writerSize.value = 260
  else writerSize.value = 320
}

onMounted(() => {
  updateWriterSize()
  window.addEventListener("resize", updateWriterSize)
})

onBeforeUnmount(() => {
  window.removeEventListener("resize", updateWriterSize)
})

watch(
  () => word.value?.id,
  () => {
    currentCharIndex.value = 0
  },
)

watch(
  [() => currentCharacter.value, writerHost, () => writerSize.value],
  async ([char, host]) => {
    if (!char || !host) return
    await nextTick()
    await loadWriter(char)
  },
  { immediate: true, flush: "post" },
)

onMounted(() => {
  ready.value = true
})
</script>

<template>
  <div v-if="ready" class="writing-page mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
    <!-- <BackLink /> -->

    <section class="hero-card rounded-2xl p-4 sm:p-6">
      <p class="page-eyebrow text-xs font-medium uppercase tracking-wide sm:text-sm">
        Follow the brush strokes
      </p>
      <h1 class="page-heading mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">
        Learn how to write
      </h1>
      <p class="page-subheading mt-2 max-w-3xl text-sm leading-5 sm:mt-3 sm:leading-6 text-black">
        Grab some pen and paper and follow the brush strokes for this word and move through each character one by one.
      </p>
    </section>

    <div class="mt-4 grid gap-4 sm:mt-6 sm:gap-6">
      <section class="practice-card rounded-2xl p-3 sm:p-5">
        <div v-if="pending" class="status-text">
          Loading word...
        </div>

        <div v-else-if="error || !word" class="status-text status-error">
          Could not load this word.
        </div>

        <template v-else>
          <div class="mt-3 grid gap-4 sm:mt-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div class="space-y-4 sm:space-y-5">
              <div class="word-card rounded-xl px-3 py-3 sm:px-4">
                <p class="card-label text-xs sm:text-sm">Word</p>
                <p class="mt-1 break-words text-xl font-bold sm:text-2xl">
                  {{ word.word }}
                </p>
                <p class="mt-2 text-xs leading-5 sm:text-sm">
                  {{ word.jyutping || "" }}
                </p>
                <p class="mt-1 text-xs font-medium text-black leading-5 sm:text-sm">
                  {{ word.meaning || "" }}
                </p>
              </div>

              <div
                class="writer-shell flex min-h-[260px] items-center justify-center rounded-2xl p-3 sm:min-h-[320px] sm:p-4">
                <div v-if="loadError" class="max-w-sm text-center text-sm status-error">
                  {{ loadError }}
                </div>

                <div v-else-if="unsupportedCharacter" class="max-w-sm text-center text-sm status-warn">
                  We do not have stroke data for “{{ unsupportedCharacter }}” yet, so writing
                  practice is not available for this character.
                </div>

                <div v-else-if="!currentCharacter" class="max-w-sm text-center text-sm status-text">
                  No Chinese character available for this word.
                </div>

                <div ref="writerHost" :style="{ width: `${writerSize}px`, height: `${writerSize}px` }" />
              </div>
            </div>

            <aside class="control-panel h-fit rounded-2xl p-3 sm:p-4">
              <div class="mb-3 sm:mb-4">
                <p class="card-label text-xs font-medium sm:text-sm">Current character</p>
                <p class="mt-1 text-2xl font-bold sm:text-3xl">
                  {{ currentCharacter || "—" }}
                </p>
                <!-- <p class="mt-1.5 text-xs sm:mt-2 sm:text-sm panel-subtext">
                  Progress: {{ progressLabel }}
                </p> -->
              </div>

              <div v-if="selectedCharacters.length > 1" class="mb-4 flex flex-wrap gap-2 sm:mb-5">
                <button v-for="(char, index) in selectedCharacters" :key="`${char}-${index}`" type="button"
                  class="char-chip rounded-lg px-3 py-1.5 text-base font-semibold transition"
                  :class="index === currentCharIndex ? 'char-chip-active' : 'char-chip-inactive'"
                  @click="currentCharIndex = index">
                  {{ char }}
                </button>
              </div>

              <div class="space-y-2.5 sm:space-y-3">
                <button type="button"
                  class="btn-primary w-full rounded-xl px-3 py-2 text-sm text-black font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
                  :disabled="!isReady" @click="animateCurrentCharacter">
                  Play strokes
                </button>

                <button type="button"
                  class="btn-secondary w-full rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
                  :disabled="!isReady" @click="loopAnimation">
                  Loop animation
                </button>

                <button type="button"
                  class="btn-secondary w-full rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
                  :disabled="!isReady || !selectedCharacters.length" @click="animateWholeWord">
                  Play whole word
                </button>
              </div>

              <div class="panel-divider my-4 sm:my-5"></div>

              <div class="space-y-2.5 sm:space-y-3">

                <button type="button"
                  class="btn-secondary w-full rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
                  :disabled="currentCharIndex >= selectedCharacters.length - 1" @click="nextCharacter">
                  Next character
                </button>

                <button type="button"
                  class="btn-secondary w-full rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
                  :disabled="currentCharIndex === 0" @click="previousCharacter">
                  Previous character
                </button>
              </div>

              <div class="panel-divider my-4 sm:my-5"></div>

              <div class="space-y-2.5 sm:space-y-3">
                <button type="button"
                  class="btn-soft w-full rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
                  :disabled="!isReady" @click="showOnlyOutline">
                  Outline only
                </button>

                <button type="button"
                  class="btn-soft w-full rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
                  :disabled="!isReady" @click="showCharacterAndOutline">
                  Show full character
                </button>
              </div>
            </aside>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.writing-page {
  --pink: #eab8e4;
  --purple: #d6a3d1;
  --blue: #a8cae0;
  --yellow: #f4cd27;
  --blush: #f6e1e1;
  --ink: #1f2937;
  --ink-strong: #111827;
}

.hero-card {
  background: rgba(234, 184, 228, 0.32);
  border: 1px solid rgba(17, 24, 39, 0.08);
  backdrop-filter: blur(8px);
  color: var(--ink-strong);
}

.hero-card h1 {
  color: var(--ink-strong);
}

.hero-card p {
  color: rgba(0, 0, 0, 0.82);
}

.eyebrow {
  color: rgba(31, 41, 55, 0.62);
}

.practice-card {
  background: rgba(255, 255, 255, 0.36);
  border: 1px solid rgba(17, 24, 39, 0.08);
  box-shadow: 0 12px 28px rgba(17, 24, 39, 0.08);
  backdrop-filter: blur(10px);
}

.word-card {
  background: rgba(168, 202, 224, 0.24);
  border: 1px solid rgba(17, 24, 39, 0.08);
  color: var(--ink-strong);
}

/* .writer-shell {
  background: rgba(246, 225, 225, 0.42);
  border: 1px dashed rgba(17, 24, 39, 0.18);
} */

.writer-shell {
  position: relative;
  overflow: hidden;

  background-color: #fffdf8;
  background-image:
    linear-gradient(rgba(130, 170, 210, 0.16) 1px, transparent 1px),
    linear-gradient(90deg, rgba(130, 170, 210, 0.16) 1px, transparent 1px);
  background-size: 32px 32px;

  border: 1px solid rgba(130, 170, 210, 0.32);
  box-shadow:
    0 12px 28px rgba(31, 41, 55, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.writer-shell::before,
.writer-shell::after {
  content: "";
  position: absolute;
  pointer-events: none;
  z-index: 0;
  background: rgba(180, 80, 80, 0.18);
}

.writer-shell::before {
  width: 1px;
  height: 100%;
  left: 50%;
  top: 0;
}

.writer-shell::after {
  height: 1px;
  width: 100%;
  left: 0;
  top: 50%;
}

.writer-shell>div {
  position: relative;
  z-index: 1;
}

.control-panel {
  background: rgba(255, 255, 255, 0.42);
  border: 1px solid rgba(17, 24, 39, 0.08);
  box-shadow: 0 10px 24px rgba(17, 24, 39, 0.08);
  backdrop-filter: blur(8px);
  color: var(--ink-strong);
}

.card-label {
  color: rgba(31, 41, 55, 0.62);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.panel-subtext {
  color: rgba(31, 41, 55, 0.72);
}

.panel-divider {
  border-top: 1px solid rgba(17, 24, 39, 0.1);
}

.status-text {
  color: rgba(31, 41, 55, 0.68);
}

.status-error {
  color: rgb(185, 28, 28);
}

.status-warn {
  color: rgb(146, 64, 14);
}

.char-chip {
  border: 1px solid rgba(17, 24, 39, 0.1);
}

.char-chip-active {
  background: rgb(126, 147, 255);
  color: rgb(0, 0, 0);
  border-color: rgba(126, 147, 255, 0.9);
  box-shadow: 0 8px 18px rgba(126, 147, 255, 0.24);
}

.char-chip-inactive {
  background: rgba(255, 255, 255, 0.6);
  color: var(--ink-strong);
}

.char-chip-inactive:hover {
  background: rgba(234, 184, 228, 0.34);
}

.btn-primary,
.btn-secondary,
.btn-soft {
  border: 1px solid rgba(17, 24, 39, 0.08);
}

.btn-primary {
  background: rgb(126, 147, 255);
  /* color: white; */
  box-shadow: 0 10px 22px rgba(126, 147, 255, 0.22);
}

.btn-primary:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(168, 202, 224, 0.38);
  color: var(--ink-strong);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(214, 163, 209, 0.34);
  transform: translateY(-1px);
}

.btn-soft {
  background: rgba(246, 225, 225, 0.66);
  color: var(--ink-strong);
}

.btn-soft:hover:not(:disabled) {
  background: rgba(234, 184, 228, 0.3);
  transform: translateY(-1px);
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-soft:disabled,
.char-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 640px) {

  .hero-card,
  .practice-card,
  .control-panel,
  .word-card,
  .writer-shell {
    backdrop-filter: blur(6px);
  }
}
</style>
