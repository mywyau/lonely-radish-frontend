<script setup lang="ts">
import { Heart, Info, UsersRound } from '@lucide/vue'
import { openRaceEthnicityPreferenceLabel, raceEthnicityOptions } from '~/utils/raceEthnicity'
import { sexualOrientationPreferenceOptions } from '~/utils/sexualOrientation'

definePageMeta({ title: 'Dating Preferences · Lonely Radish', middleware: 'logged-in' })

const genderOptions = ['Women', 'Men', 'Non-binary']
const preferences = reactive({ genders: [] as string[], orientations: [] as string[], raceEthnicities: [] as string[],
  openToEveryone: true, noOrientationPreference: false, noRaceEthnicityPreference: true })
const saved = ref(false)
const saveError = ref('')

function toggle(list: string[], value: string) { const index = list.indexOf(value); index >= 0 ? list.splice(index, 1) : list.push(value) }
function toggleGender(value: string) { preferences.openToEveryone = false; toggle(preferences.genders, value); if (!preferences.genders.length) preferences.openToEveryone = true }
function selectEveryone() { preferences.openToEveryone = true; preferences.genders.splice(0) }
function toggleOrientation(value: string) { toggle(preferences.orientations, value) }
function toggleRaceEthnicity(value: string) { preferences.noRaceEthnicityPreference = false; toggle(preferences.raceEthnicities, value); if (!preferences.raceEthnicities.length) preferences.noRaceEthnicityPreference = true }
function selectNoRacePreference() { preferences.noRaceEthnicityPreference = true; preferences.raceEthnicities.splice(0) }
async function save() {
  saveError.value = ''
  if (!preferences.orientations.length) { saveError.value = 'Choose at least one sexual orientation you are open to dating.'; return }
  await $fetch('/api/preferences/dating', { method: 'PUT', body: preferences })
  saved.value = true; window.setTimeout(() => { saved.value = false }, 2200)
}
onMounted(async () => { Object.assign(preferences, await $fetch('/api/preferences/dating')) })
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Match preferences</p>
      <h1 class="mt-2 text-4xl font-semibold">Who are you interested in meeting?</h1>
      <p class="mt-3 leading-6 text-[#6E4D58]">These choices affect who you see and stay private. You can change them at any time.</p>

      <form class="mt-8 space-y-5" @submit.prevent="save">
        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><Heart class="mt-1 size-5 text-[#B4234A]" /><div><h2 class="text-xl font-semibold">Gender preference</h2><p class="mt-1 text-sm text-[#6E4D58]">Select the genders you are open to dating.</p></div></div>
          <div class="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" class="choice" :class="preferences.openToEveryone && 'choice-selected'" :aria-pressed="preferences.openToEveryone" @click="selectEveryone">Everyone</button>
            <button v-for="option in genderOptions" :key="option" type="button" class="choice" :class="preferences.genders.includes(option) && 'choice-selected'" :aria-pressed="preferences.genders.includes(option)" @click="toggleGender(option)">{{ option }}</button>
          </div>
        </section>

        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><Heart class="mt-1 size-5 text-[#B4234A]" /><div><h2 class="text-xl font-semibold">Sexual orientation preferences</h2><p class="mt-1 text-sm text-[#6E4D58]">Choose one or more orientations you are open to dating, separately from gender.</p></div></div>
          <div class="mt-5 grid gap-2 sm:grid-cols-3">
            <button v-for="option in sexualOrientationPreferenceOptions" :key="option.value" type="button" class="choice" :class="preferences.orientations.includes(option.value) && 'choice-selected'" :aria-pressed="preferences.orientations.includes(option.value)" @click="toggleOrientation(option.value)">{{ option.label }}</button>
          </div>
          <p class="mt-3 text-xs leading-5 text-[#6E4D58]">“Homosexual” includes people who describe themselves as gay or lesbian.</p>
          <p class="mt-2 text-xs font-semibold text-[#6E4D58]">{{ preferences.orientations.length ? `${preferences.orientations.length} selected` : 'Select at least one orientation' }}</p>
        </section>

        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><UsersRound class="mt-1 size-5 text-[#B4234A]" /><div><h2 class="text-xl font-semibold">Racial and ethnic preferences</h2><p class="mt-1 text-sm text-[#6E4D58]">This is optional. Choose one or more broad backgrounds, or leave this open.</p></div></div>
          <div class="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" class="choice sm:col-span-2" :class="preferences.noRaceEthnicityPreference && 'choice-selected'" :aria-pressed="preferences.noRaceEthnicityPreference" @click="selectNoRacePreference">{{ openRaceEthnicityPreferenceLabel }}</button>
            <button v-for="option in raceEthnicityOptions" :key="option" type="button" class="choice" :class="preferences.raceEthnicities.includes(option) && 'choice-selected'" :aria-pressed="preferences.raceEthnicities.includes(option)" @click="toggleRaceEthnicity(option)">{{ option }}</button>
          </div>
          <div class="mt-5 flex gap-2 rounded-lg bg-[#F3E8DA] p-4 text-sm leading-6 text-[#4D2F39]"><Info class="mt-0.5 size-4 shrink-0" /><p>Everyone describes their identity in their own way. These broad choices only affect who appears for you; they don’t redefine anyone else’s identity.</p></div>
        </section>

        <div class="flex flex-wrap items-center gap-3"><button type="submit" :disabled="!preferences.orientations.length" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Save dating preferences</button><NuxtLink to="/preferences" class="px-3 py-2 text-sm font-semibold text-[#8F1839]">Back to match preferences</NuxtLink><span v-if="saved" class="text-sm font-semibold text-[#6E8B52]">Dating preferences saved.</span></div>
        <p v-if="saveError" class="text-sm font-semibold text-[#8F1839]" role="alert">{{ saveError }}</p>
      </form>
    </section>
  </main>
</template>

<style scoped>
.choice { border-radius: .5rem; background: #FBF7F1; padding: .8rem 1rem; text-align: left; font-size: .875rem; font-weight: 600; transition: background-color .15s, color .15s; }
.choice:hover { background: #FCE3E8; }
.choice-selected { background: #B4234A; color: white; }
.choice-selected:hover { background: #8F1839; }
</style>
