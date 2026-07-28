<script setup lang="ts">
import { MapPin, Sparkles, UsersRound } from '@lucide/vue'
import { discoveryCategory } from '~/utils/activityDiscovery'

definePageMeta({ middleware: 'logged-in' })

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const activityName = computed(() => discoveryCategory(slug.value)?.name || 'This category')
const activityExists = computed(() => Boolean(discoveryCategory(slug.value)))

const fallbackPeople = [
  { slug: 'maya', name: 'Maya', age: 31, place: 'London', matchedActivityTags: ['Gallery walks'], otherActivityTags: ['Markets', 'Live music'], tone: 'bg-[#FCE3E8]' },
  { slug: 'nina', name: 'Nina', age: 29, place: 'London', matchedActivityTags: ['Indie films'], otherActivityTags: ['City walks', 'Casual food spots'], tone: 'bg-[#EAF2DE]' },
  { slug: 'alex', name: 'Alex', age: 34, place: 'London', matchedActivityTags: ['Book markets'], otherActivityTags: ['Board games', 'Climbing'], tone: 'bg-[#F3E8DA]' },
]
const databasePeople = ref<any[]>([])
const candidatesLoaded = ref(false)
const candidatesError = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const loadingMore = ref(false)
const appliedFilters = ref<{ minimumAge: number; maximumAge: number; distance: number; genderLabel: string; orientationLabel: string; racialPreferencesApplied: boolean; searchLocation: string | null } | null>(null)

