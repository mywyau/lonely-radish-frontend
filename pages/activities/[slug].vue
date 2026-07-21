<script setup lang="ts">
import { CalendarDays, HeartHandshake, MapPin, ShieldCheck, Sparkles, UsersRound } from '@lucide/vue'

definePageMeta({ middleware: 'logged-in' })

const route = useRoute()
const { todaysInterest, hasUsedDailyInterest, atMatchLimit, errorMessage, successMessage, sending, loadInterest, showInterest, isTodaysChoice } = useDailyInterest()

const activityNames: Record<string, string> = {
  'gallery-wander': 'Gallery wander', 'market-loop': 'Market loop', 'riverside-walk': 'Riverside walk',
  'live-music-set': 'Live music set', 'casual-food-crawl': 'Casual food crawl', 'weekend-pop-up': 'Weekend pop-up',
  'park-tennis-rally': 'Park tennis rally', 'cycle-and-stop': 'Cycle and stop', 'climbing-taster': 'Climbing taster',
  'co-op-game-session': 'Co-op game session', 'puzzle-room-online': 'Puzzle room online', 'watch-and-play-lobby': 'Watch-and-play lobby',
}

const slug = computed(() => String(route.params.slug || ''))
const activityName = computed(() => activityNames[slug.value] || 'This activity')
const activityExists = computed(() => Boolean(activityNames[slug.value]))

const fallbackPeople = [
  { slug: 'maya', name: 'Maya', age: 31, place: 'Shoreditch', distance: '2 km away', time: 'Thursday evenings', detail: 'Design books, Sunday markets, and finding small exhibitions.', reason: 'Strong activity overlap', tone: 'bg-[#FCE3E8]' },
  { slug: 'nina', name: 'Nina', age: 29, place: 'Hackney', distance: '3 km away', time: 'Weekend afternoons', detail: 'City walks, independent venues, and relaxed food spots.', reason: 'Matches your timing', tone: 'bg-[#EAF2DE]' },
  { slug: 'alex', name: 'Alex', age: 34, place: 'Bethnal Green', distance: '4 km away', time: 'Friday evenings', detail: 'Trying something new, good conversation, and low-key first plans.', reason: 'Matches your preferences', tone: 'bg-[#F3E8DA]' },
]
const databasePeople = ref<any[]>([])
const candidatesLoaded = ref(false)
const candidatesError = ref('')

const visiblePeople = computed(() => {
  if (!activityExists.value) return []
  if (candidatesLoaded.value) return databasePeople.value
  if (!import.meta.dev || !candidatesError.value) return []
  const offset = slug.value.length % fallbackPeople.length
  return [...fallbackPeople.slice(offset), ...fallbackPeople.slice(0, offset)]
})

