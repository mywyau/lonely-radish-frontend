<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue"

definePageMeta({
    ssr: false,
    // middleware: ["writing-access"],
    middleware: ["word-access"]
})

type ExampleSentence = {
    id: string
    sentence: string
    jyutping?: string
    meaning?: string
}

type VocabWord = {
    id: string
    word: string
    jyutping?: string
    meaning?: string
    examples?: ExampleSentence[]
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
const sentenceIndex = computed(() => Number(route.params.idx))

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

const viewportWidth = ref(1024)

function updateViewportWidth() {
    if (!process.client) return
    viewportWidth.value = window.innerWidth
}

onMounted(() => {
    updateViewportWidth()
    window.addEventListener("resize", updateViewportWidth)
})

onBeforeUnmount(() => {
    if (!process.client) return
    window.removeEventListener("resize", updateViewportWidth)
})

const writerSize = computed(() => {
    if (viewportWidth.value < 380) return 220
    if (viewportWidth.value < 640) return 260
    return 320
})

const writerPadding = computed(() => {
    if (viewportWidth.value < 640) return 12
    return 20
})

const drawingWidth = computed(() => {
    if (viewportWidth.value < 640) return 14
    return 18
})

function isHanCharacter(char: string): boolean {
    return /\p{Script=Han}/u.test(char)
}

const selectedExample = computed(() => {
    const examples = word.value?.examples ?? []
    return examples[sentenceIndex.value] ?? null
})

const selectedCharacters = computed(() => {
    return Array.from(selectedExample.value?.sentence ?? "").filter(isHanCharacter)
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

async function animateWholeSentence() {
    if (!selectedCharacters.value.length) return

    for (let i = 0; i < selectedCharacters.value.length; i += 1) {
        currentCharIndex.value = i
        await nextTick()
        await new Promise((resolve) => setTimeout(resolve, 150))
        await animateCurrentCharacter()
        await new Promise((resolve) => setTimeout(resolve, 300))
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

watch(
    () => selectedExample.value?.id,
    () => {
        currentCharIndex.value = 0
    },
)

watch(
    [() => currentCharacter.value, writerHost, writerSize],
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
    <div v-if="ready" class="sentence-page mx-auto max-w-4xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <div class="mb-4 sm:mb-6">
            <BackLink />
        </div>

        <header class="header-card rounded-2xl p-4 sm:p-6">
            <p class="page-eyebrow text-xs font-medium uppercase tracking-wide sm:text-sm">
                Follow the brush strokes
            </p>
            <h1 class="page-heading mt-1 text-2xl font-bold sm:mt-2 sm:text-3xl">
                Learn how to write
            </h1>
            <p class="page-subheading mt-2 max-w-3xl text-sm leading-5 sm:mt-3 sm:leading-6">
                Grab some pen and paper and follow the brush strokes for this sentence. You can move through each
                character one by one.
            </p>
        </header>

        <div class="mt-4 grid gap-4 sm:mt-6 sm:gap-6">
            <section class="page-card rounded-2xl p-3 shadow-sm sm:p-5">
                <div v-if="pending" class="status-text">
                    Loading sentence...
                </div>

                <div v-else-if="error || !word" class="status-text status-error">
                    Could not load this word.
                </div>

                <div v-else-if="!selectedExample" class="status-text status-error">
                    Sentence not found.
                </div>

                <template v-else>
                    <div class="mt-3 grid gap-4 sm:mt-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                        <div class="space-y-4 sm:space-y-5">
                            <div class="content-card rounded-xl px-3 py-3 sm:px-4">
                                <p class="card-label text-xs sm:text-sm">Sentence</p>
                                <p class="mt-1 break-words text-xl font-bold text-gray-900 sm:text-2xl">
                                    {{ selectedExample.sentence }}
                                </p>
                                <p class="mt-2 text-xs leading-5 text-gray-600 sm:text-sm">
                                    {{ selectedExample.jyutping || "" }}
                                </p>
                                <p class="mt-1 text-xs leading-5 text-black font-medium sm:text-sm">
                                    {{ selectedExample.meaning || "" }}
                                </p>
                            </div>

                            <div
                                class="writer-card flex min-h-[260px] items-center justify-center rounded-2xl p-3 sm:min-h-[320px] sm:p-4">
                                <div v-if="loadError" class="max-w-sm text-center text-sm status-error">
                                    {{ loadError }}
                                </div>

                                <div v-else-if="unsupportedCharacter" class="max-w-sm text-center text-sm status-warn">
                                    We do not have stroke data for “{{ unsupportedCharacter }}” yet, so writing
                                    practice is not available for this character.
                                </div>

                                <div v-else-if="!currentCharacter" class="max-w-sm text-center text-sm status-text">
                                    No Chinese character available for this sentence.
                                </div>

                                <div ref="writerHost"
                                    :style="{ width: `${writerSize}px`, height: `${writerSize}px` }" />
                            </div>
                        </div>

                        <aside class="side-card h-fit rounded-2xl p-3 shadow-sm sm:p-4">
                            <div class="mb-3 sm:mb-4">
                                <p class="card-label text-xs font-medium sm:text-sm">Current character</p>
                                <p class="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">
                                    {{ currentCharacter || "—" }}
                                </p>
                                <!-- <p class="mt-1.5 text-xs text-gray-600 sm:mt-2 sm:text-sm">
                                    Progress: {{ progressLabel }}
                                </p> -->
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
                                    :disabled="!isReady || !selectedCharacters.length" @click="animateWholeSentence">
                                    Play whole sentence
                                </button>
                            </div>

                            <div class="section-divider my-4 sm:my-5"></div>

                            <div class="space-y-2.5 sm:space-y-3">

                                <button type="button"
                                    class="btn-secondary w-full rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
                                    :disabled="currentCharIndex >= selectedCharacters.length - 1"
                                    @click="nextCharacter">
                                    Next character
                                </button>

                                <button type="button"
                                    class="btn-secondary w-full rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
                                    :disabled="currentCharIndex === 0" @click="previousCharacter">
                                    Previous character
                                </button>
                            </div>

                            <div class="section-divider my-4 sm:my-5"></div>

                            <div class="space-y-2.5 sm:space-y-3">
                                <button type="button"
                                    class="btn-tertiary w-full rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
                                    :disabled="!isReady" @click="showOnlyOutline">
                                    Outline only
                                </button>

                                <button type="button"
                                    class="btn-tertiary w-full rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 sm:px-4 sm:py-2.5"
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
.sentence-page {
    --pink: #eab8e4;
    --purple: #d6a3d1;
    --blue: #a8cae0;
    --yellow: #f4cd27;
    --blush: #f6e1e1;
    --ink: #1f2937;
    --ink-strong: #111827;
}

.header-card {
    background: rgba(234, 184, 228, 0.32);
    border: 1px solid rgba(17, 24, 39, 0.08);
    backdrop-filter: blur(8px);
    color: var(--ink-strong);
}

.page-heading {
    color: var(--ink-strong);
}

.page-subheading {
    color: rgba(31, 41, 55, 0.82);
}

.page-eyebrow {
    color: rgba(31, 41, 55, 0.62);
}

.page-card {
    background: rgba(255, 255, 255, 0.36);
    border: 1px solid rgba(17, 24, 39, 0.08);
    box-shadow: 0 12px 28px rgba(17, 24, 39, 0.08);
    backdrop-filter: blur(10px);
}

.content-card {
    background: rgba(168, 202, 224, 0.24);
    border: 1px solid rgba(17, 24, 39, 0.08);
    color: var(--ink-strong);
}

.writer-card {
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

.writer-card::before,
.writer-card::after {
    content: "";
    position: absolute;
    pointer-events: none;
    z-index: 0;
    background: rgba(180, 80, 80, 0.18);
}

.writer-card::before {
    width: 1px;
    height: 100%;
    left: 50%;
    top: 0;
}

.writer-card::after {
    height: 1px;
    width: 100%;
    left: 0;
    top: 50%;
}

.writer-card>div {
    position: relative;
    z-index: 1;
}

.side-card {
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

.section-divider {
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

.btn-primary,
.btn-secondary,
.btn-tertiary {
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

.btn-tertiary {
    background: rgba(246, 225, 225, 0.66);
    color: var(--ink-strong);
}

.btn-tertiary:hover:not(:disabled) {
    background: rgba(234, 184, 228, 0.3);
    transform: translateY(-1px);
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-tertiary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
}

@media (max-width: 640px) {

    .header-card,
    .page-card,
    .side-card,
    .content-card,
    .writer-card {
        backdrop-filter: blur(6px);
    }
}
</style>