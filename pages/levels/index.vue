<script setup lang="ts">

definePageMeta({
  // middleware: ['coming-soon'],
  ssr: true,
})

import { brandColours } from '@/utils/branding/helpers'
import { levelSelectMetaData } from '@/utils/levels/helpers'
import { getLevelTopicIcon } from '@/utils/levels/topicIcons'
import { onMounted, ref } from 'vue'
import { useMeStateV2 } from '~/composables/useMeStateV2'

const {
  authReady,
  resolve,
} = useMeStateV2()

function getLevelColor(index: number) {
  return brandColours[index % brandColours.length]
}

const levelAnimationStyles = ref<Record<string, Record<string, string>>>({})
const isLevelAnimationReady = ref(false)

function generateLevelAnimationStyles() {
  const nextStyles: Record<string, Record<string, string>> = {}

  levelSelectMetaData.forEach((level, index) => {
    const reverseIndex = levelSelectMetaData.length - 1 - index
    const delay = reverseIndex * 110
    const duration = Math.round(850 + Math.random() * 360)
    const startY = Math.round(-260 - Math.random() * 180)
    const rotation = Math.round((Math.random() - 0.5) * 10)

    nextStyles[level.id] = {
      '--level-drop-delay': `${delay}ms`,
      '--level-drop-duration': `${duration}ms`,
      '--level-drop-y': `${startY}px`,
      '--level-drop-rotation': `${rotation}deg`,
    }
  })

  levelAnimationStyles.value = nextStyles
  isLevelAnimationReady.value = true
}

// --- helpers ---

// Resolve auth once on mount (safe + idempotent)
onMounted(async () => {
  generateLevelAnimationStyles()

  if (!authReady.value) {
    await resolve()
  }
})

</script>

<template>
  <main v-if="authReady" class="levels-page max-w-3xl mx-auto py-12 px-4 space-y-10">

    <header class="rounded-lg header-card">
      <h1 class="level-heading">Levels</h1>
      <p class="level-subheading mt-2">
        Explore Cantonese words and sentence patterns organised by level.
      </p>
    </header>

    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">

      <li v-for="(level, index) in levelSelectMetaData" :key="level.id"
        class="level-card relative rounded-xl p-6 transition shadow-sm hover:shadow-md hover:brightness-110" :class="[
          isLevelAnimationReady ? 'level-card-drop-in' : '',
          level.comingSoon ? 'is-disabled' : 'is-active'
        ]" :style="{
          backgroundColor: level.comingSoon
            ? 'rgba(0,0,0,0.03)'
            : getLevelColor(index),
          ...levelAnimationStyles[level.id]
        }">

        <!-- Accessible level -->
        <NuxtLink v-if="true" :to="`/level/${level.id}/v2`" class="block space-y-3">

          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1 level-card-copy">
              <div class="level-card-header">
                <div class="text-lg font-semibold text-gray-900">
                  {{ level.title }}
                </div>

                <div class="topic-icon-wrap" role="img" :aria-label="`${level.title}: ${getLevelTopicIcon(level.id).label}`">
                  <component
                    :is="getLevelTopicIcon(level.id).icon"
                    class="topic-icon"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div class="text-sm text-gray-700 mt-1">
                {{ level.description }}
              </div>
            </div>

            <div class="shrink-0 pt-6">
              <span v-if="level.comingSoon" class="pill pill-soon">Coming soon</span>
            </div>
          </div>

        </NuxtLink>

        <!-- Locked level (kept for later when you re-enable gating) -->
        <div v-else class="space-y-3 cursor-not-allowed">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1 level-card-copy">
              <div class="level-card-header">
                <div class="text-lg font-semibold text-gray-900">
                  {{ level.title }}
                </div>

                <div class="topic-icon-wrap" role="img" :aria-label="`${level.title}: ${getLevelTopicIcon(level.id).label}`">
                  <component
                    :is="getLevelTopicIcon(level.id).icon"
                    class="topic-icon"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <div class="text-sm text-gray-700 mt-1">
                {{ level.description }}
              </div>
            </div>

            <div class="shrink-0 pt-6">
              <span v-if="level.comingSoon" class="pill pill-soon">Coming soon</span>
              <span v-else class="pill pill-locked">Locked</span>
            </div>
          </div>

          <p class="text-sm text-gray-700">
            Upgrade to unlock
          </p>
        </div>

      </li>
    </ul>
  </main>

  <div v-else class="py-20 text-center text-gray-500">
    Loading levels...
  </div>
</template>

<style scoped>
/* Palette variables */
.levels-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;

  border-radius: 16px;
  padding-bottom: 2rem;
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

/* Header card */
.header-card {
  /* background: rgba(255, 255, 255, 0.65); */
  border-color: rgba(214, 163, 209, 0.40);
  backdrop-filter: blur(6px);
}

/* Level card base */
.level-card {
  background: rgba(255, 255, 255, 0.72);
  border-color: rgba(214, 163, 209, 0.35);
  backdrop-filter: blur(6px);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.03);
}

.level-card-drop-in {
  opacity: 0;
  transform: translateY(var(--level-drop-y, -320px)) rotate(var(--level-drop-rotation, 0deg)) scale(0.96);
  animation: level-drop-in var(--level-drop-duration, 950ms) cubic-bezier(0.18, 0.9, 0.28, 1.12) var(--level-drop-delay, 0ms) forwards;
  will-change: opacity, transform;
}

@keyframes level-drop-in {
  0% {
    opacity: 0;
    transform: translateY(var(--level-drop-y, -320px)) rotate(var(--level-drop-rotation, 0deg)) scale(0.96);
  }

  66% {
    opacity: 1;
    transform: translateY(10px) rotate(0deg) scale(1.015);
  }

  82% {
    transform: translateY(-4px) rotate(0deg) scale(1.005);
  }

  100% {
    opacity: 1;
    transform: translateY(0) rotate(0deg) scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .level-card-drop-in {
    opacity: 1;
    transform: none;
    animation: none;
    will-change: auto;
  }
}

/* Active hover */
.level-card.is-active:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(234, 184, 228, 0.65);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

/* Coming soon */
.level-card.is-disabled {
  opacity: 0.70;
  cursor: not-allowed;
  background: rgba(168, 202, 224, 0.18);
  /* slight blue wash */
  border-color: rgba(0, 0, 0, 0.08);
}

/* Locked (not coming soon) */
.level-card.is-locked {
  opacity: 0.85;
  border-color: rgba(244, 205, 39, 0.30);
  /* subtle yellow border hint */
}

.level-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.level-card-copy {
  padding-right: 2.25rem;
}

.topic-icon-wrap {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.topic-icon {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 2.25;
}

/* Pills */
.pill {
  display: inline-block;
  /* padding: 0.2rem 0.6rem; */
  /* border-radius: 999px; */
  font-size: 0.75rem;
  font-weight: 700;
  /* border: 1px solid rgba(0, 0, 0, 0.06); */
  color: rgba(0, 0, 0, 0.78);
}
</style>