useHead(() => ({ title: `${activityName.value} Matches · Lonely Radish` }))
onMounted(async () => {
  await loadInterest()
  try { databasePeople.value = (await $fetch<{ people: any[] }>(`/api/activities/${slug.value}/people`)).people }
  catch (error: any) { candidatesError.value = error?.data?.statusMessage || 'Potential dates could not be loaded.' }
  finally { candidatesLoaded.value = !candidatesError.value }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <div class="rounded-lg bg-[#2A1520] p-6 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)] sm:p-8">
        <Sparkles class="size-6 text-[#F7B7C4]" aria-hidden="true" />
        <p class="mt-5 text-xs font-extrabold uppercase tracking-widest text-[#F7B7C4]">Potential dates</p>
        <h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Who would enjoy a {{ activityName.toLowerCase() }}?</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-white/75">These people selected the same activity and are available to receive interest.</p>
      </div>

      <div v-if="visiblePeople.length" class="mt-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="inline-flex items-center gap-2 text-sm font-semibold text-[#6E4D58]"><UsersRound class="size-4" />{{ visiblePeople.length }} potential dates</p>
          <NuxtLink to="/preferences" class="text-sm font-semibold text-[#8F1839] hover:underline">Review match preferences</NuxtLink>
        </div>
        <p v-if="successMessage" class="mt-4 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#4D2F39]" role="status">{{ successMessage }} <NuxtLink to="/interests/sent" class="ml-1 text-[#8F1839] underline">View sent interests</NuxtLink></p>
        <p v-if="errorMessage" class="mt-4 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>

        <div class="mt-4 grid gap-4">
          <article v-for="(person, index) in visiblePeople" :key="person.slug" class="rounded-lg p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] sm:p-6" :class="person.tone || ['bg-[#FCE3E8]','bg-[#EAF2DE]','bg-[#F3E8DA]'][index % 3]">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div class="flex min-w-0 gap-3 sm:gap-4">
                <img v-if="person.photoUrl" :src="person.photoUrl" :alt="`${person.name}'s profile photo`" class="size-12 shrink-0 rounded-full object-cover sm:size-14">
                <div v-else class="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/75 text-lg font-semibold text-[#B4234A] sm:size-14 sm:text-xl">{{ person.name.charAt(0) }}</div>
                <div>
                  <h2 class="text-xl font-semibold">{{ person.name }}, {{ person.age }}</h2>
                  <p class="mt-1 inline-flex items-center gap-1 text-sm text-[#6E4D58]"><MapPin class="size-3.5" />{{ [person.place, person.distance].filter(Boolean).join(' · ') }}</p>
                  <p class="mt-3 text-sm leading-6 text-[#4D2F39]">{{ person.detail }}</p>
                </div>
              </div>
              <div class="flex shrink-0 flex-wrap gap-2 text-xs font-semibold text-[#4D2F39] sm:max-w-52 sm:justify-end">
                <span class="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5"><CalendarDays class="size-3.5" />{{ person.time }}</span>
                <span class="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5"><ShieldCheck class="size-3.5" />{{ person.reason }}</span>
              </div>
            </div>
            <div class="mt-5 flex flex-wrap gap-2">
              <NuxtLink :to="`/profiles/${person.slug}`" class="inline-flex items-center rounded-lg bg-white/75 px-4 py-2.5 text-sm font-semibold text-[#8F1839] transition hover:bg-white">View profile</NuxtLink>
              <button type="button" :disabled="sending || person.interestSent || atMatchLimit || hasUsedDailyInterest" class="inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8F1839] disabled:cursor-not-allowed disabled:bg-[#D7A7B3]" @click="showInterest(person.slug, person.name)"><HeartHandshake class="size-4" />{{ sending ? 'Sending…' : person.interestSent ? 'Interest already sent' : atMatchLimit ? '5-match limit reached' : isTodaysChoice(person.slug) ? 'Interest sent' : 'Show interest' }}</button>
            </div>
            <p v-if="person.interestSent" class="mt-3 text-xs leading-5 text-[#4D2F39]" role="status">You have already shown interest in {{ person.name }}. You can review it under Sent interests.</p>
            <p v-else-if="atMatchLimit" class="mt-3 text-xs leading-5 text-[#694C00]" role="status">You already have five active matches. Complete or remove one before matching with someone new.</p>
            <p v-else-if="hasUsedDailyInterest" class="mt-3 text-xs leading-5 text-[#6E4D58]" role="status"><template v-if="isTodaysChoice(person.slug)">You sent interest to {{ person.name }} today.</template><template v-else>You have sent your 5 interests for today.</template> You can send more tomorrow.</p>
          </article>
        </div>
      </div>

      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
        <UsersRound class="mx-auto size-8 text-[#B4234A]" />
        <h2 class="mt-4 text-xl font-semibold">No one is interested in this activity yet</h2>
        <p class="mt-2 text-sm text-[#6E4D58]">No other active profiles have selected this activity yet.</p>
      </div>

      <NuxtLink to="/activities" class="mt-8 inline-flex rounded-lg bg-[#F3E8DA] px-5 py-3 text-sm font-semibold text-[#8F1839] hover:bg-[#FCE3E8]">← Browse all activities</NuxtLink>
    </section>
  </main>
</template>
