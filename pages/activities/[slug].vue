<script setup lang="ts">
import { CalendarDays, HeartHandshake, MapPin, ShieldCheck, Sparkles, UsersRound } from '@lucide/vue'

const route = useRoute()

const activityNames: Record<string, string> = {
  'gallery-wander': 'Gallery wander', 'market-loop': 'Market loop', 'riverside-walk': 'Riverside walk',
  'live-music-set': 'Live music set', 'casual-food-crawl': 'Casual food crawl', 'weekend-pop-up': 'Weekend pop-up',
  'park-tennis-rally': 'Park tennis rally', 'cycle-and-stop': 'Cycle and stop', 'climbing-taster': 'Climbing taster',
  'co-op-game-session': 'Co-op game session', 'puzzle-room-online': 'Puzzle room online', 'watch-and-play-lobby': 'Watch-and-play lobby',
}

const slug = computed(() => String(route.params.slug || ''))
const activityName = computed(() => activityNames[slug.value] || 'This activity')
const activityExists = computed(() => Boolean(activityNames[slug.value]))

const people = [
  { name: 'Maya', age: 31, place: 'Shoreditch', distance: '2 km away', time: 'Thursday evenings', detail: 'Design books, Sunday markets, and finding small exhibitions.', reason: 'Strong activity overlap', tone: 'bg-[#FCE3E8]' },
  { name: 'Nina', age: 29, place: 'Hackney', distance: '3 km away', time: 'Weekend afternoons', detail: 'City walks, independent venues, and relaxed food spots.', reason: 'Matches your timing', tone: 'bg-[#EAF2DE]' },
  { name: 'Alex', age: 34, place: 'Bethnal Green', distance: '4 km away', time: 'Friday evenings', detail: 'Trying something new, good conversation, and low-key first plans.', reason: 'Matches your preferences', tone: 'bg-[#F3E8DA]' },
]

const visiblePeople = computed(() => {
  if (!activityExists.value) return []
  const offset = slug.value.length % people.length
  return [...people.slice(offset), ...people.slice(0, offset)]
})

useHead(() => ({ title: `${activityName.value} Matches · Lonely Radish` }))
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <div class="rounded-lg bg-[#2A1520] p-6 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)] sm:p-8">
        <Sparkles class="size-6 text-[#F7B7C4]" aria-hidden="true" />
        <p class="mt-5 text-xs font-extrabold uppercase tracking-widest text-[#F7B7C4]">Activity matches</p>
        <h1 class="mt-2 text-3xl font-semibold sm:text-4xl">People interested in {{ activityName }}</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-white/75">These people also chose this activity and fit your current age, distance, sexual, racial, and ethnic preferences.</p>
      </div>

      <div v-if="visiblePeople.length" class="mt-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="inline-flex items-center gap-2 text-sm font-semibold text-[#6E4D58]"><UsersRound class="size-4" />{{ visiblePeople.length }} compatible people</p>
          <NuxtLink to="/preferences" class="text-sm font-semibold text-[#8F1839] hover:underline">Review match preferences</NuxtLink>
        </div>

        <div class="mt-4 grid gap-4">
          <article v-for="person in visiblePeople" :key="person.name" class="rounded-lg p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] sm:p-6" :class="person.tone">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div class="flex min-w-0 gap-3 sm:gap-4">
                <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/75 text-lg font-semibold text-[#B4234A] sm:size-14 sm:text-xl">{{ person.name.charAt(0) }}</div>
                <div>
                  <h2 class="text-xl font-semibold">{{ person.name }}, {{ person.age }}</h2>
                  <p class="mt-1 inline-flex items-center gap-1 text-sm text-[#6E4D58]"><MapPin class="size-3.5" />{{ person.place }} · {{ person.distance }}</p>
                  <p class="mt-3 text-sm leading-6 text-[#4D2F39]">{{ person.detail }}</p>
                </div>
              </div>
              <div class="flex shrink-0 flex-wrap gap-2 text-xs font-semibold text-[#4D2F39] sm:max-w-52 sm:justify-end">
                <span class="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5"><CalendarDays class="size-3.5" />{{ person.time }}</span>
                <span class="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5"><ShieldCheck class="size-3.5" />{{ person.reason }}</span>
              </div>
            </div>
            <button type="button" class="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8F1839]"><HeartHandshake class="size-4" />Interested</button>
          </article>
        </div>
      </div>

      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
        <UsersRound class="mx-auto size-8 text-[#B4234A]" />
        <h2 class="mt-4 text-xl font-semibold">No activity matches found</h2>
        <p class="mt-2 text-sm text-[#6E4D58]">This activity may no longer be available. Browse the current activity list to find another plan.</p>
      </div>

      <NuxtLink to="/activities" class="mt-8 inline-flex rounded-lg bg-[#F3E8DA] px-5 py-3 text-sm font-semibold text-[#8F1839] hover:bg-[#FCE3E8]">← Browse all activities</NuxtLink>
    </section>
  </main>
</template>
