<script setup lang="ts">
import { CalendarClock, ChevronRight, Heart, MapPin, Sparkles } from '@lucide/vue'

definePageMeta({ title: 'Match Preferences · Lonely Radish', middleware: 'logged-in' })

const preferences = reactive({
  distance: 4,
  minimumAge: 28,
  maximumAge: 36,
  timing: ['Weekday evenings', 'Weekend afternoons'],
  publicOnly: true,
  smallerMatchPool: true,
})
const saved = ref(false)
const location = reactive({ postcode: '', postcodeArea: '', label: '', hasLocation: false })
const locationSaving = ref(false)
const locationMessage = ref('')
const locationError = ref('')

async function saveLocation() {
  locationSaving.value = true; locationMessage.value = ''; locationError.value = ''
  try {
    const result = await $fetch<{ postcodeArea: string; label: string; hasLocation: boolean }>('/api/profile/location', {
      method: 'PUT', body: { postcode: location.postcode },
    })
    Object.assign(location, result, { postcode: '' })
    locationMessage.value = 'Approximate location saved.'
  } catch (error: any) { locationError.value = error?.data?.statusMessage || 'We could not save that location.' }
  finally { locationSaving.value = false }
}

async function removeLocation() {
  await $fetch('/api/profile/location', { method: 'DELETE' })
  Object.assign(location, { postcode: '', postcodeArea: '', label: '', hasLocation: false })
  locationMessage.value = 'Location removed.'
}

async function savePreferences() {
  await $fetch('/api/preferences/general', { method: 'PUT', body: preferences })
  saved.value = true
  window.setTimeout(() => { saved.value = false }, 2200)
}

onMounted(async () => {
  const [general, savedLocation] = await Promise.all([
    $fetch('/api/preferences/general'), $fetch('/api/profile/location'),
  ])
  Object.assign(preferences, general)
  Object.assign(location, savedLocation)
})
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

        <NuxtLink to="/preferences/schedule" class="group rounded-lg bg-[#F3E8DA] p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)] transition hover:-translate-y-0.5 sm:col-span-2">
          <div class="flex items-center justify-between"><CalendarClock class="size-6 text-[#B4234A]" /><ChevronRight class="size-5 transition group-hover:translate-x-1" /></div>
          <h2 class="mt-5 text-xl font-semibold">Timing and safety</h2>
          <p class="mt-2 text-sm leading-6 text-[#6E4D58]">Set the days and time ranges when you are usually free, and keep first meetings in public places.</p>
        </NuxtLink>
      </div>

      <form class="mt-8 space-y-5" @submit.prevent="savePreferences">
        <section id="location-and-age" class="scroll-mt-24 rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><MapPin class="mt-1 size-5 text-[#B4234A]" /><div><h2 class="text-xl font-semibold">Location and age</h2><p class="mt-1 text-sm text-[#6E4D58]">Keep possible matches practical for you.</p></div></div>
          <div class="mt-6 rounded-lg bg-[#FBF7F1] p-4">
            <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
              <label class="min-w-0 flex-1 text-sm font-medium">UK postcode
                <input v-model="location.postcode" class="field" maxlength="16" autocomplete="postal-code" placeholder="For example, SW1A 1AA">
              </label>
              <button type="button" :disabled="locationSaving || !location.postcode.trim()" class="rounded-lg bg-[#4D2F39] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="saveLocation">{{ locationSaving ? 'Checking…' : location.hasLocation ? 'Update location' : 'Save location' }}</button>
            </div>
            <p class="mt-2 text-xs leading-5 text-[#6E4D58]">We store an approximate map point and postcode area—not your full postcode—and never show your coordinates.</p>
            <div v-if="location.hasLocation" class="mt-3 flex flex-wrap items-center gap-3 text-sm"><span class="font-semibold text-[#52713A]">Using {{ location.label }} · {{ location.postcodeArea }}</span><button type="button" class="font-semibold text-[#8F1839] underline" @click="removeLocation">Remove</button></div>
            <p v-if="locationMessage" class="mt-2 text-sm font-semibold text-[#52713A]" role="status">{{ locationMessage }}</p>
            <p v-if="locationError" class="mt-2 text-sm font-semibold text-[#8F1839]" role="alert">{{ locationError }}</p>
          </div>
          <div class="mt-6 grid gap-6 sm:grid-cols-[0.65fr_1.35fr]">
            <label class="text-sm font-medium">
              Maximum distance
              <span class="field-with-suffix">
                <input v-model.number="preferences.distance" class="field field-with-suffix__input" type="number" min="1" max="100" aria-describedby="distance-unit">
                <span id="distance-unit" class="field-with-suffix__label">km</span>
              </span>
            </label>

            <fieldset>
              <legend class="text-sm font-medium">Age range</legend>
              <div class="mt-2 grid grid-cols-2 gap-3 rounded-lg bg-[#FBF7F1] p-4">
                <label class="text-sm font-medium" for="minimum-age">Minimum age
                  <input id="minimum-age" v-model.number="preferences.minimumAge" class="field" type="number" min="18" max="100" required>
                </label>
                <label class="text-sm font-medium" for="maximum-age">Maximum age
                  <input id="maximum-age" v-model.number="preferences.maximumAge" class="field" type="number" min="18" max="100" required>
                </label>
                <p v-if="preferences.minimumAge > preferences.maximumAge" class="col-span-2 text-xs font-semibold text-[#8F1839]" role="alert">Minimum age cannot be greater than maximum age.</p>
              </div>
            </fieldset>
          </div>
        </section>

        <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center"><button type="submit" :disabled="preferences.minimumAge > preferences.maximumAge" class="w-full rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">Save preferences</button><span v-if="saved" class="text-sm font-semibold text-[#6E8B52]">Preferences saved.</span></div>
      </form>
    </section>
  </main>
</template>

<style scoped>
.field { margin-top: .35rem; width: 100%; border-radius: .5rem; border: 1px solid #E8D8C4; background: #FBF7F1; padding: .7rem .85rem; outline: none; }
.field:focus { border-color: #B4234A; box-shadow: 0 0 0 3px rgba(180,35,74,.14); }
.field-with-suffix { position: relative; display: block; }
.field-with-suffix__input { padding-right: 3rem; }
.field-with-suffix__label { position: absolute; right: .85rem; top: 50%; transform: translateY(-38%); color: #6E4D58; font-size: .875rem; font-weight: 600; pointer-events: none; }
</style>
