<script setup lang="ts">
definePageMeta({
  middleware: ['level-quiz-access'],
  ssr: false
})

import { createError } from 'h3'
import { isLevelId, levelIdToNumbers } from '~/utils/levels/levels'

const route = useRoute()
const slug = route.params.slug as string

if (!isLevelId(slug)) {
  throw createError({ statusCode: 404 })
}

const levelNumber: number = levelIdToNumbers(slug)

const {
  authReady,
} = useMeStateV2()

watchEffect(() => {
  if (slug && levelNumber === null) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Level not found'
    })
  }
})

const primaryTips = [
  {
    title: 'Gain XP to unlock word tiles using TaroKeys',
    body: 'Every correct answer gives XP and helps build up your TaroKeys.'
  },
  {
    title: 'Wrong answers cost 12 XP',
    body: 'A wrong answer resets that word’s streak and reduces the current XP gained for that word by 12.'
  },
  {
    title: 'Try to complete each quiz!!',
    body: 'XP is only awarded at the end of the quiz. Try to finish each an every quiz.'
  }
]

const scoringTips = [
  'Streaks are tracked separately for each word.',
  'Lower XP words will appear more often.',
  'Earn at least 5 XP for every correct answer.',
  'Answer streaks increase the XP you earn.',
  'Streaks cap at 5 correct answers in a row for a given word.',
  'Streak XP: 5 → 7 → 9 → 13 → 15.',
  'Questions are randomized every session.',
  'Practice Cantonese → English and English → Cantonese.',
  'The quiz was designed with reading and recognition. Audio will play after each and every answer.'
]

const showAllTips = ref(false)

const canEnterLevel = () => {
  return true
}
</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">

    <!-- <NuxtLink :to="`/quiz/`" class="text-sm text-black hover:underline"> -->
    <!-- ← Back -->
    <!-- </NuxtLink> -->

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
        Practice and test your understanding of the words from this level.
      </p>

      <div class="pt-6">
        <NuxtLink :to="`/quiz/${slug}/word/v2/test`" class="start-btn">
          Start vocabulary quiz
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
              <li v-for="tip in scoringTips" :key="tip">
                {{ tip }}
              </li>
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

.quiz-intro-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
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
  background: #A8CAE0;
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: #8fbfd6;
  transform: translateY(-2px);
}

.upgrade-btn {
  border-radius: 16px;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  background: #EAB8E4;
  color: #111827;
  transition: background 0.15s ease;
}

.upgrade-btn:hover {
  background: #d9a6d3;
}

.tips-panel {
  margin-top: 1rem;
  text-align: left;
  /* background: #fff; */
  /* border: 1px solid rgba(17, 24, 39, 0.08); */
  /* border-radius: 20px; */
  /* padding: 1rem; */
}

.tips-header {
  margin-bottom: 1rem;
}

.tips-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #111827;
}

.tips-subtitle {
  margin-top: 0.25rem;
  font-size: 0.85rem;
  color: rgba(17, 24, 39, 0.65);
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
  background: rgba(168, 202, 224, 0.18);
}

.more-tips {
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(17, 24, 39, 0.08);
}

.more-tips-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.65rem;
}

.more-tips-list li {
  position: relative;
  padding-left: 1rem;
  font-size: 0.88rem;
  line-height: 1.5;
  color: #374151;
}

.more-tips-list li::before {
  content: "✓";
  position: absolute;
  left: 0;
  font-size: 0.78rem;
  font-weight: 700;
  color: #D6A3D1;
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
  content: "⚡";
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
  overflow: hidden;
}

.tip-expand-enter-from,
.tip-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (max-width: 640px) {
  .quiz-card {
    padding: 1.5rem;
  }
}
</style>
