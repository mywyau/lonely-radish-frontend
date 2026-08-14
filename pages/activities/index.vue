<script setup lang="ts">
import { BookOpen, Compass, Gamepad2, HandHeart, HeartPulse, Leaf, MapPin, MoonStar, Palette, PencilLine, SlidersHorizontal, Sparkles, Trophy, UsersRound, Utensils, X } from '@lucide/vue'
import { trackProductEvent } from '~/utils/productAnalytics'

definePageMeta({ title: 'Discover by activity · Lonely Radish', middleware: 'logged-in' })

const route = useRoute()
const router = useRouter()
const reportReference = ref('')
const databasePeople = ref<any[]>([])
const candidatesLoaded = ref(false)
const candidatesError = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const loadingMore = ref(false)
let candidateRequest = 0
const effectiveCategories = ref<string[]>([])
const appliedFilters = ref<{ minimumAge: number; maximumAge: number; distance: number; genderLabel: string; orientationLabel: string; racialPreferencesApplied: boolean; searchLocation: string | null } | null>(null)

const categories = [
  { slug: 'food-drink', name: 'Food & drink', icon: Utensils, tone: 'bg-[#F3E8DA]' },
  { slug: 'your-ideas', name: 'Your ideas', icon: PencilLine, tone: 'bg-[#FFF1C7]' },
  { slug: 'culture', name: 'Culture', icon: Palette, tone: 'bg-[#FCE3E8]' },
  { slug: 'sports', name: 'Sports', icon: Trophy, tone: 'bg-[#EAF2DE]' },
  { slug: 'outdoors', name: 'Outdoors', icon: Leaf, tone: 'bg-[#EAF2DE]' },
  { slug: 'games', name: 'Games', icon: Gamepad2, tone: 'bg-[#F7D4DC]' },
  { slug: 'learn-create', name: 'Learn & create', icon: BookOpen, tone: 'bg-[#F3E8DA]' },
  { slug: 'wellness', name: 'Wellness', icon: HeartPulse, tone: 'bg-[#E8F1ED]' },
  { slug: 'nightlife', name: 'Nightlife', icon: MoonStar, tone: 'bg-[#E8E4F4]' },
  { slug: 'explore', name: 'Explore', icon: Compass, tone: 'bg-[#FFF1C7]' },
  { slug: 'community', name: 'Community', icon: HandHeart, tone: 'bg-[#EAF2DE]' },
]
const categorySlugs = new Set(categories.map(category => category.slug))
const selectedCategories = computed(() => {
  const value = route.query.categories
  const raw = (Array.isArray(value) ? value : [value]).flatMap(item => typeof item === 'string' ? item.split(',') : [])
  return [...new Set(raw.filter(slug => categorySlugs.has(slug)))]
})
const selectedCategoryNames = computed(() => selectedCategories.value
  .map(slug => categories.find(category => category.slug === slug)?.name).filter(Boolean))
const effectiveCategoryNames = computed(() => effectiveCategories.value
  .map(slug => categories.find(category => category.slug === slug)?.name).filter(Boolean))
const safetyMessage = computed(() => {
  if (route.query.safety === 'blocked') return 'That person has been blocked. You will no longer see each other.'
  if (route.query.safety === 'reported-blocked') return 'Your report was submitted and the person was blocked immediately.'
  if (route.query.safety === 'reported') return 'Your report was submitted to the moderation team.'
  return ''
})

async function updateCategorySelection(next: string[]) {
  await router.replace({ query: { ...route.query, categories: next.length ? next.join(',') : undefined } })
}
function toggleCategory(slug: string) {
  const next = selectedCategories.value.includes(slug)
    ? selectedCategories.value.filter(value => value !== slug)
    : [...selectedCategories.value, slug]
  return updateCategorySelection(next)
}
function clearCategories() {
  return updateCategorySelection([])
}

async function loadCandidates(loadMore = false) {
  const request = ++candidateRequest
  if (loadMore) loadingMore.value = true
  else { candidatesLoaded.value = false; databasePeople.value = [] }
  candidatesError.value = ''
  try {
    const result = await $fetch<{ people: any[]; nextCursor: string | null; hasMore: boolean; effectiveCategories: string[]; filters: { minimumAge: number; maximumAge: number; distance: number; genderLabel: string; orientationLabel: string; racialPreferencesApplied: boolean; searchLocation: string | null } }>('/api/activities/people', {
      query: {
        ...(selectedCategories.value.length && { categories: selectedCategories.value.join(',') }),
        ...(loadMore && nextCursor.value && { cursor: nextCursor.value }),
      },
    })
    if (request !== candidateRequest) return
    databasePeople.value = loadMore ? [...databasePeople.value, ...result.people] : result.people
    nextCursor.value = result.nextCursor
    hasMore.value = result.hasMore
    effectiveCategories.value = result.effectiveCategories
    appliedFilters.value = result.filters
    candidatesLoaded.value = true
    if (!loadMore) trackProductEvent('Discovery Loaded', {
      categoryCount: selectedCategories.value.length, resultCount: result.people.length,
    })
  } catch (error: any) {
    if (request !== candidateRequest) return
    candidatesError.value = error?.data?.statusMessage || 'People could not be loaded.'
    if (!loadMore) trackProductEvent('Discovery Failed', { categoryCount: selectedCategories.value.length })
  } finally { if (request === candidateRequest) loadingMore.value = false }
}

