<script setup lang="ts">
import { Sparkles, Trophy, UnlockKeyhole } from '@lucide/vue'
</script>

<template>
  <aside class="stat-card guest-quiz-guidance text-left" aria-label="Guest quiz progress guidance">
    <div class="flex items-start gap-3">
      <div class="guest-quiz-guidance__badge" aria-hidden="true">
        <Sparkles class="h-5 w-5" />
      </div>

      <div class="min-w-0 space-y-3">
        <div>
          <p class="stat-label !text-left">Guest mode</p>
          <h3 class="text-base font-semibold text-gray-950">Your quiz results are a preview</h3>
        </div>

        <div class="grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
          <div class="guest-quiz-guidance__item">
            <Trophy class="h-4 w-4 text-amber-500" aria-hidden="true" />
            <span>XP is shown here as guidance and is not saved.</span>
          </div>

          <div class="guest-quiz-guidance__item">
            <UnlockKeyhole class="h-4 w-4 text-sky-500" aria-hidden="true" />
            <span>Progress tracking and word unlocks are available from an account.</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.guest-quiz-guidance {
  border: 1px solid rgba(168, 202, 224, 0.6);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(168, 202, 224, 0.22));
  box-shadow: 0 16px 36px rgba(31, 41, 55, 0.08);
}

.guest-quiz-guidance__badge {
  display: inline-flex;
  height: 2.75rem;
  width: 2.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  color: #7c3aed;
  background: rgba(244, 194, 215, 0.45);
}

.guest-quiz-guidance__item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  border-radius: 0.875rem;
  background: rgba(255, 255, 255, 0.65);
  padding: 0.75rem;
  line-height: 1.35;
}
</style>
