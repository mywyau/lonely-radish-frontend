<script setup lang="ts">
type AudioVoice = 'male' | 'female'

const props = withDefaults(defineProps<{
  src: string
  autoplay?: boolean
  playbackRate?: number
  voice?: AudioVoice
}>(), {
  autoplay: true,
  playbackRate: 1,
})

const audioVoice = computed<AudioVoice>(() => {
  if (props.voice) return props.voice

  return props.src.toLowerCase().includes('female') ? 'female' : 'male'
})
</script>

<template>
  <div class="floating-audio-control" :class="`is-${audioVoice}`" aria-live="polite">
    <span class="floating-audio-burst" aria-hidden="true"></span>
    <AudioButton :src="src" :autoplay="autoplay" :playback-rate="playbackRate" size="sm" />
  </div>
</template>

<style scoped>
.floating-audio-control {
  position: fixed;
  left: 4.65rem;
  bottom: calc(0.85rem + env(safe-area-inset-bottom, 0px));
  z-index: 70;
  isolation: isolate;
  --audio-burst-primary: rgba(82, 156, 214, 0.95);
  --audio-burst-secondary: rgba(37, 116, 190, 0.9);
  --audio-burst-tertiary: rgba(132, 196, 232, 0.92);
  --audio-burst-deep: rgba(19, 91, 166, 0.86);
}

.floating-audio-control.is-female {
  --audio-burst-primary: rgba(232, 108, 183, 0.95);
  --audio-burst-secondary: rgba(211, 77, 157, 0.9);
  --audio-burst-tertiary: rgba(246, 159, 211, 0.92);
  --audio-burst-deep: rgba(184, 48, 137, 0.86);
}

.floating-audio-control :deep(button) {
  position: relative;
  z-index: 2;
  width: 3.1rem;
  height: 3.1rem;
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(15, 15, 15, 0.9);
  box-shadow: none;
}

.floating-audio-burst {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.28rem;
  height: 0.28rem;
  border-radius: 999px;
  background: transparent;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.35);
  z-index: 1;
  box-shadow:
    -0.18rem -1.42rem 0 -0.03rem var(--audio-burst-primary),
    0.58rem -1.18rem 0 -0.08rem var(--audio-burst-secondary),
    1.42rem -0.36rem 0 -0.05rem var(--audio-burst-tertiary),
    1.28rem 0.84rem 0 -0.08rem var(--audio-burst-deep),
    0.24rem 1.44rem 0 -0.04rem var(--audio-burst-primary),
    -0.72rem 1.1rem 0 -0.08rem var(--audio-burst-tertiary),
    -1.44rem 0.42rem 0 -0.05rem var(--audio-burst-secondary),
    -1.08rem -0.82rem 0 -0.1rem var(--audio-burst-primary);
  pointer-events: none;
}

.floating-audio-burst::before,
.floating-audio-burst::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  background: transparent;
  transform: translate(-50%, -50%);
}

.floating-audio-burst::before {
  width: 0.2rem;
  height: 0.2rem;
  box-shadow:
    0.22rem -1.72rem 0 -0.04rem var(--audio-burst-deep),
    1.52rem -0.96rem 0 -0.03rem var(--audio-burst-primary),
    1.72rem 0.24rem 0 -0.06rem var(--audio-burst-tertiary),
    0.78rem 1.58rem 0 -0.04rem var(--audio-burst-secondary),
    -0.32rem 1.78rem 0 -0.06rem var(--audio-burst-primary),
    -1.56rem 0.92rem 0 -0.03rem var(--audio-burst-deep),
    -1.72rem -0.28rem 0 -0.06rem var(--audio-burst-tertiary),
    -0.84rem -1.44rem 0 -0.05rem var(--audio-burst-secondary);
}

.floating-audio-burst::after {
  width: 0.16rem;
  height: 0.16rem;
  background: transparent;
  box-shadow:
    0.96rem -1.68rem 0 -0.03rem var(--audio-burst-tertiary),
    1.9rem -0.08rem 0 -0.04rem var(--audio-burst-deep),
    1.22rem 1.22rem 0 -0.03rem var(--audio-burst-primary),
    -0.04rem 2.02rem 0 -0.05rem var(--audio-burst-tertiary),
    -1.18rem 1.42rem 0 -0.04rem var(--audio-burst-secondary),
    -1.92rem 0.04rem 0 -0.03rem var(--audio-burst-primary),
    -1.34rem -1.16rem 0 -0.04rem var(--audio-burst-tertiary),
    0.04rem -1.98rem 0 -0.05rem var(--audio-burst-deep);
}

.floating-audio-control:hover .floating-audio-burst,
.floating-audio-control:focus-within .floating-audio-burst {
  animation: audioBurst 650ms ease-out both;
}

.floating-audio-control :deep(button:hover) {
  background: transparent;
}

.floating-audio-control :deep(svg) {
  width: 2rem;
  height: 2rem;
  stroke-width: 2.4;
}

@media (min-width: 768px) {
  .floating-audio-control {
    left: 5rem;
    right: auto;
    bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  }

  .floating-audio-control::before {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 9rem;
    height: 4rem;
    border: 1px solid rgba(17, 24, 39, 0.05);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.32);
    box-shadow: 0 14px 34px rgba(17, 24, 39, 0.08);
    transform: translate(calc(-50% - 1.45rem), -50%);
    backdrop-filter: blur(8px);
    z-index: 0;
    pointer-events: none;
  }
}

@keyframes audioBurst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2);
  }

  35% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.12);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.45);
  }
}
</style>
