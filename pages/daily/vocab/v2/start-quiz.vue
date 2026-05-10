<script setup lang="ts">
definePageMeta({
  ssr: false,
  middleware: "logged-in",
})

const primaryTips = [
  {
    title: "Gain XP from every correct answer",
    body: "The Daily Vocab Quiz gives XP for correct answers and helps grow your streaks over time.",
  },
  {
    title: "Wrong answers reset progress for that word",
    body: "If you miss a question, that word's streak resets for this session and you miss out on bonus XP.",
  },
  {
    title: "Complete all 20 questions",
    body: "Finish the full daily run to lock in your final result and keep your daily consistency strong.",
  },
]

const scoringTips = [
  "Streaks are tracked per word.",
  "Lower XP words are prioritized more often.",
  "Base correct-answer XP starts at 5.",
  "You do not lose any xp for incorrect answers.",
  "Streaks increase XP for repeated correct answers.",
  "Streak XP: 5 → 7 → 9 → 13 → 15.",
  "Questions are randomized each session.",
  "Practice both Cantonese → English and English → Cantonese.",
  "Your daily set refreshes at UTC midnight.",
]

const showAllTips = ref(false)
</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">
    <!-- <BackLink /> -->

    <section class="quiz-card text-center space-y-6">
      <h1 class="text-3xl font-semibold text-gray-900 level-heading">
        Daily 20 Questions
      </h1>

      <p class="text-black level-subheading">
        Practice your daily vocabulary review set and build steady XP.
      </p>

      <div class="pt-6">
        <NuxtLink to="/daily/vocab/v2" class="start-btn">
          Start daily vocabulary quiz
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
          {{ showAllTips ? "Hide All Tips" : "See All Tips" }}
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
  --pink: #eab8e4;
  --purple: #d6a3d1;
  --blue: #a8cae0;
  --yellow: #f4cd27;
  --blush: #f6e1e1;
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
  background: #a8cae0;
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: #8fbfd6;
  transform: translateY(-2px);
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
  background: #f6e1e1;
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
  color: #d6a3d1;
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
