<script setup lang="ts">
import { Gamepad2, Sparkles, Trophy } from '@lucide/vue'

definePageMeta({ title: 'Activity Interests · Lonely Radish', middleware: 'logged-in' })

const groups = [
  { name: 'Culture', options: ['Gallery walks', 'Museums', 'Theatre', 'Indie films', 'Live music', 'Comedy nights'] },
  { name: 'Food and drink', options: ['Markets', 'Casual food spots', 'Cooking classes', 'Dessert crawl', 'Picnics', 'Supper clubs'] },
  { name: 'Outdoors', options: ['Riverside walks', 'Hikes', 'Parks', 'Cycling', 'Street photography', 'Botanical gardens'] },
  { name: 'Sports', options: ['Park tennis', 'Climbing', 'Running clubs', 'Table tennis', 'Casual football', 'Swimming'] },
  { name: 'Gaming', options: ['Co-op games', 'Puzzle rooms', 'Party games', 'Strategy games', 'Cosy games', 'Board games'] },
  { name: 'Learning', options: ['Workshops', 'Talks', 'Language exchange', 'Bookshops', 'Craft classes', 'Trivia nights'] },
]
type SelectedActivity = { name: string; category: string; custom: boolean }
const selected = ref<SelectedActivity[]>([])
const customInputs = reactive<Record<string, string>>(Object.fromEntries(groups.map(group => [group.name, ''])))
const saved = ref(false)
const selectionLimit = 10
const limitReached = computed(() => selected.value.length >= selectionLimit)

function isSelected(name: string) {
  return selected.value.some(activity => activity.name === name)
}
function toggle(name: string, category: string, custom = false) {
  const index = selected.value.findIndex(activity => activity.name === name)
  if (index >= 0) selected.value.splice(index, 1)
  else if (!limitReached.value) selected.value.push({ name, category, custom })
}

function customCount(category: string) {
  return selected.value.filter(activity => activity.custom && activity.category === category).length
}
function addCustom(category: string) {
  const name = customInputs[category].trim()
  const alreadySelected = selected.value.some(activity => activity.name.toLowerCase() === name.toLowerCase())
  if (name && !alreadySelected && !limitReached.value && customCount(category) < 3) selected.value.push({ name, category, custom: true })
  customInputs[category] = ''
}
async function save() { await $fetch('/api/preferences/activities', { method: 'PUT', body: { activities: selected.value } }); saved.value = true; window.setTimeout(() => { saved.value = false }, 2200) }
onMounted(async () => {
  const response = await $fetch<{ selected: SelectedActivity[] }>('/api/preferences/activities')
  selected.value = response.selected
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-4xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Match preferences</p>
      <h1 class="mt-2 text-4xl font-semibold">What would you like to do together?</h1>
      <p class="mt-3 max-w-2xl leading-6 text-[#6E4D58]">Choose up to {{ selectionLimit }} interests in total. You can add up to 3 of your own activities inside each category.</p>

      <form class="mt-8 space-y-5" @submit.prevent="save">
        <section v-for="group in groups" :key="group.name" class="rounded-lg bg-white p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
          <div class="flex items-center gap-2"><component :is="group.name === 'Sports' ? Trophy : group.name === 'Gaming' ? Gamepad2 : Sparkles" class="size-5 text-[#B4234A]" /><h2 class="text-lg font-semibold">{{ group.name }}</h2></div>
          <div class="mt-4 flex flex-wrap gap-2"><button v-for="activity in group.options" :key="activity" type="button" :aria-pressed="isSelected(activity)" :disabled="limitReached && !isSelected(activity)" class="rounded-full px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40" :class="isSelected(activity) ? 'bg-[#B4234A] text-white' : 'bg-[#FBF7F1] text-[#4D2F39] hover:bg-[#FCE3E8]'" @click="toggle(activity, group.name)">{{ activity }}</button></div>
          <div v-if="selected.some(activity => activity.custom && activity.category === group.name)" class="mt-4 flex flex-wrap gap-2"><button v-for="activity in selected.filter(activity => activity.custom && activity.category === group.name)" :key="activity.name" type="button" class="rounded-full bg-[#EAF2DE] px-3 py-2 text-sm font-semibold text-[#4D2F39]" :aria-label="`Remove custom activity ${activity.name}`" @click="toggle(activity.name, group.name, true)">{{ activity.name }} ×</button></div>
          <label class="mt-5 block text-sm font-semibold">Add your own {{ group.name.toLowerCase() }} activity <span class="font-normal text-[#6E4D58]">({{ customCount(group.name) }}/3)</span></label>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row"><input v-model="customInputs[group.name]" :disabled="limitReached || customCount(group.name) >= 3" class="min-w-0 flex-1 rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60" :placeholder="`Add something to ${group.name}`" @keydown.enter.prevent="addCustom(group.name)"><button type="button" :disabled="limitReached || customCount(group.name) >= 3 || !customInputs[group.name].trim()" class="min-h-11 rounded-lg bg-[#4D2F39] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" @click="addCustom(group.name)">Add</button></div>
          <p v-if="customCount(group.name) >= 3" class="mt-2 text-xs font-semibold text-[#8F1839]">You have added 3 custom activities in this category.</p>
        </section>

        <section v-if="selected.length" class="rounded-lg bg-[#FCE3E8] p-5"><h2 class="font-semibold">Your interests ({{ selected.length }}/{{ selectionLimit }})</h2><p v-if="limitReached" class="mt-1 text-sm font-semibold text-[#8F1839]">You have selected the maximum of {{ selectionLimit }} interests.</p><div class="mt-3 flex flex-wrap gap-2"><button v-for="activity in selected" :key="activity.name" type="button" class="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#8F1839]" :aria-label="`Remove ${activity.name}`" @click="toggle(activity.name, activity.category, activity.custom)">{{ activity.name }} ×</button></div></section>
        <div class="flex flex-wrap items-center gap-3"><button type="submit" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Save activity interests</button><NuxtLink to="/preferences" class="px-3 py-2 text-sm font-semibold text-[#8F1839]">Back to match preferences</NuxtLink><span v-if="saved" class="text-sm font-semibold text-[#6E8B52]">Activity interests saved.</span></div>
      </form>
    </section>
  </main>
</template>
