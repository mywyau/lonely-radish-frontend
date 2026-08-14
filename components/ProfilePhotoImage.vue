<script setup lang="ts">
import type { PropType } from 'vue'
import { UserRound } from '@lucide/vue'

const props = defineProps({
  src: { type: String, required: true },
  alt: { type: String, default: '' },
  imageClass: { type: [String, Array, Object] as PropType<string | string[] | Record<string, boolean>>, default: 'h-full w-full object-cover' },
})

const image = ref<HTMLImageElement | null>(null)
const loaded = ref(false)
const failed = ref(false)

function checkCachedImage() {
  if (!image.value?.complete) return
  loaded.value = image.value.naturalWidth > 0
  failed.value = image.value.naturalWidth === 0
}

watch(() => props.src, async () => {
  loaded.value = false
  failed.value = false
  await nextTick()
  checkCachedImage()
})

onMounted(checkCachedImage)
</script>

<template>
  <span class="relative block overflow-hidden bg-[#E8D8C4]" :aria-busy="!loaded && !failed">
    <span v-if="!loaded && !failed" class="absolute inset-0 flex items-center justify-center bg-[#E8D8C4]" aria-hidden="true">
      <span class="absolute inset-0 animate-pulse bg-[#F3E8DA]" />
      <UserRound class="relative size-7 text-[#8A6A74]/65" />
    </span>
    <span v-else-if="failed" class="absolute inset-0 flex items-center justify-center bg-[#F3E8DA]" aria-hidden="true">
      <UserRound class="size-7 text-[#8A6A74]" />
    </span>
    <img
      ref="image"
      :src="src"
      :alt="alt"
      :class="[imageClass, 'transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0']"
      @load="loaded = true; failed = false"
      @error="loaded = false; failed = true"
    >
  </span>
</template>

<style scoped>
.triptych {
  height: 100%;
  width: 300%;
  max-width: none;
  object-fit: cover;
}

.triptych-first { transform: translateX(0); }
.triptych-second { transform: translateX(-33.333%); }
.triptych-third { transform: translateX(-66.666%); }
</style>
