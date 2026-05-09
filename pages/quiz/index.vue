<script setup lang="ts">

import { levelSelectMetaData } from '@/utils/levels/helpers'
import { markRaw, onMounted, ref } from 'vue'
import { BookOpen, ChevronLeft, ChevronRight, Headphones, MessageSquareText, Mic2, Volume2 } from '@lucide/vue'


const {
  authReady,
  resolve,
} = useMeStateV2()

// Resolve auth once on mount (safe + idempotent)
onMounted(async () => {
  if (!authReady.value) {
    await resolve()
  }
})

// const canEnterLevel = (level: any) => {

//   if (isComingSoon(level)) return false

//   if (isFreeLevel(level.number)) return true

//   return canAccessLevelQuiz(level, entitlement.value!)
// }

const canEnterLevel = (level: any) => {

  return true
}

const levelQuizModes = [
  {
    id: 'vocab',
    label: 'Vocabulary',
    icon: markRaw(BookOpen),
    buttonClass: 'level-btn-blue',
    to: (levelId: string) => `/quiz/${levelId}/word/start-quiz`,
  },
  {
    id: 'audio',
    label: 'Audio',
    icon: markRaw(Headphones),
    buttonClass: 'level-btn-purple',
    to: (levelId: string) => `/quiz/${levelId}/audio/start-quiz`,
  },
  {
    id: 'sentences',
    label: 'Sentences',
    icon: markRaw(MessageSquareText),
    buttonClass: 'level-btn-yellow',
    to: (levelId: string) => `/quiz/${levelId}/sentences/no-audio/v3/start-quiz`,
  },
  {
    id: 'sentence-audio',
    label: 'Sentence Audio Only',
    icon: markRaw(Volume2),
    buttonClass: 'level-btn-blush',
    to: (levelId: string) => `/quiz/${levelId}/sentences/audio/v3/start-quiz`,
  },
  {
    id: 'echo-gecko',
    label: 'Echo Gecko',
    icon: markRaw(Mic2),
    buttonClass: 'level-btn-green',
    to: (levelId: string) => `/quiz/${levelId}/echo-gecko`,
  },
] as const

const selectedLevelQuizMode = ref<Record<string, number>>({})

function getSelectedLevelMode(levelId: string) {
  const modeIdx = selectedLevelQuizMode.value[levelId] ?? 0
  return levelQuizModes[modeIdx]
}

function getSelectedLevelModeIndex(levelId: string) {
  return selectedLevelQuizMode.value[levelId] ?? 0
}

function cycleLevelMode(levelId: string, direction: 1 | -1) {
  const current = selectedLevelQuizMode.value[levelId] ?? 0
  const total = levelQuizModes.length
  selectedLevelQuizMode.value[levelId] = (current + direction + total) % total
}

</script>

<template>
  <main class="levels-page max-w-4xl mx-auto py-8 px-4 space-y-8">

    <div class="mb-4">
      <BackLink />
    </div>

    <!-- Header -->
    <header class="text-center space-y-3 max-w-4xl mx-auto">
      <h1 class="font-semibold level-heading">
        Level Quiz
      </h1>
      <p class="text-gray-600 text-sm sm:text-base level-subheading">
        Progress through structured and progressively trickier Cantonese content.
      </p>
    </header>

    <!-- Grid -->
    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-6">

      <li v-for="quizLevel in levelSelectMetaData" :key="quizLevel.id" class="level-card" :class="[
        quizLevel.comingSoon
          ? 'level-locked'
          : (!canEnterLevel(quizLevel) ? 'level-locked' : '')
      ]">

        <!-- Title -->
        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-gray-900">
            {{ quizLevel.title }}
          </h2>

          <p class="text-sm text-gray-600 leading-relaxed">
            {{ quizLevel.description }}
          </p>

          <p v-if="quizLevel.comingSoon" class="text-xs text-gray-400 font-medium">
            Coming soon
          </p>
        </div>

        <!-- Buttons -->
        <div v-if="canEnterLevel(quizLevel) && !quizLevel.comingSoon" class="pt-4 space-y-3">
          <div class="quiz-mode-selector">
            <button class="level-mode-toggle" @click="cycleLevelMode(quizLevel.id, -1)" aria-label="Previous quiz mode">
              <ChevronLeft class="h-5 w-5" aria-hidden="true" />
            </button>

            <NuxtLink :to="getSelectedLevelMode(quizLevel.id).to(quizLevel.id)" class="level-btn"
              :class="getSelectedLevelMode(quizLevel.id).buttonClass">
              <component :is="getSelectedLevelMode(quizLevel.id).icon" class="h-4 w-4 shrink-0" aria-hidden="true" />

              <span>
                {{ getSelectedLevelMode(quizLevel.id).label }}
              </span>
            </NuxtLink>

            <button class="level-mode-toggle" @click="cycleLevelMode(quizLevel.id, 1)" aria-label="Next quiz mode">
              <ChevronRight class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div class="mode-dots" :aria-label="`Mode ${getSelectedLevelModeIndex(quizLevel.id) + 1} of ${levelQuizModes.length}`">
            <span v-for="(mode, modeIndex) in levelQuizModes" :key="`${quizLevel.id}-${mode.id}`" class="mode-dot"
              :class="{ 'is-active': modeIndex === getSelectedLevelModeIndex(quizLevel.id) }" />
          </div>
        </div>

        <!-- Locked -->
        <p v-else-if="!quizLevel.comingSoon" class="text-xs text-center text-gray-500 pt-4">
          Upgrade to unlock
        </p>

      </li>

    </ul>

  </main>
