<script setup lang="ts">
const props = defineProps<{ message: string; expiresAt: string; busy?: boolean }>()
const emit = defineEmits<{ undo: [] }>()
const remainingSeconds = ref(0)
let countdown: ReturnType<typeof setInterval> | null = null

function updateRemaining() {
  remainingSeconds.value = Math.max(0, Math.ceil((new Date(props.expiresAt).getTime() - Date.now()) / 1000))
}

onMounted(() => {
  updateRemaining()
  countdown = setInterval(updateRemaining, 250)
})
onBeforeUnmount(() => {
  if (countdown) clearInterval(countdown)
})
watch(() => props.expiresAt, updateRemaining)
</script>

<template>
  <div v-if="remainingSeconds > 0" class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#2A1520] px-4 py-3 text-sm text-white shadow-lg" role="status" aria-live="polite">
    <p>{{ message }} <span class="text-white/70">Undo available for {{ remainingSeconds }}s.</span></p>
    <button type="button" class="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#8F1839] disabled:opacity-60" :disabled="busy" @click="emit('undo')">{{ busy ? 'Restoring…' : 'Undo' }}</button>
  </div>
</template>
