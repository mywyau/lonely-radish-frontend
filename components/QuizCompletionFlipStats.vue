<script setup lang="ts">
import { CheckCircle2, CircleX, Clock3, TrendingDown, TrendingUp } from '@lucide/vue'

const props = withDefaults(defineProps<{
  correct: number | string
  incorrect: number | string
  time: number | string
  correctLabel?: string
  incorrectLabel?: string
  xpEarned?: number | string
  xpLost?: number | string
  showXp?: boolean
}>(), {
  xpEarned: 0,
  xpLost: 0,
  showXp: true,
  correctLabel: 'Correct',
  incorrectLabel: 'Incorrect',
})

const showOutcomeBack = ref(false)
const showXpBack = ref(false)

const formattedXpEarned = computed(() => {
  const value = Number(props.xpEarned)
  const prefix = Number.isFinite(value) && value > 0 ? '+' : ''

  return `${prefix}${props.xpEarned} XP`
})

const formattedXpLost = computed(() => {
  const value = Number(props.xpLost)
  const prefix = Number.isFinite(value) && value > 0 ? '-' : ''

  return `${prefix}${props.xpLost} XP`
})
</script>

<template>
  <div class="completion-flip-grid" :class="{ 'completion-flip-grid-two': !showXp }" aria-label="Quiz completion stats">
    <button
      type="button"
      class="completion-flip-card hover:brightness-110"
      :class="{ 'is-flipped': showOutcomeBack }"
      aria-label="Flip between correct and incorrect answers"
      @click="showOutcomeBack = !showOutcomeBack"
    >
      <span class="completion-flip-scene">
        <span class="completion-flip-face result-0">
          <span class="stat-icon stat-icon-correct" aria-hidden="true">
            <CheckCircle2 class="h-5 w-5" />
          </span>
          <span class="stat-label">{{ correctLabel }}</span>
          <span class="stat-value">{{ correct }}</span>
        </span>

        <span class="completion-flip-face completion-flip-face-back result-2">
          <span class="stat-icon stat-icon-incorrect" aria-hidden="true">
            <CircleX class="h-5 w-5" />
          </span>
          <span class="stat-label">{{ incorrectLabel }}</span>
          <span class="stat-value">{{ incorrect }}</span>
        </span>
      </span>
    </button>

    <div class="stat-card hover:brightness-110 result-4">
      <span class="stat-icon stat-icon-time" aria-hidden="true">
        <Clock3 class="h-5 w-5" />
      </span>
      <p class="stat-label">Time Taken</p>
      <p class="stat-value">{{ time }}</p>
    </div>

    <button
      v-if="showXp"
      type="button"
      class="completion-flip-card hover:brightness-110"
      :class="{ 'is-flipped': showXpBack }"
      aria-label="Flip between XP earned and XP lost"
      @click="showXpBack = !showXpBack"
    >
      <span class="completion-flip-scene">
        <span class="completion-flip-face result-3">
          <span class="stat-icon stat-icon-xp-earned" aria-hidden="true">
            <TrendingUp class="h-5 w-5" />
          </span>
          <span class="stat-label">XP Earned</span>
          <span class="stat-value">{{ formattedXpEarned }}</span>
        </span>

        <span class="completion-flip-face completion-flip-face-back result-1">
          <span class="stat-icon stat-icon-xp-lost" aria-hidden="true">
            <TrendingDown class="h-5 w-5" />
          </span>
          <span class="stat-label">XP Lost</span>
          <span class="stat-value">{{ formattedXpLost }}</span>
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.completion-flip-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.completion-flip-card {
  min-height: 9.25rem;
  border: 0;
  border-radius: 22px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  perspective: 1200px;
  padding: 0;
  text-align: center;
}

.completion-flip-card:focus-visible {
  outline: 3px solid rgba(111, 92, 202, 0.55);
  outline-offset: 4px;
}

.completion-flip-scene {
  position: relative;
  display: block;
  min-height: 9.25rem;
  transform-style: preserve-3d;
  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.completion-flip-card.is-flipped .completion-flip-scene {
  transform: rotateY(180deg);
}

.completion-flip-face,
.stat-card {
  border-radius: 22px;
  padding: 1.5rem;
  text-align: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.completion-flip-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
}

.completion-flip-face > *,
.stat-card > * {
  transform: translateZ(1px);
}

.completion-flip-face-back {
  transform: rotateY(180deg);
}

.completion-flip-card:hover .completion-flip-face,
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
}

.completion-flip-card:hover .completion-flip-face-back {
  transform: rotateY(180deg) translateY(-3px);
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.stat-icon-correct {
  color: #15803d;
}

.stat-icon-incorrect {
  color: #b45309;
}

.stat-icon-time {
  color: #7c3aed;
}

.stat-icon-xp-earned {
  color: #15803d;
}

.stat-icon-xp-lost {
  color: #be123c;
}

.stat-label {
  display: block;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.stat-value {
  display: block;
  font-size: 1.2rem;
  font-weight: 700;
  margin-top: 0.75rem;
  color: #111827;
}

.flip-hint {
  margin-top: 0.75rem;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(17, 24, 39, 0.48);
}

.result-0 {
  background: rgba(168, 224, 182, 0.45);
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

@media (min-width: 640px) {
  .completion-flip-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .completion-flip-grid-two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .completion-flip-scene,
  .completion-flip-face,
  .stat-card {
    transition-duration: 1ms;
  }
}
</style>
