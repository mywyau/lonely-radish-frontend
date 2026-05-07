<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  icon: Component
  colorClass: string
}>()
</script>

<template>
  <h2 class="flex items-center gap-3 text-xl font-semibold text-gray-900">
    <span :class="['inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1', colorClass]">
      <component :is="icon" class="h-5 w-5" aria-hidden="true" />
    </span>
    <span><slot /></span>
  </h2>
</template>
