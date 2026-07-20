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
const selected = ref<string[]>([])
const customActivity = ref('')
const saved = ref(false)
const selectionLimit = 10
const limitReached = computed(() => selected.value.length >= selectionLimit)

function toggle(name: string) {
  const index = selected.value.indexOf(name)
  if (index >= 0) selected.value.splice(index, 1)
  else if (!limitReached.value) selected.value.push(name)
}

function addCustom() {
  const name = customActivity.value.trim()
  const alreadySelected = selected.value.some(activity => activity.toLowerCase() === name.toLowerCase())
  if (name && !alreadySelected && !limitReached.value) selected.value.push(name)
  customActivity.value = ''
}
async function save() { await $fetch('/api/preferences/activities', { method: 'PUT', body: { activities: selected.value } }); saved.value = true; window.setTimeout(() => { saved.value = false }, 2200) }
onMounted(async () => {
  const response = await $fetch<{ selected: Array<{ name: string }> }>('/api/preferences/activities')
  selected.value = response.selected.map(item => item.name)
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-4xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Match preferences</p>
      <h1 class="mt-2 text-4xl font-semibold">What would you like to do together?</h1>
      <p class="mt-3 max-w-2xl leading-6 text-[#6E4D58]">Choose up to {{ selectionLimit }} interests in total, including activities you add yourself. Shared interests can help shape matches and make a first plan easier.</p>

      <form class="mt-8 space-y-5" @submit.prevent="save">
        <section class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <label class="text-sm font-semibold">Add your own activity</label>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row"><input v-model="customActivity" :disabled="limitReached" class="min-w-0 flex-1 rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60" placeholder="Karaoke, pottery, paddleboarding..." @keydown.enter.prevent="addCustom"><button type="button" :disabled="limitReached || !customActivity.trim()" class="min-h-11 rounded-lg bg-[#B4234A] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" @click="addCustom">Add</button></div>
          <p v-if="limitReached" class="mt-2 text-sm font-semibold text-[#8F1839]" role="status">You have selected the maximum of {{ selectionLimit }} interests. Remove one to add another.</p>
        </section>

        <section v-for="group in groups" :key="group.name" class="rounded-lg bg-white p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
          <div class="flex items-center gap-2"><component :is="group.name === 'Sports' ? Trophy : group.name === 'Gaming' ? Gamepad2 : Sparkles" class="size-5 text-[#B4234A]" /><h2 class="text-lg font-semibold">{{ group.name }}</h2></div>
          <div class="mt-4 flex flex-wrap gap-2"><button v-for="activity in group.options" :key="activity" type="button" :aria-pressed="selected.includes(activity)" :disabled="limitReached && !selected.includes(activity)" class="rounded-full px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40" :class="selected.includes(activity) ? 'bg-[#B4234A] text-white' : 'bg-[#FBF7F1] text-[#4D2F39] hover:bg-[#FCE3E8]'" @click="toggle(activity)">{{ activity }}</button></div>
        </section>

        <section v-if="selected.length" class="rounded-lg bg-[#FCE3E8] p-5"><h2 class="font-semibold">Your interests ({{ selected.length }}/{{ selectionLimit }})</h2><div class="mt-3 flex flex-wrap gap-2"><button v-for="activity in selected" :key="activity" type="button" class="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#8F1839]" :aria-label="`Remove ${activity}`" @click="toggle(activity)">{{ activity }} ×</button></div></section>
        <div class="flex flex-wrap items-center gap-3"><button type="submit" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Save activity interests</button><NuxtLink to="/preferences" class="px-3 py-2 text-sm font-semibold text-[#8F1839]">Back to match preferences</NuxtLink><span v-if="saved" class="text-sm font-semibold text-[#6E8B52]">Activity interests saved.</span></div>
      </form>
    </section>
  </main>
</template>
