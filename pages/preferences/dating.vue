<script setup lang="ts">
import { Heart, Info, UsersRound } from '@lucide/vue'

definePageMeta({ title: 'Dating Preferences · Lonely Radish', middleware: 'logged-in' })

const genderOptions = ['Women', 'Men', 'Non-binary']
const raceEthnicityOptions = ['Asian', 'Black / African / Caribbean', 'Hispanic / Latino', 'Middle Eastern', 'North African', 'Native / Indigenous', 'Pacific Islander', 'White', 'Multiracial / multi-ethnic']
const preferences = reactive({ genders: [] as string[], raceEthnicities: [] as string[], openToEveryone: true, noRaceEthnicityPreference: true })
const saved = ref(false)

function toggle(list: string[], value: string) { const index = list.indexOf(value); index >= 0 ? list.splice(index, 1) : list.push(value) }
function toggleGender(value: string) { preferences.openToEveryone = false; toggle(preferences.genders, value); if (!preferences.genders.length) preferences.openToEveryone = true }
function selectEveryone() { preferences.openToEveryone = true; preferences.genders.splice(0) }
function toggleRaceEthnicity(value: string) { preferences.noRaceEthnicityPreference = false; toggle(preferences.raceEthnicities, value); if (!preferences.raceEthnicities.length) preferences.noRaceEthnicityPreference = true }
function selectNoRacePreference() { preferences.noRaceEthnicityPreference = true; preferences.raceEthnicities.splice(0) }
async function save() { await $fetch('/api/preferences/dating', { method: 'PUT', body: preferences }); saved.value = true; window.setTimeout(() => { saved.value = false }, 2200) }
onMounted(async () => { Object.assign(preferences, await $fetch('/api/preferences/dating')) })
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Match preferences</p>
      <h1 class="mt-2 text-4xl font-semibold">Who are you interested in meeting?</h1>
      <p class="mt-3 leading-6 text-[#6E4D58]">These optional choices shape who appears in your match pool. You can change or remove them at any time.</p>

      <form class="mt-8 space-y-5" @submit.prevent="save">
        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><Heart class="mt-1 size-5 text-[#B4234A]" /><div><h2 class="text-xl font-semibold">Sexual preference</h2><p class="mt-1 text-sm text-[#6E4D58]">Select the genders you are open to dating.</p></div></div>
          <div class="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" class="choice" :class="preferences.openToEveryone && 'choice-selected'" :aria-pressed="preferences.openToEveryone" @click="selectEveryone">Everyone</button>
            <button v-for="option in genderOptions" :key="option" type="button" class="choice" :class="preferences.genders.includes(option) && 'choice-selected'" :aria-pressed="preferences.genders.includes(option)" @click="toggleGender(option)">{{ option }}</button>
          </div>
        </section>

        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><UsersRound class="mt-1 size-5 text-[#B4234A]" /><div><h2 class="text-xl font-semibold">Racial and ethnic preferences</h2><p class="mt-1 text-sm text-[#6E4D58]">Optional. Choose communities you are interested in dating, or leave your match pool open.</p></div></div>
          <div class="mt-5 grid gap-2 sm:grid-cols-2">
            <button type="button" class="choice sm:col-span-2" :class="preferences.noRaceEthnicityPreference && 'choice-selected'" :aria-pressed="preferences.noRaceEthnicityPreference" @click="selectNoRacePreference">No racial or ethnic preference</button>
            <button v-for="option in raceEthnicityOptions" :key="option" type="button" class="choice" :class="preferences.raceEthnicities.includes(option) && 'choice-selected'" :aria-pressed="preferences.raceEthnicities.includes(option)" @click="toggleRaceEthnicity(option)">{{ option }}</button>
          </div>
          <div class="mt-5 flex gap-2 rounded-lg bg-[#F3E8DA] p-4 text-sm leading-6 text-[#4D2F39]"><Info class="mt-0.5 size-4 shrink-0" /><p>Identity is personal and nuanced. These broad options are only matching controls; they do not define how another person identifies.</p></div>
        </section>

        <div class="flex flex-wrap items-center gap-3"><button type="submit" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Save dating preferences</button><NuxtLink to="/preferences" class="px-3 py-2 text-sm font-semibold text-[#8F1839]">Back to match preferences</NuxtLink><span v-if="saved" class="text-sm font-semibold text-[#6E8B52]">Dating preferences saved.</span></div>
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
