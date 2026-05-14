<script setup lang="ts">
withDefaults(defineProps<{
  src: string
  autoplay?: boolean
}>(), {
  autoplay: true,
})
</script>

<template>
  <div class="floating-audio-control" aria-live="polite">
    <AudioButton :src="src" :autoplay="autoplay" size="sm" />
  </div>
</template>

<style scoped>
.floating-audio-control {
  position: fixed;
  right: 0.85rem;
  bottom: calc(0.85rem + env(safe-area-inset-bottom, 0px));
  z-index: 70;
}

.floating-audio-control :deep(button) {
  width: 3.1rem;
  height: 3.1rem;
  min-width: 0;
  padding: 0;
  border-radius: 999px;
  box-shadow: 0 10px 22px rgba(17, 24, 39, 0.14);
}

.floating-audio-control :deep(svg) {
  width: 1.25rem;
  height: 1.25rem;
}

@media (min-width: 768px) {
  .floating-audio-control {
    right: 1rem;
    bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  }
}
</style>
