<script setup lang="ts">
import { CircleCheck, Eye, Sparkles, TrendingUp, Trophy, UnlockKeyhole } from '@lucide/vue'
import { markRaw, type Component } from 'vue'
definePageMeta({
  ssr: false
})

type UserStats = {
  total_xp: number | string
  words_maxed: number | string
  words_seen: number | string
  words_unlocked: number | string
  total_correct: number | string
  total_wrong: number | string
  xp_this_week: number | string
}

type StatCard = {
  label: string
  value: number
  icon: Component
  suffix?: string
  signed?: boolean
}

const statsData = ref<UserStats | null>(null)
const loading = ref(true)
const errorState = ref<string | null>(null)
const animatedStats = ref<number[]>([])

function toNumber(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const stats = computed<StatCard[]>(() => {
  if (!statsData.value) return []

  return [
    {
      label: 'Total XP',
      value: toNumber(statsData.value.total_xp),
      icon: markRaw(Sparkles),
      suffix: 'xp'
    },
    {
      label: 'XP Last 7 Days',
      value: toNumber(statsData.value.xp_this_week),
      icon: markRaw(TrendingUp),
      suffix: 'xp',
      signed: true
    },
    {
      label: 'Words Unlocked',
      value: toNumber(statsData.value.words_unlocked),
      icon: markRaw(UnlockKeyhole)
    },
    {
      label: 'Words Maxed',
      value: toNumber(statsData.value.words_maxed),
      icon: markRaw(Trophy)
    },
    {
      label: 'Words Seen',
      value: toNumber(statsData.value.words_seen),
      icon: markRaw(Eye)
    },
    {
      label: 'Correct Answers',
      value: toNumber(statsData.value.total_correct),
      icon: markRaw(CircleCheck)
    },

  ]
})

function animateStats(targets: number[], duration = 1200) {
  const start = performance.now()
  const from = targets.map(() => 0)

  function step(now: number) {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 4)

    animatedStats.value = targets.map((target, index) =>
      Math.round(from[index] + (target - from[index]) * eased)
    )

    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      animatedStats.value = [...targets]
    }
  }

  requestAnimationFrame(step)
}

function formatStatValue(stat: StatCard, index: number): string {
  const rawValue = animatedStats.value[index] ?? stat.value
  const suffix = stat.suffix ? ` ${stat.suffix}` : ''

  if (stat.signed) {
    if (rawValue > 0) {
      return `+${Math.abs(rawValue).toLocaleString()}${suffix}`
    }

    if (rawValue < 0) {
      return `-${Math.abs(rawValue).toLocaleString()}${suffix}`
    }

    return `0${suffix}`
  }

  return `${rawValue.toLocaleString()}${suffix}`
}

const marqueeStats = computed(() => [...stats.value, ...stats.value])

onMounted(async () => {
  try {
    const { getAccessToken } = await useAuth()
    const token = await getAccessToken()

    const res = await $fetch<UserStats>('/api/user/stats/v2', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    statsData.value = res
    animatedStats.value = stats.value.map(() => 0)

    await nextTick()

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || stats.value.length === 0) {
      animatedStats.value = stats.value.map(stat => stat.value)
    } else {
      animateStats(stats.value.map(stat => stat.value))
    }
  } catch (err) {
    console.error('Stats fetch failed', err)
    errorState.value = 'Failed to load stats.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="max-w-4xl mx-auto px-4 py-16 space-y-12">
    <!-- <BackLink /> -->

    <div v-if="loading" class="text-center text-gray-400">
      Loading stats...
    </div>

    <div v-else-if="errorState" class="text-center text-red-500">
      {{ errorState }}
    </div>

    <div v-else>
      <h1 class="your-stat-heading">
        Your Stats
      </h1>

      <section class="mt-6 space-y-4">
        <div v-if="stats[0]" class="featured-stat-card hover:brightness-105">
          <div class="featured-stat-icon" aria-hidden="true">
            <component :is="stats[0].icon" class="h-8 w-8" />
          </div>

          <div>
            <p class="stat-label">
              {{ stats[0].label }}
            </p>

            <p class="featured-stat-value">
              {{ formatStatValue(stats[0], 0) }}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <div v-for="(stat, index) in stats.slice(1)" :key="stat.label" class="compact-stat-card hover:brightness-105"
            :class="`stat-${index + 1}`">
            <div class="compact-stat-top">
              <p class="stat-label">
                {{ stat.label }}
              </p>

              <div class="compact-stat-icon" aria-hidden="true">
                <component :is="stat.icon" class="h-4 w-4" />
              </div>
            </div>

            <p class="compact-stat-value">
              {{ formatStatValue(stat, index + 1) }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.card-fade-enter-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.card-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

main {
  border-radius: 24px;
}

.stat-card {
  border-radius: 22px;
  padding: 1.25rem;
  text-align: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  margin-bottom: 0.9rem;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.5);
  color: rgba(17, 24, 39, 0.72);
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.your-stat-heading {
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(17, 24, 39, 0.65);
}

.stat-value {
  font-size: 1.9rem;
  font-weight: 700;
  margin-top: 0.75rem;
  color: #111827;
}

.stat-0 {
  background: rgba(234, 184, 228, 0.45);
}

.stat-1 {
  background: rgba(168, 202, 224, 0.45);
}

.stat-2 {
  background: rgba(244, 205, 39, 0.35);
}

.stat-3 {
  background: rgba(246, 225, 225, 0.75);
}

.stat-4 {
  background: rgba(122, 111, 203, 0.4);
}

.stat-5 {
  background: rgba(130, 255, 111, 0.4);
}

.stats-marquee {
  overflow: hidden;
  width: 100%;
  mask-image: linear-gradient(90deg,
      transparent 0%,
      black 8%,
      black 92%,
      transparent 100%);
}

.stats-marquee-track {
  display: flex;
  width: max-content;
  gap: 1rem;
  animation: stats-marquee 20s linear infinite;
}

.stats-marquee:hover .stats-marquee-track {
  animation-play-state: paused;
}

.stat-marquee-card {
  width: 16rem;
  flex: 0 0 auto;
}

@keyframes stats-marquee {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(calc(-50% - 0.5rem));
  }
}

@media (max-width: 640px) {
  .stat-marquee-card {
    width: 13.5rem;
  }

  .stats-marquee-track {
    animation-duration: 22s;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stats-marquee {
    overflow-x: auto;
    mask-image: none;
  }

  .stats-marquee-track {
    animation: none;
    padding-bottom: 0.5rem;
  }
}


.featured-stat-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  border-radius: 24px;
  padding: 1.35rem;
  background: linear-gradient(135deg, rgba(234, 184, 228, 0.55), rgba(168, 202, 224, 0.5));
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.featured-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.09);
}

.featured-stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 18px;
  /* background: rgba(255, 255, 255, 0.55); */
  color: rgba(17, 24, 39, 0.75);
  flex: 0 0 auto;
}

.featured-stat-value {
  font-size: clamp(2rem, 5vw, 3.25rem);
  line-height: 1;
  font-weight: 800;
  margin-top: 0.45rem;
  color: #111827;
}

.compact-stat-card {
  position: relative;
  min-height: 8.5rem;
  border-radius: 22px;
  padding: 1rem;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.compact-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.08);
}

.compact-stat-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.compact-stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 12px;
  /* background: rgba(255, 255, 255, 0.55); */
  color: rgba(17, 24, 39, 0.72);
  flex: 0 0 auto;
}

.compact-stat-value {
  font-size: clamp(1.4rem, 4vw, 2rem);
  font-weight: 750;
  margin-top: 1.5rem;
  color: #111827;
}
</style>