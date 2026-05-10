<script setup lang="ts">
definePageMeta({
  middleware: ['level-quiz-access'],
  ssr: false,
})

import { createError } from 'h3'
import { isLevelId, levelIdToNumbers } from '~/utils/levels/levels'

const route = useRoute()
const slug = route.params.slug as string

if (!isLevelId(slug)) {
  throw createError({ statusCode: 404 })
}

const levelNumber: number = levelIdToNumbers(slug)

const { authReady } = useMeStateV2()

watchEffect(() => {
  if (slug && levelNumber === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Level not found',
    })
  }
})

const primaryTips = [
  {
    title: 'Listen to sentence audio first',
    body: 'Each question includes audio for the sentence. Replay if needed before answering.',
  },
  {
    title: 'Wrong answers cost 12 XP',
    body: 'A wrong answer resets streak for that word and applies a 12 XP penalty.',
  },
  {
    title: 'Finish to keep your rewards',
    body: 'Your session stats and XP finalize at the end of the quiz.',
  },
]

const scoringTips = [
  'Streaks are tracked per source word.',
  'Lower-XP words appear more often.',
  'Correct answers earn increasing XP with streaks.',
  'Streak bonus caps after 5 correct answers in a row.',
  'Questions are randomized every run.',
  'This mode emphasizes listening + sentence meaning recognition.',
]

const showAllTips = ref(false)

const canEnterLevel = () => true
</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-8 space-y-8">
    <!-- <BackLink /> -->

    <section v-if="authReady && !canEnterLevel()" class="quiz-card text-center space-y-4">
      <h1 class="text-2xl font-semibold text-gray-900">
        Quiz locked
      </h1>

      <p class="text-black">
        This quiz is part of TaroTea Monthly or Yearly.
      </p>

      <p class="text-sm text-black">
        Sign in and upgrade to unlock advanced levels.
      </p>

      <NuxtLink to="/upgrade" class="upgrade-btn mt-4 inline-block">
        Upgrade
      </NuxtLink>
    </section>

    <section v-else class="quiz-card text-center space-y-6">
      <h1 class="text-3xl font-semibold text-gray-900 level-heading">
        Level {{ levelNumber }}
      </h1>

      <p class="text-black level-subheading">
        Sentence Audio Quiz
      </p>

      <div class="pt-6">
        <NuxtLink :to="`/quiz/${slug}/sentences/audio/v3`" class="start-btn">
          Start Quiz
        </NuxtLink>
      </div>

      <section class="tips-panel">
        <div class="tips-header">
          <h2 class="tips-title">Before you start</h2>
        </div>

        <div class="tips-grid">
          <article v-for="tip in primaryTips" :key="tip.title" class="tip-card">
            <h3 class="tip-card-title">{{ tip.title }}</h3>
            <p class="tip-card-body">{{ tip.body }}</p>
          </article>
        </div>

        <button class="tips-toggle" type="button" @click="showAllTips = !showAllTips">
          {{ showAllTips ? 'Hide All Tips' : 'See All Tips' }}
        </button>

        <Transition name="tip-expand">
          <div v-if="showAllTips" class="more-tips">
            <ul class="more-tips-list">
              <li v-for="tip in scoringTips" :key="tip">{{ tip }}</li>
            </ul>
          </div>
        </Transition>
      </section>
    </section>
  </main>
</template>

<style scoped>
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

.quiz-card {
  border-radius: 26px;
  padding: 2rem;
}

.start-btn {
  display: block;
  width: 100%;
  border-radius: 16px;
  padding: 0.75rem;
  font-weight: 600;
  text-align: center;
  background: rgb(249, 166, 166);
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: rgb(204, 136, 136);
  transform: translateY(-2px);
}

.upgrade-btn {
  border-radius: 16px;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  background: #EAB8E4;
  color: #111827;
}

.tips-panel {
  margin-top: 1rem;
  text-align: left;
}

.tips-header {
  margin-bottom: 1rem;
}

.tips-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #111827;
}

.tips-grid {
  display: grid;
  gap: 0.75rem;
}

.tip-card {
  border-radius: 16px;
  background: #F6E1E1;
  padding: 0.9rem 1rem;
}

.tip-card-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: #111827;
}

.tip-card-body {
  margin-top: 0.3rem;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(17, 24, 39, 0.82);
}

.tips-toggle {
  margin-top: 1rem;
  width: 100%;
  border: none;
  background: transparent;
  color: #111827;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  padding: 0.75rem;
  border-radius: 14px;
}

.tips-toggle:hover {
  background: rgba(249, 166, 166, 0.18);
}

.more-tips {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(17, 24, 39, 0.08);
}

.more-tips-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.more-tips-list li {
  position: relative;
  padding-left: 1.35rem;
  font-size: 0.88rem;
  line-height: 1.5;
  color: #374151;
}

.more-tips-list li::before {
  content: "✓";
  position: absolute;
  left: 0;
  width: 1rem;
  color: #B56CAD;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
}

.more-tips-list li:nth-child(2)::before {
  content: "↻";
}

.more-tips-list li:nth-child(3)::before {
  content: "+";
}

.more-tips-list li:nth-child(4)::before {
  content: "↗";
}

.more-tips-list li:nth-child(5)::before {
  content: "★";
}

.more-tips-list li:nth-child(6)::before {
  content: "";
  height: 0.95rem;
  margin-top: 0.2rem;
  background-color: #B56CAD;
  -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M13 2 3 14h7l-1 8 10-12h-7l1-8Z'/%3E%3C/svg%3E") center / contain no-repeat;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M13 2 3 14h7l-1 8 10-12h-7l1-8Z'/%3E%3C/svg%3E") center / contain no-repeat;
}

.more-tips-list li:nth-child(7)::before {
  content: "⇄";
}

.more-tips-list li:nth-child(8)::before {
  content: "◎";
}

.more-tips-list li:nth-child(9)::before {
  content: "▶";
}

.tip-expand-enter-active,
.tip-expand-leave-active {
  transition: all 0.2s ease;
}

.tip-expand-enter-from,
.tip-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
