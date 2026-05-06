<script setup lang="ts">
useSeoMeta({
  title: 'Learn Cantonese in 15 minutes a day',
  description: 'Learn natural Cantonese with vocabulary, sentence quizzes, audio-only drills, and writing practice.',
  ogTitle: 'Learn Cantonese in 15 minutes a day | TaroTea',
  ogDescription: 'Build everyday Cantonese with short, focused practice sessions.',
})

const { data: stats } = await useFetch('/api/total-users-stats', {
  server: true,
  lazy: true,
})

const learningModes = [
  {
    title: 'Daily practice',
    description: 'Short sessions designed for consistency, even with a busy schedule.',
    bgClass: 'brand-card-yellow',
  },
  {
    title: 'Multiple activities',
    description: 'Switch between vocabulary, audio only, or sentence quizzes, and pronunciation-focused learning modes.',
    bgClass: 'brand-card-blue',
  },
  {
    title: 'Progress-driven',
    description: 'See your growth and keep momentum with clear goals and repetition. Track progress via XP and unlock more words for free. Visualise which words are familiar and words that you may need to work on easily.',
    bgClass: 'brand-card-pink',
  },
  {
    title: 'Learn how to write',
    description: 'Grab your pen and paper! Watch and learn how to write traditional chinese characters by following the Hanzi Writer.',
    bgClass: 'brand-card-green',
  },
]

const currentUsers = ref<number | null>(null)
const isStartPanelFlipped = ref(false)

