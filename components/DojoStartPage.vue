<script setup lang="ts">
type XpRule = {
  action: string
  xp: string
}

const props = defineProps<{
  heading: string
  description: string
  startTo: string
  startLabel: string
  xpRules: XpRule[]
  tips: string[]
  keyboardSetupTips?: string[]
  guestNote?: string
  theme?: 'blue' | 'purple' | 'blush'
}>()

const showAdvancedTips = ref(false)
</script>

<template>
  <main class="quiz-intro-page max-w-xl mx-auto px-4 py-16 space-y-10">
    <BackLink />

    <section class="quiz-card text-center space-y-6">
      <TypewriterTitleBlock
        :heading-text="props.heading"
        :subheading-text="props.description"
        heading-class="text-3xl font-semibold text-gray-900 level-heading"
        subheading-class="text-black level-subheading"
        gap="1.5rem"
      />

      <p v-if="props.guestNote" class="guest-note">
        {{ props.guestNote }}
      </p>

      <div class="pt-6">
        <NuxtLink :to="props.startTo" class="start-btn" :class="`theme-${props.theme ?? 'blue'}`">
          {{ props.startLabel }}
        </NuxtLink>
      </div>

      <section class="tips-panel">
        <div class="tips-header">
          <h2 class="tips-title">XP breakdown</h2>
        </div>

        <div class="tips-grid">
          <article
            v-for="rule in props.xpRules"
            :key="`${rule.action}-${rule.xp}`"
            class="tip-card"
          >
            <h3 class="tip-card-title">{{ rule.action }}</h3>
            <p class="tip-card-body">{{ rule.xp }}</p>
          </article>
        </div>

        <button class="tips-toggle" :class="`theme-${props.theme ?? 'blue'}`" type="button" @click="showAdvancedTips = !showAdvancedTips">
          {{ showAdvancedTips ? 'Hide extra tips' : 'See keyboard and tips' }}
        </button>

        <Transition name="tip-expand">
          <div v-if="showAdvancedTips" class="more-tips space-y-4">
            <section v-if="props.keyboardSetupTips?.length" class="text-left space-y-2">
              <h3 class="tips-title">Keyboard setup</h3>
              <ul class="more-tips-list">
                <li v-for="tip in props.keyboardSetupTips" :key="tip">{{ tip }}</li>
              </ul>
            </section>

            <section class="text-left space-y-2">
              <h3 class="tips-title">Before you start</h3>
              <ul class="more-tips-list">
                <li v-for="tip in props.tips" :key="tip">{{ tip }}</li>
              </ul>
            </section>
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
  background: rgba(168, 202, 224, 0.72);
  color: #111827;
  transition: background 0.15s ease, transform 0.15s ease;
}

.start-btn:hover {
  background: rgba(168, 202, 224, 0.9);
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

.guest-note {
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(17, 24, 39, 0.8);
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

.tips-toggle.theme-blue:hover {
  background: rgba(168, 202, 224, 0.22);
}

.tips-toggle.theme-purple:hover {
  background: rgba(214, 163, 209, 0.22);
}

.tips-toggle.theme-blush:hover {
  background: rgba(249, 166, 166, 0.2);
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
  content: "•";
  position: absolute;
  left: 0;
  color: #D6A3D1;
}



.start-btn.theme-purple {
  background: rgba(214, 163, 209, 0.72);
}

.start-btn.theme-purple:hover {
  background: rgba(214, 163, 209, 0.9);
}

.start-btn.theme-blush {
  background: rgba(246, 180, 180, 0.72);
}

.start-btn.theme-blush:hover {
  background: rgba(246, 180, 180, 0.9);
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