watch(() => route.query.categories, () => { void loadCandidates() })
onMounted(() => {
  if (safetyMessage.value && String(route.query.safety).startsWith('reported')) {
    reportReference.value = window.sessionStorage.getItem('lonely-radish-latest-report-reference') || ''
    window.sessionStorage.removeItem('lonely-radish-latest-report-reference')
  }
  void loadCandidates()
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <div v-if="safetyMessage" class="mb-7 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#4D2F39]" role="status">
        <p>{{ safetyMessage }}</p>
        <p v-if="reportReference" class="mt-1 break-all text-xs font-medium text-[#6E4D58]">Report reference: {{ reportReference }}</p>
      </div>

      <div class="rounded-lg bg-[#2A1520] p-6 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)] sm:p-8">
        <Sparkles class="size-6 text-[#F7B7C4]" />
        <h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Who would you enjoy meeting?</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-white/75">Everyone appears once, even when they enjoy several kinds of activity. Choose any filters that sound good, or start with recommendations based on your saved activities.</p>
      </div>

      <section class="mt-6 rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]" aria-labelledby="activity-filter-title">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div><div class="flex items-center gap-2"><SlidersHorizontal class="size-5 text-[#B4234A]" /><h2 id="activity-filter-title" class="text-lg font-semibold">Activity filters</h2></div><p class="mt-1 text-sm leading-6 text-[#6E4D58]">Choose one or more broad categories. With no manual filters, we use the categories from activities saved to your profile.</p></div>
          <button v-if="selectedCategories.length" type="button" class="inline-flex items-center gap-1 text-sm font-semibold text-[#8F1839]" @click="clearCategories"><X class="size-4" />Clear</button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          <button type="button" class="filter-chip" :class="!selectedCategories.length && 'filter-chip-selected'" :aria-pressed="!selectedCategories.length" @click="clearCategories"><Sparkles class="size-4" />Based on my activities</button>
          <button v-for="category in categories" :key="category.slug" type="button" class="filter-chip" :class="selectedCategories.includes(category.slug) && 'filter-chip-selected'" :aria-pressed="selectedCategories.includes(category.slug)" @click="toggleCategory(category.slug)"><component :is="category.icon" class="size-4" />{{ category.name }}</button>
        </div>
        <p class="mt-4 text-xs font-semibold text-[#6E4D58]">{{ selectedCategoryNames.length ? `Showing ${selectedCategoryNames.join(' or ')}` : effectiveCategoryNames.length ? `Using your saved activity categories: ${effectiveCategoryNames.join(', ')}` : 'No saved activities yet — using all activity categories' }}</p>
      </section>

      <section v-if="appliedFilters" class="mt-5 rounded-lg border border-[#E8D8C4] bg-white/75 p-4" aria-label="Applied match preferences">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-2 text-xs font-semibold text-[#4D2F39]">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-[#EAF2DE] px-3 py-2"><MapPin class="size-3.5" />{{ appliedFilters.searchLocation ? `Using ${appliedFilters.searchLocation}` : 'Location not set' }}</span>
            <span class="rounded-full bg-[#EAF2DE] px-3 py-2">Within {{ appliedFilters.distance }} km</span>
            <span class="rounded-full bg-[#F3E8DA] px-3 py-2">Ages {{ appliedFilters.minimumAge }}–{{ appliedFilters.maximumAge }}</span>
            <span class="rounded-full bg-[#FCE3E8] px-3 py-2">{{ appliedFilters.genderLabel }}</span>
            <span class="rounded-full bg-[#FCE3E8] px-3 py-2">{{ appliedFilters.orientationLabel }}</span>
            <span class="rounded-full bg-[#FFF1C7] px-3 py-2">{{ appliedFilters.racialPreferencesApplied ? 'Ethnicity filter active' : 'All ethnicities' }}</span>
          </div>
          <NuxtLink to="/preferences" class="shrink-0 text-sm font-semibold text-[#8F1839] hover:underline">Fine-tune matches</NuxtLink>
        </div>
      </section>

      <div v-if="!candidatesLoaded && !candidatesError" class="mt-8 rounded-lg bg-white p-8 text-center text-sm text-[#6E4D58]" aria-live="polite">Finding people with ideas in common…</div>
      <section v-else-if="candidatesError && !databasePeople.length" class="mt-8 rounded-lg bg-white p-8 text-center shadow-[0_10px_24px_rgba(180,35,74,0.08)]" role="alert">
        <UsersRound class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-4 text-xl font-semibold">We couldn’t load anyone just now</h2><p class="mt-2 text-sm leading-6 text-[#6E4D58]">{{ candidatesError }} Try again in a moment.</p><button type="button" class="mt-5 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white" @click="loadCandidates()">Try again</button>
      </section>

      <div v-else-if="databasePeople.length" class="mt-8">
        <p class="inline-flex items-center gap-2 text-sm font-semibold text-[#6E4D58]"><UsersRound class="size-4" />{{ databasePeople.length }} {{ databasePeople.length === 1 ? 'person' : 'people' }}</p>
        <div class="mt-4 grid gap-4">
          <NuxtLink v-for="(person, index) in databasePeople" :key="person.slug" :to="`/profiles/${person.slug}`" class="group block rounded-lg p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(180,35,74,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4234A] sm:p-6" :class="['bg-[#FCE3E8]','bg-[#EAF2DE]','bg-[#F3E8DA]'][index % 3]" :aria-label="`View ${person.name}'s profile`">
            <div class="flex min-w-0 gap-4">
              <ProfilePhotoImage v-if="person.photoUrl" :src="person.photoUrl" :alt="`${person.name}'s profile photo`" class="size-20 shrink-0 rounded-lg sm:size-24" />
              <div v-else class="flex size-20 shrink-0 items-center justify-center rounded-lg bg-white/75 text-2xl font-semibold text-[#B4234A] sm:size-24">{{ person.name.charAt(0) }}</div>
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-baseline justify-between gap-2"><h2 class="text-xl font-semibold group-hover:text-[#8F1839]">{{ person.name }}, {{ person.age }}</h2><div class="flex flex-wrap justify-end gap-1.5"><span v-if="person.sharedCount" class="rounded-full bg-white/80 px-2.5 py-1 text-xs font-bold text-[#52713A]">{{ person.sharedCount }} shared</span><span v-if="person.acceptingInterest === false" class="rounded-full bg-[#FFF1C7] px-2.5 py-1 text-xs font-bold text-[#694C00]">Considering other interests</span></div></div>
                <p class="mt-1 inline-flex items-center gap-1 text-sm text-[#6E4D58]"><MapPin class="size-3.5" />{{ person.place }}</p>
                <div v-if="person.sharedActivityTags?.length" class="mt-3"><p class="text-[10px] font-extrabold uppercase tracking-wider text-[#52713A]">You both enjoy</p><div class="mt-1.5 flex flex-wrap gap-1.5"><span v-for="activity in person.sharedActivityTags" :key="`shared-${activity}`" class="rounded-full bg-white/90 px-2.5 py-1.5 text-xs font-bold text-[#52713A]">{{ activity }}</span></div></div>
                <div v-if="person.matchedActivityTags?.length" class="mt-3"><p class="text-[10px] font-extrabold uppercase tracking-wider text-[#8F1839]">Matches your activity filters</p><div class="mt-1.5 flex flex-wrap gap-1.5"><span v-for="activity in person.matchedActivityTags" :key="`matched-${activity}`" class="rounded-full bg-white/85 px-2.5 py-1.5 text-xs font-bold text-[#8F1839]">{{ activity }}</span></div></div>
              </div>
            </div>
          </NuxtLink>
        </div>
        <div v-if="hasMore" class="mt-6 text-center"><button type="button" :disabled="loadingMore" class="rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="loadCandidates(true)">{{ loadingMore ? 'Loading…' : 'Load more people' }}</button></div>
        <p v-if="candidatesError && databasePeople.length" class="mt-4 text-center text-sm font-semibold text-[#8F1839]" role="alert">{{ candidatesError }}</p>
      </div>

      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
        <UsersRound class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-4 text-xl font-semibold">Nobody here fits these filters yet</h2><p class="mt-2 text-sm leading-6 text-[#6E4D58]">Try another activity, clear the activity filters or fine-tune your match preferences.</p><div class="mt-5 flex flex-wrap justify-center gap-2"><button v-if="selectedCategories.length" type="button" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white" @click="clearCategories">Clear activity filters</button><NuxtLink to="/preferences" class="rounded-lg bg-[#F3E8DA] px-5 py-3 text-sm font-semibold text-[#8F1839]">Match preferences</NuxtLink></div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.filter-chip { display: inline-flex; align-items: center; gap: .4rem; border: 1px solid #E8D8C4; border-radius: 999px; background: #FBF7F1; padding: .65rem .9rem; color: #4D2F39; font-size: .8rem; font-weight: 700; transition: background-color .15s, border-color .15s, color .15s; }
.filter-chip:hover { border-color: #D7A7B3; background: #FCE3E8; }
.filter-chip-selected { border-color: #B4234A; background: #B4234A; color: white; }
.filter-chip-selected:hover { background: #8F1839; color: white; }
</style>