function flipStartPanel() {
  isStartPanelFlipped.value = !isStartPanelFlipped.value
}
const sessionCookie = useCookie<string>('online_session_id', {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

async function refreshCurrentUsers() {
  if (!sessionCookie.value && import.meta.client) {
    sessionCookie.value = crypto.randomUUID()
  }

  const data = await $fetch<{ currentUsers: number }>('/api/current-users', {
    method: 'POST',
    body: {
      sessionId: sessionCookie.value,
    },
  })

  currentUsers.value = data.currentUsers
}

onMounted(() => {
  void refreshCurrentUsers()
  const interval = setInterval(() => {
    void refreshCurrentUsers()
  }, 30_000)

  onBeforeUnmount(() => {
    clearInterval(interval)
  })
})
</script>

<template>
  <main class="max-w-4xl mx-auto py-16 sm:py-20 px-6 min-h-screen">
    <section class="text-center">

      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
        Learn and improve your Cantonese in just <span class="brand-text-gradient">15 minutes</span> a day
      </h1>

      <!-- <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
        Learn and improve your Cantonese in just <span class="text-indigo-500">15 minutes</span> a day
      </h1> -->


      <div class="grid grid-cols-2 sm:grid-cols-2 gap-4 mt-6 max-w-2xl mx-auto">
        <div class="rounded-xl p-5 text-center brand-card-green shadow-sm">
          <div class="text-2xl font-semibold text-gray-900">
            {{ currentUsers ?? '—' }}
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Current users online
          </div>
        </div>

        <div class="rounded-xl p-5 text-center brand-card-pink shadow-sm">
          <div class="text-2xl font-semibold text-gray-900">
            {{ stats?.totalUsers ?? '—' }}
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Learners
          </div>
        </div>
      </div>

      <p class="text-base sm:text-lg text-gray-700 mt-10 max-w-2xl mx-auto">
        Build confidence with quick, focused and fun activities that help you remember what you learn.
        Practice at you own pace, no daily streaks or annoying birds. Grind whatever, whenever you want.
      </p>
    </section>

    <section class="mt-12 start-learning-flip hover:brightness-105" aria-label="Start learning Cantonese today">
      <div class="start-learning-scene" :class="{ 'is-flipped': isStartPanelFlipped }" @click="flipStartPanel">
        <article
          class="start-learning-face start-learning-face-front rounded-2xl p-6 sm:p-8 brand-cta-topic-bg text-gray-900 shadow-sm">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <!-- <p class="text-xs font-semibold uppercase tracking-[0.28em] text-gray-700">
                Topic path
              </p> -->
              <h2 class="mt-2 text-2xl font-semibold tracking-tight">
                Start learning Cantonese today
              </h2>
              <p class="text-sm sm:text-base text-gray-800 mt-2 max-w-2xl">
                Explore themed word collections, then reinforce what you discover with topic quizzes built around
                everyday conversations.
              </p>
            </div>
            <!-- <button
              type="button"
              class="flip-hint rounded-full bg-white/50 px-3 py-1 text-xs font-medium text-gray-800 transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-gray-900/40"
              aria-label="Show levels and level quizzes"
              @click.stop="flipStartPanel"
            >
              Click panel to flip
            </button> -->
          </div>

          <div class="mt-5 flex flex-wrap gap-3">
            <NuxtLink to="/topics"
              class="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 font-medium text-white transition hover:bg-gray-800"
              @click.stop>
              Explore Topics
            </NuxtLink>
            <NuxtLink to="/topics/quiz"
              class="inline-flex items-center justify-center rounded-md border border-gray-700 px-4 py-2 font-medium text-gray-900 transition hover:bg-white/60"
              @click.stop>
              Topic quizzes
            </NuxtLink>
          </div>
        </article>

        <article
          class="start-learning-face start-learning-face-back rounded-2xl p-6 sm:p-8 brand-cta-level-bg text-gray-900 shadow-sm">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <!-- <p class="text-xs font-semibold uppercase tracking-[0.28em] text-gray-700">
                Level path
              </p> -->
              <h2 class="mt-2 text-2xl font-semibold tracking-tight">
                Start learning Cantonese today
              </h2>
              <p class="text-sm sm:text-base text-gray-800 mt-2 max-w-2xl">
                Work through structured levels at your own pace, then test your progress with level quizzes that build
                confidence step by step.
              </p>
            </div>
            <!-- <button
              type="button"
              class="flip-hint rounded-full bg-white/50 px-3 py-1 text-xs font-medium text-gray-800 transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-gray-900/40"
              aria-label="Show topics and topic quizzes"
              @click.stop="flipStartPanel"
            >
              Click panel to flip back
            </button> -->
          </div>

          <div class="mt-5 flex flex-wrap gap-3">
            <NuxtLink to="/levels"
              class="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 font-medium text-white transition hover:bg-gray-800"
              @click.stop>
              Explore Levels
            </NuxtLink>
            <NuxtLink to="/quiz"
              class="inline-flex items-center justify-center rounded-md border border-gray-700 px-4 py-2 font-medium text-gray-900 transition hover:bg-white/60"
              @click.stop>
              Level quizzes
            </NuxtLink>
          </div>
        </article>
      </div>
    </section>

    <section class="mt-14">
      <h2 class="text-sm uppercase tracking-wide text-gray-500 mb-4">
        How you learn
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <article v-for="mode in learningModes" :key="mode.title" :class="mode.bgClass" class="rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-900">
            {{ mode.title }}
          </h3>
          <p class="text-sm text-gray-800 mt-2">
            {{ mode.description }}
          </p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.brand-card-green {
  background-color: #E7F3D5;
}

.brand-card-pink {
  background-color: #F6E1E1;
}

.brand-card-lilac {
  background-color: #EAB8E4;
}

.brand-card-blue {
  background-color: #A8CAE0;
}

.brand-card-yellow {
  background-color: rgba(244, 205, 39, 0.35);
}

.brand-cta-bg,
.brand-cta-level-bg {
  background: linear-gradient(135deg, #F6E1E1 0%, #EAB8E4 50%, #A8CAE0 100%);
}

.brand-cta-topic-bg {
  background: linear-gradient(135deg, #E7F3D5 0%, #C8E9E1 48%, #A8CAE0 100%);
}

.start-learning-flip {
  perspective: 1200px;
}

.start-learning-scene {
  position: relative;
  min-height: 18rem;
  cursor: pointer;
  outline: none;
  transform-style: preserve-3d;
  transition: transform 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.start-learning-scene.is-flipped {
  transform: rotateY(180deg);
}

.start-learning-face {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 18rem;
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  transition: box-shadow 220ms ease, filter 220ms ease;
}

.start-learning-face::before {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 18% 18%, rgba(255, 255, 255, 0.72), transparent 34%), rgba(255, 255, 255, 0.12);
  content: '';
  opacity: 0;
  pointer-events: none;
  transition: opacity 220ms ease;
}

.start-learning-face>* {
  position: relative;
  z-index: 1;
}

/* .start-learning-scene:hover .start-learning-face {
  box-shadow: 0 24px 60px rgba(94, 166, 214, 0.34), 0 0 0 1px rgba(255, 255, 255, 0.72) inset;
  filter: saturate(1.10) brightness(1.04);
} */

/* .start-learning-scene:hover .start-learning-face::before {
  opacity: 1;
} */

/* .start-learning-scene:hover .flip-hint {
  background-color: rgba(255, 255, 255, 0.78);
  box-shadow: 0 8px 24px rgba(255, 255, 255, 0.36);
  transform: translateZ(1px) scale(1.03);
} */

.start-learning-face-back {
  pointer-events: none;
  transform: rotateY(180deg);
}

.start-learning-scene.is-flipped .start-learning-face-front {
  pointer-events: none;
}

.start-learning-scene.is-flipped .start-learning-face-back {
  pointer-events: auto;
}

.start-learning-face :is(a, button) {
  transform: translateZ(1px);
}

.flip-hint {
  align-self: flex-start;
}

@media (max-width: 640px) {

  .start-learning-scene,
  .start-learning-face {
    min-height: 22rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .start-learning-scene {
    transition-duration: 1ms;
  }
}

/* .brand-text-gradient {
  background: linear-gradient(90deg, #6F5CCA 0%, #E07ABF 50%, #5EA6D6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
} */

.brand-text-gradient {
  background: linear-gradient(
    90deg,
    #6F5CCA 0%,
     #E07ABF 50%,
      #5EA6D6 100%
      );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

</style>
