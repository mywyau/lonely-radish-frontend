<script setup lang="ts">
type DojoTypedPromptState = 'idle' | 'correct'

type DojoTypedPromptToken = {
  char: string
  state?: DojoTypedPromptState
  comparable?: boolean
}

const props = withDefaults(defineProps<{
  chars?: string[]
  states?: DojoTypedPromptState[]
  tokens?: DojoTypedPromptToken[]
  containerClass?: string
  charClass?: string
  startDelay?: number
  speed?: number
  showCursor?: boolean
  cursorHeight?: string
  cursorOffsetY?: string
}>(), {
  chars: () => [],
  states: () => [],
  tokens: undefined,
  containerClass: '',
  charClass: '',
  startDelay: 180,
  speed: 120,
  showCursor: true,
  cursorHeight: '0.92em',
  cursorOffsetY: '0.08em',
})

const typedTokens = computed<DojoTypedPromptToken[]>(() => {
  if (props.tokens) return props.tokens

  return props.chars.map((char, index) => ({
    char,
    state: props.states[index] ?? 'idle',
    comparable: true,
  }))
})

const cursorDelay = computed(() => (
  props.startDelay + (Math.max(typedTokens.value.length, 1) * props.speed)
))
</script>

<template>
  <div
    class="dojo-typed-prompt"
    :class="props.containerClass"
    @copy.prevent
    @cut.prevent
    @contextmenu.prevent
    @dragstart.prevent
    @selectstart.prevent
  >
    <span
      v-for="(token, i) in typedTokens"
      :key="`${token.char}-${i}`"
      class="dojo-typed-prompt__char transition-colors duration-200"
      :class="[
        props.charClass,
        {
          'text-green-600 font-semibold': token.state === 'correct',
          'text-gray-400': token.comparable !== false && token.state === 'idle',
        },
      ]"
      :style="{ '--dojo-type-delay': `${props.startDelay + (i * props.speed)}ms` }"
    >{{ token.char }}</span>

    <span
      v-if="props.showCursor"
      class="dojo-typed-prompt__cursor"
      :style="{
        '--dojo-cursor-delay': `${cursorDelay}ms`,
        '--dojo-cursor-height': props.cursorHeight,
        '--dojo-cursor-offset-y': props.cursorOffsetY,
      }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.dojo-typed-prompt__char {
  display: inline-block;
  opacity: 0;
  transform: translateY(0.12em);
  animation: dojo-type-character 0.01s steps(1, end) forwards;
  animation-delay: var(--dojo-type-delay);
}

.dojo-typed-prompt__cursor {
  display: inline-block;
  width: 0.08em;
  height: var(--dojo-cursor-height);
  margin-left: 0.12em;
  transform: translateY(var(--dojo-cursor-offset-y));
  background: currentColor;
  animation: dojo-cursor-enter 0.01s steps(1, end) forwards var(--dojo-cursor-delay),
    dojo-cursor-blink 0.85s steps(1, end) infinite var(--dojo-cursor-delay);
  opacity: 0;
}

@keyframes dojo-type-character {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes dojo-cursor-enter {
  to {
    opacity: 1;
  }
}

@keyframes dojo-cursor-blink {
  0%, 45% {
    opacity: 1;
  }

  46%, 100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .dojo-typed-prompt__char,
  .dojo-typed-prompt__cursor {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
