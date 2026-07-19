<script setup lang="ts">
import { CalendarDays, ChevronRight, Heart, MapPin, ShieldCheck, Sparkles, UsersRound } from '@lucide/vue'

definePageMeta({ title: 'Match Preferences · Lonely Radish' })

const preferences = reactive({
  distance: 4,
  ageRange: '28-36',
  neighbourhood: 'East London',
  timing: ['Weekday evenings', 'Weekend afternoons'],
  publicOnly: true,
  smallerMatchPool: true,
})
const timingOptions = ['Weekday evenings', 'Friday night', 'Weekend mornings', 'Weekend afternoons']
const saved = ref(false)

function toggleTiming(value: string) {
  const index = preferences.timing.indexOf(value)
  index >= 0 ? preferences.timing.splice(index, 1) : preferences.timing.push(value)
}

function savePreferences() {
  saved.value = true
  window.setTimeout(() => { saved.value = false }, 2200)
}
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <div class="max-w-2xl">
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Match settings</p>
        <h1 class="mt-2 text-4xl font-semibold">Match preferences</h1>
        <p class="mt-3 leading-6 text-[#6E4D58]">Manage each part separately, so it is easy to revisit what matters to you.</p>
      </div>

      <div class="mt-8 grid gap-4 sm:grid-cols-2">
        <NuxtLink to="/preferences/activities" class="group rounded-lg bg-[#FCE3E8] p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)] transition hover:-translate-y-0.5">
          <div class="flex items-center justify-between"><Sparkles class="size-6 text-[#B4234A]" /><ChevronRight class="size-5 transition group-hover:translate-x-1" /></div>
          <h2 class="mt-5 text-xl font-semibold">Activity interests</h2>
          <p class="mt-2 text-sm leading-6 text-[#6E4D58]">Choose the plans, sports, games, and experiences you would enjoy sharing.</p>
        </NuxtLink>

        <NuxtLink to="/preferences/dating" class="group rounded-lg bg-[#EAF2DE] p-6 shadow-[0_10px_24px_rgba(110,139,82,0.1)] transition hover:-translate-y-0.5">
          <div class="flex items-center justify-between"><Heart class="size-6 text-[#B4234A]" /><ChevronRight class="size-5 transition group-hover:translate-x-1" /></div>
          <h2 class="mt-5 text-xl font-semibold">Dating preferences</h2>
          <p class="mt-2 text-sm leading-6 text-[#6E4D58]">Set sexual, racial, and ethnic preferences, or keep your matching pool open.</p>
        </NuxtLink>
      </div>

      <form class="mt-8 space-y-5" @submit.prevent="savePreferences">
        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><MapPin class="mt-1 size-5 text-[#B4234A]" /><div><h2 class="text-xl font-semibold">Location and age</h2><p class="mt-1 text-sm text-[#6E4D58]">Keep possible matches practical for you.</p></div></div>
          <div class="mt-6 grid gap-4 sm:grid-cols-3">
            <label class="text-sm font-medium">Maximum distance<input v-model.number="preferences.distance" class="field" type="number" min="1" max="100"></label>
            <label class="text-sm font-medium">Age range<input v-model="preferences.ageRange" class="field" type="text"></label>
            <label class="text-sm font-medium">Neighbourhood<input v-model="preferences.neighbourhood" class="field" type="text"></label>
          </div>
        </section>

        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><CalendarDays class="mt-1 size-5 text-[#B4234A]" /><div><h2 class="text-xl font-semibold">Timing and safety</h2><p class="mt-1 text-sm text-[#6E4D58]">Control when and how you would like to meet.</p></div></div>
          <div class="mt-5 flex flex-wrap gap-2"><button v-for="option in timingOptions" :key="option" type="button" class="rounded-full px-3 py-2 text-sm font-semibold" :class="preferences.timing.includes(option) ? 'bg-[#6E8B52] text-white' : 'bg-[#F3E8DA] text-[#4D2F39]'" @click="toggleTiming(option)">{{ option }}</button></div>
          <div class="mt-6 grid gap-3">
            <label class="option-row"><span class="inline-flex items-center gap-2"><ShieldCheck class="size-4 text-[#6E8B52]" />Public places only</span><input v-model="preferences.publicOnly" type="checkbox"></label>
            <label class="option-row"><span class="inline-flex items-center gap-2"><UsersRound class="size-4 text-[#6E8B52]" />Show a smaller, more relevant match pool</span><input v-model="preferences.smallerMatchPool" type="checkbox"></label>
          </div>
        </section>
        <div class="flex items-center gap-3"><button type="submit" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Save preferences</button><span v-if="saved" class="text-sm font-semibold text-[#6E8B52]">Preferences saved locally.</span></div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.field { margin-top: .35rem; width: 100%; border-radius: .5rem; border: 1px solid #E8D8C4; background: #FBF7F1; padding: .7rem .85rem; outline: none; }
.field:focus { border-color: #B4234A; box-shadow: 0 0 0 3px rgba(180,35,74,.14); }
.option-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; border-radius: .5rem; background: #FBF7F1; padding: .75rem 1rem; font-size: .875rem; font-weight: 500; }
</style>
