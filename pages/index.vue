<script setup lang="ts">
useSeoMeta({
  title: 'Learn Cantonese in 15 minutes a day',
  description: 'Learn natural Cantonese with vocabulary, sentence quizzes, audio-only drills, and writing practice.',
  ogTitle: 'Learn Cantonese in 15 minutes a day | TaroTea',
  ogDescription: 'Build everyday Cantonese with short, focused practice sessions.',
})

import {
  CalendarCheck,
  CircleHelp,
  GraduationCap,
  Layers,
  PenLine,
  Tags,
  TrendingUp,
  UsersRound,
  Sword,
} from '@lucide/vue'

const { data: stats } = await useFetch('/api/total-users-stats', {
  server: true,
  lazy: true,
})

type HeadingLetter = {
  letter: string
  gradient: boolean
  index: number
}

type HeadingWord = {
  letters: HeadingLetter[]
  trailingSpace: boolean
}

const headingSegments = [
  { text: 'Learn and improve your Cantonese in just ', gradient: false },
  { text: '15 minutes', gradient: true },
  { text: ' a day', gradient: false },
]

const headingLetters = headingSegments.flatMap((segment) =>
  Array.from(segment.text).map((letter) => ({
    letter,
    gradient: segment.gradient,
  })),
)

const headingWords = headingLetters.reduce<HeadingWord[]>((words, item, index) => {
  if (item.letter === ' ') {
    const currentWord = words.at(-1)

    if (currentWord) {
      currentWord.trailingSpace = true
    }

    return words
  }

  if (index === 0 || headingLetters[index - 1]?.letter === ' ') {
    words.push({ letters: [], trailingSpace: false })
  }

  words.at(-1)?.letters.push({
    letter: item.letter,
    gradient: item.gradient,
    index,
  })

  return words
}, [])

const headingText = headingSegments.map((segment) => segment.text).join('')

const learningModes = [
  {
    title: 'Daily practice',
    description: 'Short sessions designed for consistency, even with a busy schedule. Run a short quiz whenever you want',
    bgClass: 'brand-card-yellow',
    icon: CalendarCheck,
  },
  {
    title: 'Multiple activities',
    description: 'Switch between multiple quiz types, practice pronunciation and typing skills with various activities.',
    bgClass: 'brand-card-blue',
    icon: Layers,
  },
  {
    title: 'Progress-driven',
    description: 'See your growth and keep momentum with clear goals and repetition. Track progress via XP and unlock more words for free. Visualise which words are familiar and words that you may need to work on easily.',
    bgClass: 'brand-card-pink',
    icon: TrendingUp,
  },
  {
    title: 'Learn how to write',
    description: 'Grab your pen and paper! Watch and learn how to write traditional chinese characters by following the Hanzi Writer strokes.',
    bgClass: 'brand-card-green',
    icon: PenLine,
  },
]

const currentUsers = ref<number | null>(null)
const isStartPanelFlipped = ref(false)
const generalGreeting = ref('')
const momentumMessage = ref('')
const { isLoggedIn, user, resolve: resolveMeState } = useMeStateV2()

function flipStartPanel() {
  isStartPanelFlipped.value = !isStartPanelFlipped.value
}

function formatGreeting(baseGreeting: string) {
  const firstName = user.value?.firstName?.trim()

  return firstName ? `${baseGreeting}, ${firstName}!` : `${baseGreeting}!`
}

