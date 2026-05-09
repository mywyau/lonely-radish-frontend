<script setup lang="ts">
const props = withDefaults(defineProps<{
  text: string
  tag?: string
  speed?: number
  startDelay?: number
  active?: boolean
  showCursor?: boolean
  keepCursorAfterComplete?: boolean
}>(), {
  tag: 'h1',
  speed: 55,
  startDelay: 120,
  active: true,
  showCursor: true,
  keepCursorAfterComplete: true,
})

const emit = defineEmits<{
  complete: []
}>()

const displayText = ref(props.active ? props.text : '')
const isTyping = ref(false)
const hasCompleted = ref(!props.active)
const prefersReducedMotion = ref(false)
let timeoutId: ReturnType<typeof setTimeout> | undefined
let intervalId: ReturnType<typeof setInterval> | undefined

const shouldShowCursor = computed(() => (
  props.showCursor
  && props.active
  && (isTyping.value || (hasCompleted.value && props.keepCursorAfterComplete))
))

function clearTimers() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = undefined
  }

  if (intervalId) {
    clearInterval(intervalId)
    intervalId = undefined
  }
}

function finishImmediately(text = props.text, shouldEmit = true) {
  clearTimers()
  displayText.value = text
  isTyping.value = false
  hasCompleted.value = true

  if (shouldEmit) {
    emit('complete')
  }
}

function resetInactive() {
  clearTimers()
  displayText.value = ''
  isTyping.value = false
  hasCompleted.value = false
}

function typeText(text = props.text) {
  clearTimers()

  if (!props.active) {
    resetInactive()
    return
  }

  if (prefersReducedMotion.value || !text) {
    finishImmediately(text)
    return
  }

  displayText.value = ''
  isTyping.value = true
  hasCompleted.value = false

  timeoutId = setTimeout(() => {
    let nextIndex = 0

    intervalId = setInterval(() => {
      nextIndex += 1
      displayText.value = text.slice(0, nextIndex)

      if (nextIndex >= text.length) {
        clearTimers()
        isTyping.value = false
        hasCompleted.value = true
        emit('complete')
      }
    }, props.speed)
  }, props.startDelay)
}

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  typeText(props.text)
})

watch(() => [props.text, props.active] as const, ([nextText]) => {
  if (!import.meta.client) {
    displayText.value = props.active ? nextText : ''
    return
  }

  typeText(nextText)
})

onBeforeUnmount(clearTimers)
</script>

<template>
  <component :is="props.tag" class="typewriter-heading">
    <span aria-hidden="true">{{ displayText }}</span>
    <span
      v-if="shouldShowCursor"
      class="typewriter-cursor"
      :class="{ 'is-typing': isTyping }"
      aria-hidden="true"
    />
    <span class="sr-only">{{ props.text }}</span>
  </component>
</template>

<style scoped>
.typewriter-heading {
  display: block;
}

.typewriter-cursor {
  display: inline-block;
  width: 0.08em;
  height: 0.92em;
  margin-left: 0.12em;
  transform: translateY(0.08em);
  background: currentColor;
  animation: typewriter-cursor-blink 0.85s steps(1, end) infinite;
}

.typewriter-cursor.is-typing {
  animation-duration: 0.7s;
}

@keyframes typewriter-cursor-blink {
  0%, 45% {
    opacity: 1;
  }

  46%, 100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .typewriter-cursor {
    animation: none;
  }
}
</style>
