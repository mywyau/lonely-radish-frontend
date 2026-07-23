<script setup lang="ts">
import { CalendarDays, HeartHandshake, MapPin, ShieldCheck, Sparkles, UsersRound } from '@lucide/vue'
import { discoveryCategory } from '~/utils/activityDiscovery'

definePageMeta({ middleware: 'logged-in' })

const route = useRoute()
const { todaysInterests, dailyInterestLimit, hasUsedDailyInterest, atMatchLimit, errorMessage, successMessage, sending, loadInterest, showInterest, isTodaysChoice } = useDailyInterest()

const slug = computed(() => String(route.params.slug || ''))
const activityName = computed(() => discoveryCategory(slug.value)?.name || 'This category')
const activityExists = computed(() => Boolean(discoveryCategory(slug.value)))

const fallbackPeople = [
  { slug: 'maya', name: 'Maya', age: 31, place: 'Shoreditch', distance: '2 km away', detail: 'Design books, Sunday markets, and finding small exhibitions.', activityTags: ['Markets', 'Gallery walks'], reason: 'Selected interests', tone: 'bg-[#FCE3E8]' },
  { slug: 'nina', name: 'Nina', age: 29, place: 'Hackney', distance: '3 km away', detail: 'City walks, independent venues, and relaxed food spots.', activityTags: ['Casual food spots', 'Markets'], reason: 'Selected interests', tone: 'bg-[#EAF2DE]' },
  { slug: 'alex', name: 'Alex', age: 34, place: 'Bethnal Green', distance: '4 km away', detail: 'Trying something new, good conversation, and low-key first plans.', activityTags: ['Board games', 'Climbing'], reason: 'Selected interests', tone: 'bg-[#F3E8DA]' },
]
const databasePeople = ref<any[]>([])
const candidatesLoaded = ref(false)
const candidatesError = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const loadingMore = ref(false)

async function loadCandidates(loadMore = false) {
  if (loadMore) loadingMore.value = true
  candidatesError.value = ''
  try {
    const result = await $fetch<{ people: any[]; nextCursor: string | null; hasMore: boolean }>(`/api/activities/${slug.value}/people`, {
      query: loadMore && nextCursor.value ? { cursor: nextCursor.value } : undefined,
    })
    databasePeople.value = loadMore ? [...databasePeople.value, ...result.people] : result.people
    nextCursor.value = result.nextCursor
    hasMore.value = result.hasMore
    candidatesLoaded.value = true
  } catch (error: any) { candidatesError.value = error?.data?.statusMessage || 'People could not be loaded.' }
  finally { loadingMore.value = false }
}

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
  await loadCandidates()
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <div class="rounded-lg bg-[#2A1520] p-6 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)] sm:p-8">
        <Sparkles class="size-6 text-[#F7B7C4]" aria-hidden="true" />
        <h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Meet people interested in {{ activityName.toLowerCase() }}.</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-white/75">People in this broader category may enjoy different specific activities. Open a profile to see what each person selected.</p>
      </div>

      <div v-if="visiblePeople.length" class="mt-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="inline-flex items-center gap-2 text-sm font-semibold text-[#6E4D58]"><UsersRound class="size-4" />{{ visiblePeople.length }} {{ visiblePeople.length === 1 ? 'person' : 'people' }}</p>
          <NuxtLink to="/preferences" class="text-sm font-semibold text-[#8F1839] hover:underline">Review match preferences</NuxtLink>
        </div>
        <DailyInterestCounter class="mt-4" :count="todaysInterests.length" :limit="dailyInterestLimit" />
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
                  <div v-if="person.activityTags?.length" class="mt-3 flex flex-wrap gap-1.5" :aria-label="`${person.name}'s selected interests in ${activityName}`"><span v-for="tag in person.activityTags" :key="tag" class="rounded-full bg-white/75 px-2.5 py-1 text-xs font-semibold text-[#8F1839]">{{ tag }}</span></div>
                </div>
              </div>
              <div class="flex shrink-0 flex-wrap gap-2 text-xs font-semibold text-[#4D2F39] sm:max-w-52 sm:justify-end">
                <span class="inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1.5"><ShieldCheck class="size-3.5" />{{ person.activityTags?.length }} selected</span>
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
        <div v-if="hasMore" class="mt-6 text-center"><button type="button" :disabled="loadingMore" class="rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="loadCandidates(true)">{{ loadingMore ? 'Loading…' : 'Load more people' }}</button></div>
        <p v-if="candidatesError && databasePeople.length" class="mt-4 text-center text-sm font-semibold text-[#8F1839]" role="alert">{{ candidatesError }}</p>
      </div>

      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
        <UsersRound class="mx-auto size-8 text-[#B4234A]" />
        <h2 class="mt-4 text-xl font-semibold">No one is browsing in this category yet</h2>
        <p class="mt-2 text-sm text-[#6E4D58]">No other active profiles have selected interests in this category yet.</p>
      </div>

      <NuxtLink to="/activities" class="mt-8 inline-flex rounded-lg bg-[#F3E8DA] px-5 py-3 text-sm font-semibold text-[#8F1839] hover:bg-[#FCE3E8]">← Browse all categories</NuxtLink>
    </section>
  </main>
</template>