async function loadCandidates(loadMore = false) {
  if (loadMore) loadingMore.value = true
  candidatesError.value = ''
  try {
    const result = await $fetch<{ people: any[]; nextCursor: string | null; hasMore: boolean; filters: { minimumAge: number; maximumAge: number; distance: number; genderLabel: string; orientationLabel: string; racialPreferencesApplied: boolean; searchLocation: string | null } }>(`/api/activities/${slug.value}/people`, {
      query: loadMore && nextCursor.value ? { cursor: nextCursor.value } : undefined,
    })
    databasePeople.value = loadMore ? [...databasePeople.value, ...result.people] : result.people
    nextCursor.value = result.nextCursor
    hasMore.value = result.hasMore
    appliedFilters.value = result.filters
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

      <section v-if="appliedFilters" class="mt-5 rounded-lg border border-[#E8D8C4] bg-white p-4 shadow-[0_8px_20px_rgba(180,35,74,0.05)]" aria-label="Applied discovery filters">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-2 text-xs font-semibold text-[#4D2F39]">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-[#EAF2DE] px-3 py-2"><MapPin class="size-3.5" />{{ appliedFilters.searchLocation ? `Using ${appliedFilters.searchLocation}` : 'Location not set' }}</span>
            <span class="rounded-full bg-[#EAF2DE] px-3 py-2">Within {{ appliedFilters.distance }} km</span>
            <span class="rounded-full bg-[#F3E8DA] px-3 py-2">Ages {{ appliedFilters.minimumAge }}–{{ appliedFilters.maximumAge }}</span>
            <span class="rounded-full bg-[#FCE3E8] px-3 py-2">{{ appliedFilters.genderLabel }}</span>
            <span class="rounded-full bg-[#FCE3E8] px-3 py-2">{{ appliedFilters.orientationLabel }}</span>
            <span class="rounded-full bg-[#FFF1C7] px-3 py-2">{{ appliedFilters.racialPreferencesApplied ? 'Racial preferences applied' : 'No racial preference' }}</span>
          </div>
          <NuxtLink to="/preferences" class="shrink-0 text-sm font-semibold text-[#8F1839] hover:underline">Adjust filters</NuxtLink>
        </div>
      </section>

      <div v-if="!candidatesLoaded && !candidatesError" class="mt-8 rounded-lg bg-white p-8 text-center text-sm text-[#6E4D58]" aria-live="polite">Loading matching profiles…</div>

      <div v-else-if="visiblePeople.length" class="mt-8">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="inline-flex items-center gap-2 text-sm font-semibold text-[#6E4D58]"><UsersRound class="size-4" />{{ visiblePeople.length }} {{ visiblePeople.length === 1 ? 'person' : 'people' }}</p>
          <NuxtLink to="/preferences" class="text-sm font-semibold text-[#8F1839] hover:underline">Review match preferences</NuxtLink>
        </div>
        <div class="mt-4 grid gap-4">
          <NuxtLink v-for="(person, index) in visiblePeople" :key="person.slug" :to="`/profiles/${person.slug}`"
            class="group block rounded-lg p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(180,35,74,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4234A] sm:p-6"
            :class="person.tone || ['bg-[#FCE3E8]','bg-[#EAF2DE]','bg-[#F3E8DA]'][index % 3]"
            :aria-label="`View ${person.name}'s profile`">
            <div class="flex min-w-0 gap-4">
              <img v-if="person.photoUrl" :src="person.photoUrl" :alt="`${person.name}'s profile photo`" class="size-20 shrink-0 rounded-lg object-cover sm:size-24">
              <div v-else class="flex size-20 shrink-0 items-center justify-center rounded-lg bg-white/75 text-2xl font-semibold text-[#B4234A] sm:size-24 sm:text-3xl">{{ person.name.charAt(0) }}</div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2 class="text-xl font-semibold group-hover:text-[#8F1839]">{{ person.name }}, {{ person.age }}</h2>
                  <span class="hidden items-center gap-1 text-xs font-semibold text-[#6E4D58] sm:inline-flex"><MapPin class="size-3.5" />{{ person.place }}</span>
                </div>
                <p class="mt-1 inline-flex items-center gap-1 text-sm text-[#6E4D58] sm:hidden"><MapPin class="size-3.5" />{{ person.place }}</p>
                <div v-if="person.matchedActivityTags?.length" class="mt-3">
                  <p class="text-[10px] font-extrabold uppercase tracking-wider text-[#8F1839]">Interested in {{ activityName }}</p>
                  <div class="mt-1.5 flex flex-wrap gap-1.5"><span v-for="activity in person.matchedActivityTags" :key="`matched-${activity}`"
                    class="rounded-full bg-white/85 px-2.5 py-1.5 text-xs font-bold text-[#8F1839]">{{ activity }}</span></div>
                </div>
                <div v-if="person.otherActivityTags?.length" class="mt-3">
                  <p class="text-[10px] font-extrabold uppercase tracking-wider text-[#6E4D58]">Also interested in</p>
                  <div class="mt-1.5 flex flex-wrap gap-1.5"><span v-for="activity in person.otherActivityTags" :key="`other-${activity}`"
                    class="rounded-full border border-white/70 bg-white/45 px-2.5 py-1.5 text-xs font-semibold text-[#4D2F39]">{{ activity }}</span></div>
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
        <div v-if="hasMore" class="mt-6 text-center"><button type="button" :disabled="loadingMore" class="rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="loadCandidates(true)">{{ loadingMore ? 'Loading…' : 'Load more people' }}</button></div>
        <p v-if="candidatesError && databasePeople.length" class="mt-4 text-center text-sm font-semibold text-[#8F1839]" role="alert">{{ candidatesError }}</p>
      </div>

      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
        <UsersRound class="mx-auto size-8 text-[#B4234A]" />
        <h2 class="mt-4 text-xl font-semibold">No profiles match your filters yet</h2>
        <p class="mt-2 text-sm leading-6 text-[#6E4D58]">Try adjusting your distance, age or dating preferences, or check this category again later.</p>
        <NuxtLink to="/preferences" class="mt-5 inline-flex rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Adjust match preferences</NuxtLink>
      </div>

      <NuxtLink to="/activities" class="mt-8 inline-flex rounded-lg bg-[#F3E8DA] px-5 py-3 text-sm font-semibold text-[#8F1839] hover:bg-[#FCE3E8]">← Browse all categories</NuxtLink>
    </section>
  </main>
</template>
