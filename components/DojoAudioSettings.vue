<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
} from '@lucide/vue'

import { useAudioVolume } from '~/composables/useAudioVolume'

type AudioVoice = 'male' | 'female'

const props = defineProps<{
  voice: AudioVoice
  playbackRate: number
}>()

const emit = defineEmits<{
  'update:voice': [voice: AudioVoice]
  'update:playbackRate': [rate: number]
}>()

const { volume } = useAudioVolume()

const settingsDetails = ref<HTMLDetailsElement | null>(null)
const minPlaybackRate = 0.4
const maxPlaybackRate = 2
const playbackStep = 0.2

const speedDeltaPercent = computed(() => Math.round((props.playbackRate - 1) * 100))
const speedDeltaLabel = computed(() => {
  if (speedDeltaPercent.value === 0) return 'Normal speed'

  return speedDeltaPercent.value > 0
    ? `+${speedDeltaPercent.value}% faster`
    : `${Math.abs(speedDeltaPercent.value)}% slower`
})

const closeSettings = () => {
  settingsDetails.value?.removeAttribute('open')
}

const setAudioVoice = (voice: AudioVoice) => {
  emit('update:voice', voice)
}

const decreasePlaybackRate = () => {
  emit(
    'update:playbackRate',
    Math.max(minPlaybackRate, Number((props.playbackRate - playbackStep).toFixed(2)))
  )
}

const increasePlaybackRate = () => {
  emit(
    'update:playbackRate',
    Math.min(maxPlaybackRate, Number((props.playbackRate + playbackStep).toFixed(2)))
  )
}
</script>

<template>
  <details ref="settingsDetails" class="group relative">
    <summary
      class="inline-flex list-none cursor-pointer items-center gap-1.5 rounded-lg bg-yellow-200 px-3 py-1.5 text-xs font-semibold text-black shadow-sm transition hover:bg-yellow-100">
      <Settings class="h-3.5 w-3.5" />
      <span>Settings</span>
    </summary>

    <div
      class="fixed left-1/2 top-24 z-50 max-h-[calc(100vh-7rem)] w-[calc(100vw-1.5rem)] max-w-sm -translate-x-1/2 overflow-y-auto rounded-xl bg-yellow-100 p-3 shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-none sm:w-72 sm:translate-x-0 sm:overflow-visible">
      <div class="mb-3 flex items-center justify-between">
        <p class="text-xs font-semibold uppercase tracking-wide text-gray-800">
          Settings
        </p>
        <button type="button"
          class="flex h-7 w-7 items-center justify-center rounded-full text-gray-900 transition hover:bg-black/5"
          aria-label="Close settings" @click="closeSettings">
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="space-y-4">
        <div class="space-y-1">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Volume</p>
          <div class="flex items-center gap-2">
            <input v-model="volume" type="range" min="0" max="1" step="0.01"
              class="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600" />
            <span class="w-8 text-xs tabular-nums text-gray-700">{{ Math.round(volume * 100) }}%</span>
          </div>
        </div>

        <div class="space-y-1">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Speed</p>
          <div class="flex items-center justify-between gap-2">
            <button type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-600 transition hover:bg-black/5 hover:text-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="playbackRate <= minPlaybackRate" aria-label="Reduce playback speed by 20%"
              @click="decreasePlaybackRate">
              <ChevronLeft class="h-4 w-4" />
            </button>
            <span class="w-28 text-center text-xs font-semibold tabular-nums text-gray-900">{{ speedDeltaLabel }}</span>
            <button type="button"
              class="inline-flex h-7 w-7 items-center justify-center rounded-full text-gray-600 transition hover:bg-black/5 hover:text-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="playbackRate >= maxPlaybackRate" aria-label="Increase playback speed by 20%"
              @click="increasePlaybackRate">
              <ChevronRight class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <p class="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Voice</p>
          <div class="flex rounded-full bg-gray-100 p-1" aria-label="Audio voice">
            <button type="button" class="flex-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:text-xs"
              :class="voice === 'male'
                ? 'bg-blue-200 text-black shadow-sm'
                : 'bg-transparent text-gray-700 hover:bg-gray-200'"
              :aria-pressed="voice === 'male'" @click="setAudioVoice('male')">
              Male
            </button>

            <button type="button" class="flex-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition sm:px-3 sm:text-xs"
              :class="voice === 'female'
                ? 'bg-pink-200 text-black shadow-sm'
                : 'bg-transparent text-gray-700 hover:bg-gray-200'"
              :aria-pressed="voice === 'female'" @click="setAudioVoice('female')">
              Female
            </button>
          </div>
        </div>
      </div>
    </div>
  </details>
</template>
