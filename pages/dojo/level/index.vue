<script setup lang="ts">

definePageMeta({
  ssr: false,
  // middleware: ['logged-in'],
})

import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { jyutPingQuizSelectMetaData, type LevelSelectMeta } from '~/utils/levels/helpers'

const canEnterLevel = (level: LevelSelectMeta) => !level.comingSoon

const levelQuizModes = [
  {
    id: 'jyutping',
    label: 'Jyutping only',
    buttonClass: 'level-btn-purple',
    to: (levelId: string) => `/dojo/level/jyutping/training/${levelId}/v2/start`,
  },
  {
    id: 'chinese',
    label: 'Chinese only',
    buttonClass: 'level-btn-blue',
    to: (levelId: string) => `/dojo/level/chinese/training/${levelId}/v2/start`,
  },
  {
    id: 'sentences',
    label: 'Sentences Chinese Only',
    buttonClass: 'level-btn-blush',
    to: (levelId: string) => `/dojo/level/sentences/chinese/${levelId}/v2/start`,
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
  <main class="levels-page max-w-4xl mx-auto py-10 px-4 space-y-8">

    <!-- <div class="mb-6">
      <NuxtLink :to="`/dojo`" class="text-black text-sm hover:underline">
        ← Dojo
      </NuxtLink>
    </div> -->

    <!-- <BackLink /> -->

    <!-- Header -->
    <header class="text-center space-y-3 max-w-2xl mx-auto">
      <TypewriterTitleBlock heading-text="Level Dojo"
        subheading-text="Strengthen your phonetic and typing proficiency with our exercises"
        heading-class="text-xl font-semibold dojo-page-heading" subheading-class="dojo-page-subheading" gap="0.75rem" />
    </header>

    <!-- Grid -->
    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-6">

      <li v-for="quizLevel in jyutPingQuizSelectMetaData" :key="quizLevel.id" class="dojo-level-card" :class="[
        (!canEnterLevel(quizLevel) || quizLevel.comingSoon)
          ? 'level-locked'
          : ''
      ]">

        <!-- Title -->
        <div class="space-y-2">
          <h2 class="text-lg font-semibold text-gray-900 ">
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
          <div class="grid grid-cols-[42px_1fr_42px] gap-3">
            <button class="level-mode-toggle" @click="cycleLevelMode(quizLevel.id, -1)" aria-label="Previous quiz mode">
              <ChevronLeft class="h-5 w-5" aria-hidden="true" />
            </button>

            <NuxtLink :to="getSelectedLevelMode(quizLevel.id).to(quizLevel.id)" class="level-btn"
              :class="getSelectedLevelMode(quizLevel.id).buttonClass">
              {{ getSelectedLevelMode(quizLevel.id).label }}
            </NuxtLink>

            <button class="level-mode-toggle" @click="cycleLevelMode(quizLevel.id, 1)" aria-label="Next quiz mode">
              <ChevronRight class="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div class="mode-dots"
            :aria-label="`Mode ${getSelectedLevelModeIndex(quizLevel.id) + 1} of ${levelQuizModes.length}`">
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
  --yellow: #ffec95;
  --blush: #F6E1E1;
  --dojo-panel-pattern: url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%22220%22%20height%3D%22120%22%20viewBox%3D%220%200%20220%20120%22%3E%0A%20%20%3Cg%20fill%3D%22%231f2937%22%20opacity%3D%22.055%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-weight%3D%22700%22%3E%0A%20%20%20%20%3Ctext%20x%3D%2212%22%20y%3D%2234%22%20font-size%3D%2218%22%3Eaa1%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%2274%22%20y%3D%2226%22%20font-size%3D%2214%22%3Ejyut6%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%22145%22%20y%3D%2238%22%20font-size%3D%2222%22%3E%E7%B2%B5%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%22178%22%20y%3D%2228%22%20font-size%3D%2214%22%3E%E2%8C%98%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%2222%22%20y%3D%2276%22%20font-size%3D%2215%22%3Engo5%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%2286%22%20y%3D%2272%22%20font-size%3D%2224%22%3E%E6%89%93%E5%AD%97%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%22163%22%20y%3D%2282%22%20font-size%3D%2215%22%3Etype%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%2242%22%20y%3D%22110%22%20font-size%3D%2217%22%3Ezik1%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%22124%22%20y%3D%22108%22%20font-size%3D%2214%22%3Espace%3C/text%3E%0A%20%20%20%20%3Ctext%20x%3D%22184%22%20y%3D%22112%22%20font-size%3D%2218%22%3E%E2%86%B5%3C/text%3E%0A%20%20%3C/g%3E%0A%3C/svg%3E");
}

.dojo-page-heading {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39);
}

.dojo-page-subheading {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

/* Card */
.dojo-level-card {
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

.dojo-level-card::before {
  content: '';
  position: absolute;
  inset: -45%;
  z-index: 0;
  pointer-events: none;
  background-image: var(--dojo-panel-pattern);
  background-size: 220px 120px;
  opacity: 0.75;
  transform: rotate(-18deg);
  transform-origin: center;
}

.dojo-level-card>* {
  position: relative;
  z-index: 1;
}

.dojo-level-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.08);
}

.level-locked {
  opacity: 0.6;
}

.level-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 52px;
  padding: 0.65rem 0.85rem;
  font-size: 0.85rem;
  border-radius: 14px;
  font-weight: 600;
  line-height: 1.2;
  transition: all 0.15s ease;
}

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

.level-btn-blush {
  background: rgba(246, 180, 180, 0.42);
  color: #1f2937;
}

.level-btn-blush:hover {
  background: rgba(246, 180, 180, 0.62);
}

.level-mode-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  border-radius: 8px;
  background: transparent;
  color: #1f2937;
  font-size: 1.25rem;
  line-height: 1;
  font-weight: 700;
  transition: all 0.15s ease;
}

.level-mode-toggle svg {
  display: block;
}

.level-mode-toggle:hover {
  background: transparent;
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