function getTimeBasedGreeting(hour: number) {
  if (hour < 5) {
    return 'Burning the midnight oil'
  }

  if (hour < 12) {
    return 'Good morning'
  }

  if (hour < 18) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

function getTimeBasedMomentumMessage(hour: number) {
  if (hour < 5) {
    return 'A little late-night Cantonese practice can still keep your progress glowing.'
  }

  if (hour < 18) {
    return "Keep that momentum going, you're on the right track."
  }

  return 'Wind down with a quick Cantonese session and keep your progress moving.'
}

function updateGeneralGreeting() {
  const currentHour = new Date().getHours()

  generalGreeting.value = formatGreeting(getTimeBasedGreeting(currentHour))
  momentumMessage.value = getTimeBasedMomentumMessage(currentHour)
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

watch(
  () => user.value?.firstName,
  () => {
    updateGeneralGreeting()
  },
)

onMounted(() => {
  void resolveMeState()
  updateGeneralGreeting()
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
  <main class="relative max-w-4xl mx-auto py-16 sm:py-20 px-6 min-h-screen">

    <section class="text-center">
      <div v-if="isLoggedIn && generalGreeting" class="mt-2 mb-6 rounded-2xl bg-gradient-to-r from-pink-400 via-violet-400 to-sky-400">
        <div class="rounded-2xl bg-white/85 backdrop-blur-sm px-5 py-4 sm:px-7 sm:py-5">
          <p class="text-base sm:text-lg font-semibold text-gray-900">
            {{ generalGreeting }}
          </p>
          <p class="text-sm sm:text-base text-gray-700 mt-1">
            {{ momentumMessage }}
          </p>
        </div>
      </div>

      <h1 class="heading-fly-in text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900"
        :aria-label="headingText">
        <span v-for="(word, wordIndex) in headingWords" :key="`heading-word-${wordIndex}`" aria-hidden="true"
          class="heading-fly-in-word">
          <span v-for="item in word.letters" :key="`${item.letter}-${item.index}`" class="heading-fly-in-letter"
            :class="{ 'brand-text-gradient': item.gradient }" :style="{ animationDelay: `${item.index * 32}ms` }">{{
              item.letter }}</span><span v-if="word.trailingSpace">&nbsp;</span>
        </span>
      </h1>

      <div class="grid grid-cols-2 sm:grid-cols-2 gap-4 mt-6 max-w-2xl mx-auto">
        <div class="relative rounded-xl p-5 text-center brand-card-green ">
          <div class="inline-flex items-center justify-center gap-2 text-2xl font-semibold text-gray-900">
            <span>{{ currentUsers ?? '—' }}</span>
            <UsersRound class="size-[1em]" :stroke-width="2.2" />
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Current users online
          </div>
        </div>

        <div class="relative rounded-xl p-5 text-center brand-card-pink">
          <div class="inline-flex items-center justify-center gap-2 text-2xl font-semibold text-gray-900">
            <span>{{ stats?.totalUsers ?? '—' }}</span>
            <GraduationCap class="size-[1em]" :stroke-width="2.2" />
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Learners
          </div>
        </div>
      </div>

      <p class="text-base sm:text-lg text-gray-800 mt-10 max-w-2xl mx-auto">
        Build confidence with quick, focused and fun activities that help you remember what you learn.
        Practice at you own pace, no daily streaks or annoying birds. Grind whatever, whenever you want.
      </p>
    </section>

    <section class="mt-10 sm:mt-12 start-learning-flip hover:brightness-105"
      aria-label="Start learning Cantonese today">
      <div class="start-learning-scene" :class="{ 'is-flipped': isStartPanelFlipped }" @click="flipStartPanel">
        <article
          class="start-learning-face start-learning-face-front rounded-2xl p-5 sm:p-8 brand-cta-topic-bg text-gray-900 shadow-sm">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-xl sm:mt-2 sm:text-2xl font-semibold tracking-tight">
                Start learning Cantonese today
              </h2>
              <p class="start-learning-copy text-sm sm:text-base text-gray-800 mt-2 max-w-2xl">
                Explore themed word collections, then reinforce what you discover with topic quizzes built around
                everyday conversations.
              </p>
            </div>
          </div>

          <div class="start-learning-actions mt-4 sm:mt-5 flex flex-wrap gap-3">
            <NuxtLink to="/topics" class="start-learning-icon-link start-learning-icon-link-primary"
              aria-label="Explore Topics" title="Explore Topics" @click.stop>
              <Tags class="start-learning-action-icon" aria-hidden="true" />
              <span class="sr-only">Explore Topics</span>
            </NuxtLink>
            <NuxtLink to="/topics/quiz" class="start-learning-icon-link" aria-label="Topic quizzes"
              title="Topic quizzes" @click.stop>
              <CircleHelp class="start-learning-action-icon" aria-hidden="true" />
              <span class="sr-only">Topic quizzes</span>
            </NuxtLink>
            <NuxtLink to="/dojo/topic" class="start-learning-icon-link" aria-label="Enter Topic Dojo"
              title="Enter Topic Dojo" @click.stop>
              <Sword class="start-learning-action-icon start-learning-dojo-icon" aria-hidden="true" />
              <span class="sr-only">Enter Topic Dojo</span>
            </NuxtLink>
          </div>
        </article>

        <article
          class="start-learning-face start-learning-face-back rounded-2xl p-5 sm:p-8 brand-cta-level-bg text-gray-900 shadow-sm">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 class="text-xl sm:mt-2 sm:text-2xl font-semibold tracking-tight">
                Start learning Cantonese today
              </h2>
              <p class="start-learning-copy text-sm sm:text-base text-gray-800 mt-2 max-w-2xl">
                Work through content in structured levels at your own pace, then practice and train with activities that
                build
                confidence step by step.
              </p>
            </div>
          </div>

          <div class="start-learning-actions mt-4 sm:mt-5 flex flex-wrap gap-3">
            <NuxtLink to="/levels" class="start-learning-icon-link start-learning-icon-link-primary"
              aria-label="Explore Levels" title="Explore Levels" @click.stop>
              <GraduationCap class="start-learning-action-icon" aria-hidden="true" />
              <span class="sr-only">Explore Levels</span>
            </NuxtLink>
            <NuxtLink to="/quiz" class="start-learning-icon-link" aria-label="Level quizzes"
              title="Level quizzes" @click.stop>
              <CircleHelp class="start-learning-action-icon" aria-hidden="true" />
              <span class="sr-only">Level quizzes</span>
            </NuxtLink>
            <NuxtLink to="/dojo/level" class="start-learning-icon-link" aria-label="Enter Level Dojo"
              title="Enter Level Dojo" @click.stop>
              <Sword class="start-learning-action-icon start-learning-dojo-icon" aria-hidden="true" />
              <span class="sr-only">Enter Level Dojo</span>
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
        <article v-for="mode in learningModes" :key="mode.title" :class="mode.bgClass"
          class="relative rounded-xl p-5 pr-16">
          <div class="absolute right-4 top-4 inline-flex size-9 items-center justify-center text-gray-900">
            <component :is="mode.icon" class="size-5" :stroke-width="2.2" />
          </div>

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
  min-height: clamp(15.75rem, 30vw, 18rem);
  cursor: pointer;
  outline: none;
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
  min-height: clamp(15.75rem, 30vw, 18rem);
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

.start-learning-icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.9rem;
  min-width: 2.9rem;
  height: 2.9rem;
  color: rgba(17, 24, 39, 0.92);
  background: rgba(255, 255, 255, 0.34);
  border: 1px solid rgba(17, 24, 39, 0.22);
  border-radius: 9999px;
  transition: background 180ms ease, color 180ms ease, transform 180ms ease;
}

.start-learning-icon-link-primary {
  color: #fff;
  background: rgba(17, 24, 39, 0.92);
  border-color: rgba(17, 24, 39, 0.92);
}

.start-learning-icon-link:hover,
.start-learning-icon-link:focus-visible {
  color: rgba(17, 24, 39, 0.96);
  background: rgba(255, 255, 255, 0.64);
  transform: translateY(-0.06rem);
}

.start-learning-icon-link-primary:hover,
.start-learning-icon-link-primary:focus-visible {
  color: #fff;
  background: rgba(17, 24, 39, 0.82);
}

.start-learning-icon-link:focus-visible {
  outline: 3px solid rgba(240, 121, 202, 0.55);
  outline-offset: 3px;
}

.start-learning-action-icon {
  width: 1.35rem;
  height: 1.35rem;
  stroke-width: 2.35;
  transition: transform 180ms ease;
}

.start-learning-icon-link:hover .start-learning-action-icon,
.start-learning-icon-link:focus-visible .start-learning-action-icon {
  transform: scale(1.06);
}

.start-learning-icon-link:hover .start-learning-dojo-icon,
.start-learning-icon-link:focus-visible .start-learning-dojo-icon {
  transform: rotate(-8deg) scale(1.06);
}


.start-learning-copy {
  text-wrap: pretty;
}

.heading-fly-in {
  text-wrap: balance;
}

.heading-fly-in-letter {
  display: inline-block;
  opacity: 0;
  transform: translate3d(var(--letter-start-x, 0), var(--letter-start-y, 0), 0) rotate(var(--letter-start-rotate, 0deg)) scale(0.72);
  animation: heading-letter-fly-in 720ms cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
  will-change: transform, opacity;
}

.heading-fly-in-letter:nth-child(4n + 1) {
  --letter-start-x: -1.8rem;
  --letter-start-y: -2.1rem;
  --letter-start-rotate: -18deg;
}

.heading-fly-in-letter:nth-child(4n + 2) {
  --letter-start-x: 1.6rem;
  --letter-start-y: -1.5rem;
  --letter-start-rotate: 16deg;
}

.heading-fly-in-letter:nth-child(4n + 3) {
  --letter-start-x: -1.2rem;
  --letter-start-y: 2rem;
  --letter-start-rotate: 12deg;
}

.heading-fly-in-letter:nth-child(4n) {
  --letter-start-x: 1.8rem;
  --letter-start-y: 1.4rem;
  --letter-start-rotate: -14deg;
}

.heading-fly-in-word {
  display: inline-block;
  white-space: nowrap;
}

@keyframes heading-letter-fly-in {
  0% {
    opacity: 0;
    transform: translate3d(var(--letter-start-x, 0), var(--letter-start-y, 0), 0) rotate(var(--letter-start-rotate, 0deg)) scale(0.72);
  }

  70% {
    opacity: 1;
  }

  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
}


@media (max-width: 640px) {
  .start-learning-scene,
  .start-learning-face {
    min-height: 16.5rem;
  }

  .start-learning-face {
    justify-content: center;
  }
}

@media (max-width: 360px) {

  .start-learning-scene,
  .start-learning-face {
    min-height: 18.5rem;
  }

  .start-learning-actions {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .start-learning-scene {
    transition-duration: 1ms;
  }

  .heading-fly-in-letter {
    animation: none;
    opacity: 1;
    transform: none;
  }
}

.brand-text-gradient {
  background: linear-gradient(90deg, #f079ca 50%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

/* .brand-text-gradient {
  background: linear-gradient(
      90deg,
      #8972ff 0%,
      #7795f9 50%,
      #f977d0 100%,
    );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
} */
</style>
