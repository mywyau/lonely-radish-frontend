<script setup lang="ts">
const props = withDefaults(defineProps<{ count: number; limit?: number }>(), { limit: 5 })
const safeCount = computed(() => Math.min(Math.max(props.count, 0), props.limit))
const percentage = computed(() => props.limit > 0 ? (safeCount.value / props.limit) * 100 : 0)
</script>

<template>
  <div class="rounded-lg border border-[#E7D8CE] bg-white p-4" role="status" :aria-label="`${safeCount} of ${limit} interests sent today`">
    <div class="flex items-center justify-between gap-4 text-sm">
      <span class="font-semibold text-[#4D2F39]">Daily interests</span>
      <span class="font-semibold text-[#8F1839]">{{ safeCount }} of {{ limit }} sent today</span>
    </div>
    <div class="mt-2 h-2 overflow-hidden rounded-full bg-[#F3E8DA]" aria-hidden="true">
      <div class="h-full rounded-full bg-[#B4234A] transition-[width] duration-300" :style="{ width: `${percentage}%` }"></div>
    </div>
  </div>
</template>
