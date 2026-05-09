<script setup lang="ts">
const props = withDefaults(defineProps<{
  headingText: string
  subheadingText: string
  headingClass?: string
  subheadingClass?: string
  headingTag?: string
  subheadingTag?: string
  speed?: number
  headingStartDelay?: number
  subheadingStartDelay?: number
  gap?: string
}>(), {
  headingClass: '',
  subheadingClass: '',
  headingTag: 'h1',
  subheadingTag: 'p',
  speed: 55,
  headingStartDelay: 120,
  subheadingStartDelay: 120,
  gap: '1rem',
})

const isSubheadingActive = ref(false)

watch(() => [props.headingText, props.subheadingText] as const, () => {
  isSubheadingActive.value = false
})
</script>

<template>
  <div class="typewriter-title-block" :style="{ gap: props.gap }">
    <TypewriterHeading
      :text="props.headingText"
      :tag="props.headingTag"
      :speed="props.speed"
      :start-delay="props.headingStartDelay"
      :show-cursor="false"
      :keep-cursor-after-complete="false"
      :class="props.headingClass"
      @complete="isSubheadingActive = true"
    />

    <TypewriterHeading
      :text="props.subheadingText"
      :tag="props.subheadingTag"
      :speed="props.speed"
      :start-delay="props.subheadingStartDelay"
      :active="isSubheadingActive"
      :class="props.subheadingClass"
    />
  </div>
</template>

<style scoped>
.typewriter-title-block {
  display: flex;
  width: 100%;
  flex-direction: column;
}
</style>
