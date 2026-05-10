<script setup lang="ts">
import { NuxtLink } from '#components'
import { ArrowLeft } from '@lucide/vue'

const props = withDefaults(defineProps<{
  fallback?: string
  label?: string
  to?: string
}>(), {
  fallback: '/',
  label: 'Back',
  to: undefined,
})

const goBack = useGoBack(props.fallback)
</script>

<template>
  <nav class="back-link-row" aria-label="Page navigation">
    <div class="back-link-row__inner">
      <component
        :is="props.to ? NuxtLink : 'button'"
        :to="props.to"
        :type="props.to ? undefined : 'button'"
        class="inline-flex items-center gap-1.5 text-sm text-black hover:underline bg-transparent border-0 p-0 cursor-pointer"
        @click="props.to ? undefined : goBack()"
      >
        <ArrowLeft class="h-4 w-4" aria-hidden="true" />
        <span>{{ label }}</span>
      </component>
    </div>
  </nav>
</template>

<style scoped>
.back-link-row {
  --back-link-row-max-width: 64rem;

  display: block;
  inline-size: 100vw;
  margin-inline: calc(50% - 50vw);
  text-align: start;
}

.back-link-row__inner {
  inline-size: 100%;
  max-inline-size: var(--back-link-row-max-width);
  margin-inline: auto;
  padding-inline: 1rem;
}
</style>
