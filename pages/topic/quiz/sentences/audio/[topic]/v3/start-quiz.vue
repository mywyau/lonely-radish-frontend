<script setup lang="ts">
definePageMeta({
  middleware: ['topic-access-quiz'],
  ssr: false,
})

import { createError } from 'h3'

const route = useRoute()
const topicSlug = computed(() => route.params.topic as string)

const {
  authReady,
} = useMeStateV2()

watchEffect(() => {
  if (!topicSlug.value) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Topic not found',
    })
  }
})

const primaryTips = [
  {
    title: 'Listen to sentence audio first',
    body: 'Play and replay each sentence audio clip before choosing an answer.',
  },
  {
    title: 'Wrong answers cost 12 XP',
    body: 'A wrong answer resets that word streak and applies a 12 XP penalty.',
  },
  {
    title: 'Finish to save your progress',
    body: 'XP and stats are finalized once the quiz completes.',
  },
]

const scoringTips = [
  'Streaks are tracked per source word.',
  'Lower-XP words appear more often.',
  'Correct answers earn more XP as streaks grow.',
  'Streak bonus caps after 5 correct answers in a row.',
  'Question order is randomized each run.',
  'This mode focuses on listening and sentence comprehension.',
]

const showAllTips = ref(false)

const canEnterTopic = () => true
</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">
    <BackLink />

    <section v-if="authReady && !canEnterTopic()" class="quiz-card text-center space-y-4">
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
        {{ topicSlug }}
      </h1>

      <p class="text-black level-subheading">
        Sentence Audio Quiz
      </p>

      <div class="pt-6">
        <NuxtLink :to="`/topic/quiz/sentences/audio/${topicSlug}/v3`" class="start-btn">
          Start
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
}

.tip-expand-enter-from,
.tip-expand-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