</template>

<style scoped>
.levels-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

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

/* Card */
.level-card {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  border-radius: 20px;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.06);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.level-card::before {
  content: '';
  position: absolute;
  inset: -45%;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='172' height='92' viewBox='0 0 172 92'%3E%3Cg fill='%231f2937' opacity='.11' font-family='Arial,sans-serif' font-weight='700'%3E%3Ctext x='8' y='34' font-size='30'%3E%3F%3C/text%3E%3Ctext x='48' y='22' font-size='16'%3E%E2%9C%A6%3C/text%3E%3Ctext x='88' y='39' font-size='26'%3E%3F%3C/text%3E%3Ctext x='133' y='24' font-size='18'%3E%E2%97%87%3C/text%3E%3Ctext x='24' y='78' font-size='17'%3E%E2%9C%93%3C/text%3E%3Ctext x='68' y='70' font-size='28'%3E%3F%3C/text%3E%3Ctext x='121' y='81' font-size='17'%3E%E2%98%85%3C/text%3E%3C/g%3E%3C/svg%3E");
  background-size: 172px 92px;
  opacity: 0.55;
  transform: rotate(-18deg);
  transform-origin: center;
}

.level-card > * {
  position: relative;
  z-index: 1;
}

.level-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.level-locked {
  opacity: 0.6;
}

/* Buttons */
.level-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  text-align: center;
  min-height: 52px;
  padding: 0.65rem 0.85rem;
  font-size: 0.85rem;
  border-radius: 14px;
  font-weight: 700;
  line-height: 1.2;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;
}

/* Colour variations */
.level-btn-blue {
  background: rgba(168, 202, 224, 0.45);
  color: #1f2937;
}

.level-btn-blue:hover {
  background: rgba(168, 202, 224, 0.65);
}

.level-btn-purple {
  background: rgba(214, 163, 209, 0.45);
  color: #1f2937;
}

.level-btn-purple:hover {
  background: rgba(214, 163, 209, 0.65);
}

.level-btn-yellow {
  background: rgba(244, 205, 39, 0.45);
  color: #1f2937;
}

.level-btn-yellow:hover {
  background: rgba(244, 205, 39, 0.65);
}

.level-btn-blush {
  background: rgb(249, 166, 166);
  color: #1f2937;
}

.level-btn-blush:hover {
  background: rgb(204, 136, 136);
}

.level-btn-green {
  background: rgba(205, 232, 201, 0.7);
  color: #1f2937;
}

.level-btn-green:hover {
  background: rgba(192, 223, 188, 0.85);
}

.quiz-mode-selector {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr) 2.5rem;
  align-items: stretch;
  column-gap: 0.75rem;
}

.level-mode-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  border-radius: 8px;
  background: transparent;
  color: #1f2937;
  font-size: 1.25rem;
  line-height: 1;
  font-weight: 700;
  transition: color 0.15s ease, transform 0.15s ease;
}

.level-mode-toggle:hover {
  color: rgba(31, 41, 55, 0.7);
  transform: translateY(-1px);
}

.mode-dots {
  display: flex;
  justify-content: center;
  gap: 0.35rem;
}

.mode-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 9999px;
  background: rgba(31, 41, 55, 0.2);
  transition: all 0.15s ease;
}

.mode-dot.is-active {
  background: rgba(31, 41, 55, 0.7);
}

</style>
