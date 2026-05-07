<script setup lang="ts">
withDefaults(defineProps<{
  size?: string
}>(), {
  size: 'h-4 w-4',
})
</script>

<template>
  <svg
    :class="size"
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 8.8-8.8" />
    <path d="m15 8 3 3" />
    <path d="m17 6 3 3" />
  </svg>
</template>
