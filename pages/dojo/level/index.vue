<script setup lang="ts">

definePageMeta({
  ssr: false,
  // middleware: ['logged-in'],
})

import { ChevronLeft, ChevronRight } from '@lucide/vue'
import { jyutPingQuizSelectMetaData } from '~/utils/levels/helpers'
import { canAccessLevel, isFreeLevel } from '~/utils/levels/permissions'

const {
  isLoggedIn,
  isLoggedOut,
  entitlement,
} = useMeStateV2()

const isComingSoon = (level: any) => level.comingSoon === true

// const canEnterLevel = (level: any) => {

//   if (isLoggedOut.value) return false

//   if (isComingSoon(level)) return false

//   if (isFreeLevel(level.number)) return true

//   // 🔒 Paid levels require login
//   if (!isLoggedIn.value) return false

//   return canAccessLevel(isLoggedIn.value, entitlement.value!)
// }


const canEnterLevel = (level: any) => {

  if (isComingSoon(level)) return false
  
  // 🔒 Exercises require login
  // if (isLoggedIn.value) { return true } else { return false }
  return true;
}

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

    <div class="mb-6">
      <BackLink />
    </div>

    <!-- Header -->
    <header class="text-center space-y-3 max-w-2xl mx-auto">
      <TypewriterTitleBlock
        heading-text="Level Dojo"
        subheading-text="Strengthen your phonetic and typing proficiency with our exercises"
        heading-class="text-xl font-semibold dojo-page-heading"
        subheading-class="dojo-page-subheading"
        gap="0.75rem"
      />
    </header>

    <!-- Grid -->
    <ul class="grid grid-cols-1 sm:grid-cols-2 gap-6">

      <li v-for="quizLevel in jyutPingQuizSelectMetaData" :key="quizLevel.id" class="
          rounded-2xl
          p-6
          bg-white/75
          backdrop-blur-md
          shadow-md
          transition-all
          duration-150
          flex
          flex-col
          justify-between
          hover:-translate-y-1
          hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)]
        " :class="[
          (!canEnterLevel(quizLevel) || quizLevel.comingSoon)
            ? 'opacity-60'
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

            <NuxtLink :to="getSelectedLevelMode(quizLevel.id).to(quizLevel.id)"
              class="level-btn"
              :class="getSelectedLevelMode(quizLevel.id).buttonClass">
              {{ getSelectedLevelMode(quizLevel.id).label }}
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

<style>
.levels-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #ffec95;
  --blush: #F6E1E1;
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
.level-card {
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



.level-card:hover {
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
  min-height: 56px;
  padding: 0.6rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 8px;
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
  background: rgb(249, 166, 166);
  color: #1f2937;
}

.level-btn-blush:hover {
  background: rgb(204, 136, 136);
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
