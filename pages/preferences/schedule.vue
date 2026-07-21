<script setup lang="ts">
import { CalendarClock, Check, ShieldCheck } from '@lucide/vue'

definePageMeta({ title: 'Schedule & Safety · Lonely Radish', middleware: 'logged-in' })

const days = reactive([
  { weekday: 0, name: 'Monday', enabled: false, startTime: '18:00', endTime: '21:00' },
  { weekday: 1, name: 'Tuesday', enabled: false, startTime: '18:00', endTime: '21:00' },
  { weekday: 2, name: 'Wednesday', enabled: false, startTime: '18:00', endTime: '21:00' },
  { weekday: 3, name: 'Thursday', enabled: false, startTime: '18:00', endTime: '21:00' },
  { weekday: 4, name: 'Friday', enabled: false, startTime: '18:00', endTime: '22:00' },
  { weekday: 5, name: 'Saturday', enabled: false, startTime: '10:00', endTime: '18:00' },
  { weekday: 6, name: 'Sunday', enabled: false, startTime: '10:00', endTime: '18:00' },
])
const publicOnly = ref(true)
const availabilityVisibleBeforeMatch = ref(false)
const saving = ref(false)
const saved = ref(false)
const resetPending = ref(false)
const errorMessage = ref('')
const selectedCount = computed(() => days.filter(day => day.enabled).length)
const invalidDay = computed(() => days.find(day => day.enabled && day.startTime >= day.endTime))

function resetAvailability() {
  if (selectedCount.value && !window.confirm('Reset every availability day and time?')) return
  for (const day of days) {
    day.enabled = false
    day.startTime = day.weekday < 5 ? '18:00' : '10:00'
    day.endTime = day.weekday < 4 ? '21:00' : day.weekday === 4 ? '22:00' : '18:00'
  }
  saved.value = false
  resetPending.value = true
  errorMessage.value = ''
}

async function save() {
  errorMessage.value = ''
  if (invalidDay.value) { errorMessage.value = `${invalidDay.value.name} end time must be after its start time.`; return }
  saving.value = true
  try {
    await $fetch('/api/preferences/schedule', { method: 'PUT', body: { publicOnly: publicOnly.value,
      availabilityVisibleBeforeMatch: availabilityVisibleBeforeMatch.value,
      windows: days.filter(day => day.enabled).map(({ weekday, startTime, endTime }) => ({ weekday, startTime, endTime })) } })
    saved.value = true
    resetPending.value = false
    window.setTimeout(() => { saved.value = false }, 2200)
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your schedule could not be saved.' }
  finally { saving.value = false }
}

onMounted(async () => {
  try {
    const response = await $fetch<any>('/api/preferences/schedule')
    publicOnly.value = response.publicOnly
    availabilityVisibleBeforeMatch.value = response.availabilityVisibleBeforeMatch ?? false
    for (const window of response.windows) {
      const day = days.find(item => item.weekday === window.weekday)
      if (day) { day.enabled = true; day.startTime = window.startTime.slice(0, 5); day.endTime = window.endTime.slice(0, 5) }
    }
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your schedule could not be loaded.' }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Match preferences</p>
      <h1 class="mt-2 text-4xl font-semibold">Timing and safety</h1>
      <p class="mt-3 max-w-2xl leading-6 text-[#6E4D58]">Share the days and time ranges when you are generally free. Matches can use this when suggesting a date, without needing an open-ended chat.</p>

      <form class="mt-8 space-y-5" @submit.prevent="save">
        <section class="rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-6">
          <div class="flex items-start justify-between gap-4"><div class="flex items-start gap-3"><CalendarClock class="mt-1 size-5 text-[#B4234A]" /><div><h2 class="text-xl font-semibold">Weekly availability</h2><p class="mt-1 text-sm text-[#6E4D58]">Select a day, then set the earliest and latest time that usually works.</p></div></div><button type="button" class="shrink-0 text-sm font-semibold text-[#8F1839] underline underline-offset-4 disabled:opacity-40" :disabled="!selectedCount" @click="resetAvailability">Reset all</button></div>
          <div class="mt-6 grid gap-3">
            <article v-for="day in days" :key="day.weekday" class="rounded-lg border p-4" :class="day.enabled ? 'border-[#D7A7B3] bg-[#FCE3E8]/40' : 'border-[#E8D8C4] bg-[#FBF7F1]'">
              <div class="flex items-center justify-between gap-4"><label class="flex items-center gap-3 font-semibold"><input v-model="day.enabled" type="checkbox" class="size-4 accent-[#B4234A]">{{ day.name }}</label><span class="text-xs font-semibold text-[#6E4D58]">{{ day.enabled ? 'Available' : 'Not available' }}</span></div>
              <div v-if="day.enabled" class="mt-4 grid grid-cols-2 gap-3">
                <label class="text-sm font-medium">From<input v-model="day.startTime" type="time" required class="field"></label>
                <label class="text-sm font-medium">Until<input v-model="day.endTime" type="time" required class="field"></label>
              </div>
            </article>
          </div>
          <p class="mt-4 text-sm text-[#6E4D58]">{{ selectedCount ? `${selectedCount} ${selectedCount === 1 ? 'day' : 'days'} selected` : 'No regular availability selected yet' }}</p>
          <p v-if="resetPending" class="mt-1 text-xs font-semibold text-[#8F1839]">Reset is ready. Select Save schedule to apply it.</p>
          <label class="mt-5 flex items-start justify-between gap-4 rounded-lg bg-[#F3E8DA] p-4 text-sm"><span><strong class="block">Show availability before matching</strong><span class="mt-1 block leading-5 text-[#6E4D58]">Off by default. Matches can always see your schedule when planning a date.</span></span><input v-model="availabilityVisibleBeforeMatch" type="checkbox" class="mt-1 size-4 shrink-0 accent-[#B4234A]"></label>
        </section>

        <section class="rounded-lg bg-[#EAF2DE] p-5 sm:p-6"><div class="flex items-start gap-3"><ShieldCheck class="mt-1 size-5 text-[#6E8B52]" /><div class="flex-1"><h2 class="text-xl font-semibold">First-date safety</h2><p class="mt-1 text-sm leading-6 text-[#4D2F39]">Keep first meetings in places where other people are around.</p><label class="mt-5 flex items-center justify-between gap-4 rounded-lg bg-white/75 p-4 text-sm font-semibold"><span>Only suggest public places</span><input v-model="publicOnly" type="checkbox" class="size-4 accent-[#B4234A]"></label></div></div></section>

        <p v-if="errorMessage" class="rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center"><button type="submit" :disabled="saving || Boolean(invalidDay)" class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"><Check class="size-4" />{{ saving ? 'Saving…' : 'Save schedule' }}</button><NuxtLink to="/preferences" class="rounded-lg px-4 py-3 text-center text-sm font-semibold text-[#8F1839]">Back to match preferences</NuxtLink><span v-if="saved" class="text-sm font-semibold text-[#6E8B52]">Schedule saved.</span></div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.field { margin-top: .35rem; width: 100%; border-radius: .5rem; border: 1px solid #E8D8C4; background: white; padding: .7rem .8rem; outline: none; }
.field:focus { border-color: #B4234A; box-shadow: 0 0 0 3px rgba(180,35,74,.14); }
</style>
