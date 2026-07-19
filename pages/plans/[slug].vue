<script setup lang="ts">
import { CalendarDays, Check, MapPin, MessageCircle, ShieldCheck, Sparkles } from '@lucide/vue'

const route = useRoute()
const names: Record<string, string> = { maya: 'Maya', nina: 'Nina', alex: 'Alex' }
const activityLabels: Record<string, string> = { 'gallery-wander': 'Gallery wander', 'indie-film': 'Indie film', 'climbing-taster': 'Climbing taster' }
const personName = computed(() => names[String(route.params.slug)] || 'Your match')
const initialActivity = computed(() => activityLabels[String(route.query.activity)] || ({ maya: 'Gallery wander', nina: 'Indie film', alex: 'Climbing taster' }[String(route.params.slug)] || 'Gallery wander'))
const activity = ref(initialActivity.value)
const selectedTimes = ref<string[]>([])
const venue = ref('')
const confirmed = ref(false)
const logistics = ref<string[]>([])
const activities = ['Gallery wander', 'Market loop', 'Indie film', 'Climbing taster']
const times = ['Thursday · 6:30pm', 'Saturday · 2:00pm', 'Sunday · 3:30pm']
const venues = ['Whitechapel Gallery', 'Barbican Centre', 'A public venue in Shoreditch']
const quickMessages = ['That works for me', 'Could we meet earlier?', 'I’d prefer somewhere busier', 'I need to reschedule']

function toggleTime(time: string) { const index = selectedTimes.value.indexOf(time); index >= 0 ? selectedTimes.value.splice(index, 1) : selectedTimes.value.length < 3 && selectedTimes.value.push(time) }
function sendQuickMessage(message: string) { if (!logistics.value.includes(message)) logistics.value.push(message) }
useHead(() => ({ title: `Plan a Date with ${personName.value} · Lonely Radish` }))
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-8 text-[#2A1520] sm:px-8 sm:py-10">
    <section class="mx-auto max-w-4xl">
      <div class="rounded-lg bg-[#2A1520] p-6 text-white sm:p-8"><p class="text-xs font-extrabold uppercase tracking-widest text-[#F7B7C4]">Planning room</p><h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Plan a date with {{ personName }}</h1><p class="mt-3 text-sm leading-6 text-white/75">Agree the essentials here. Save the real conversation for when you meet.</p></div>

      <div class="mt-5 grid gap-5">
        <section class="plan-card"><div class="flex items-center gap-2"><Sparkles class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">1. Choose the date idea</h2></div><div class="mt-4 grid gap-2 sm:grid-cols-2"><button v-for="option in activities" :key="option" type="button" class="choice" :class="activity === option && 'choice-selected'" @click="activity = option">{{ option }}</button></div></section>
        <section class="plan-card"><div class="flex items-center gap-2"><CalendarDays class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">2. Suggest up to three times</h2></div><div class="mt-4 grid gap-2 sm:grid-cols-3"><button v-for="time in times" :key="time" type="button" class="choice" :class="selectedTimes.includes(time) && 'choice-selected'" @click="toggleTime(time)">{{ time }}</button></div></section>
        <section class="plan-card"><div class="flex items-center gap-2"><MapPin class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">3. Pick a public venue</h2></div><div class="mt-4 grid gap-2"><button v-for="option in venues" :key="option" type="button" class="choice" :class="venue === option && 'choice-selected'" @click="venue = option">{{ option }}</button></div><p class="mt-4 flex gap-2 text-xs leading-5 text-[#6E4D58]"><ShieldCheck class="mt-0.5 size-3.5 shrink-0" />Only public venues are suggested for a first date.</p></section>

        <section class="plan-card"><div class="flex items-center gap-2"><MessageCircle class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">Keep logistics simple</h2></div><p class="mt-2 text-sm text-[#6E4D58]">Use a quick note only when it helps organise the date.</p><div class="mt-4 flex flex-wrap gap-2"><button v-for="message in quickMessages" :key="message" type="button" class="rounded-full bg-[#F3E8DA] px-3 py-2 text-sm font-semibold text-[#4D2F39]" @click="sendQuickMessage(message)">{{ message }}</button></div><div v-if="logistics.length" class="mt-4 space-y-2"><p v-for="message in logistics" :key="message" class="ml-auto max-w-sm rounded-lg bg-[#FCE3E8] px-4 py-3 text-sm">{{ message }}</p></div></section>
        <section class="rounded-lg bg-[#EAF2DE] p-5 sm:p-6"><h2 class="text-xl font-semibold">Your proposed date</h2><dl class="mt-4 grid gap-3 text-sm"><div><dt class="text-[#6E4D58]">Idea</dt><dd class="font-semibold">{{ activity || 'Choose an idea' }}</dd></div><div><dt class="text-[#6E4D58]">Times</dt><dd class="font-semibold">{{ selectedTimes.join(' · ') || 'Choose at least one time' }}</dd></div><div><dt class="text-[#6E4D58]">Venue</dt><dd class="font-semibold">{{ venue || 'Choose a venue' }}</dd></div></dl><button type="button" class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto" :disabled="!activity || !selectedTimes.length || !venue" @click="confirmed = true"><Check class="size-4" />{{ confirmed ? 'Proposal sent' : `Send proposal to ${personName}` }}</button></section>

      </div>
    </section>
  </main>
</template>

<style scoped>
.plan-card { border-radius: .5rem; background: white; padding: 1.25rem; box-shadow: 0 10px 24px rgba(180,35,74,.08); }
.choice { border-radius: .5rem; background: #FBF7F1; padding: .8rem 1rem; text-align: left; font-size: .875rem; font-weight: 600; }
.choice-selected { background: #B4234A; color: white; }
@media (min-width: 640px) { .plan-card { padding: 1.5rem; } }
</style>
