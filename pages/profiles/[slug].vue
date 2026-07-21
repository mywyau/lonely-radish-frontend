<script setup lang="ts">
import { CalendarDays, HeartHandshake, MapPin, ShieldCheck, Sparkles, UserRound } from '@lucide/vue'

definePageMeta({ middleware: 'logged-in' })

const route = useRoute()
const { todaysInterests, dailyInterestLimit, hasUsedDailyInterest, atMatchLimit, errorMessage, successMessage, sending, loadInterest, showInterest, isTodaysChoice } = useDailyInterest()

const profiles = {
  maya: {
    name: 'Maya', age: 31, pronouns: 'she/her', place: 'Shoreditch', distance: '2 km away',
    bio: 'I’m a book designer who is happiest wandering around a small exhibition, finding the best thing at a Sunday market, or catching a low-key gig. I’m looking for someone kind and curious who is up for making an actual plan.',
    activities: ['Gallery walks', 'Sunday markets', 'Live music', 'Bookshops', 'Riverside walks'],
    interests: ['Design', 'Independent magazines', 'Cooking', 'City history'],
    availability: ['Thursday evenings', 'Weekend afternoons'],
    photos: ['/images/maya-profile-triptych.png', '/images/maya-profile-triptych-2.png'],
    matchReason: 'Maya fits your current match preferences and also wants to make a gallery plan.',
  },
  nina: {
    name: 'Nina', age: 29, pronouns: 'she/her', place: 'Hackney', distance: '3 km away',
    isMatched: true,
    bio: 'I work in community radio and spend a lot of my free time looking for films, food, and corners of London I have not seen before. I appreciate thoughtful people, silly observations, and plans that leave room for a spontaneous second stop.',
    activities: ['Indie films', 'City walks', 'Casual food spots', 'Comedy nights', 'Markets'],
    interests: ['Community radio', 'Photography', 'Podcasts', 'Trying new recipes'],
    availability: ['Wednesday evenings', 'Weekend afternoons'],
    photos: ['/images/nina-profile-triptych.png', '/images/nina-profile-triptych-2.png'],
    matchReason: 'Nina fits your current match preferences and shares your availability for relaxed weekend plans.',
  },
  alex: {
    name: 'Alex', age: 34, pronouns: 'they/them', place: 'Bethnal Green', distance: '4 km away',
    bio: 'I’m a product researcher, enthusiastic beginner climber, and collector of second-hand books I absolutely intend to read. I like people who are curious, direct, and happy to alternate active plans with a quiet wander and a good snack.',
    activities: ['Climbing', 'Book markets', 'Riverside walks', 'Board games', 'Cooking classes'],
    interests: ['Architecture', 'Science fiction', 'Ceramics', 'Neighbourhood history'],
    availability: ['Friday evenings', 'Sunday mornings'],
    photos: ['/images/alex-profile-triptych.png', '/images/alex-profile-triptych-2.png'],
    matchReason: 'Alex fits your current match preferences and is open to the same active, low-pressure plans.',
  },
}

const databaseProfile = ref<any>(null)
const profileLoaded = ref(false)
const profileLoadError = ref('')
const profile = computed(() => databaseProfile.value || profiles[route.params.slug as keyof typeof profiles])
const profileSlug = computed(() => String(route.params.slug))
const galleryPhotos = computed(() => profile.value?.photos.flatMap((photo: string | { src: string; alt?: string }, triptychIndex: number) => {
  if (typeof photo !== 'string') return [{ ...photo, panel: null }]
  return ['first', 'second', 'third'].map((panel, panelIndex) => ({ src: photo, panel,
    alt: `${profile.value.name} profile photo ${triptychIndex * 3 + panelIndex + 1}` }))
}).slice(0, 6) ?? [])

onMounted(async () => {
  await loadInterest()
  try {
    databaseProfile.value = await $fetch(`/api/profiles/${profileSlug.value}`)
  } catch (error: any) {
    databaseProfile.value = null
    const status = error?.statusCode || error?.response?.status || error?.data?.statusCode
    if (status !== 404) profileLoadError.value = 'We could not load this profile. Please try again.'
  } finally {
    profileLoaded.value = true
  }
})
useHead(() => ({ title: profile.value ? `${profile.value.name}'s Profile · Lonely Radish` : !profileLoaded.value ? 'Loading Profile · Lonely Radish' : 'Profile Not Found · Lonely Radish' }))
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-8 text-[#2A1520] sm:px-8 sm:py-10">
    <section v-if="!profile && !profileLoaded" class="mx-auto max-w-5xl" aria-busy="true" aria-live="polite">
      <span class="sr-only">Loading profile</span>
      <div class="grid animate-pulse gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div class="aspect-square rounded-lg bg-[#EADFD5]"></div>
        <div class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="h-9 w-2/3 rounded bg-[#EADFD5]"></div>
          <div class="mt-3 h-4 w-1/3 rounded bg-[#F3E8DA]"></div>
          <div class="mt-8 h-24 rounded-lg bg-[#F3E8DA]"></div>
          <div class="mt-5 h-12 rounded-lg bg-[#E7BCC6]"></div>
        </div>
      </div>
    </section>

    <section v-else-if="profile" class="mx-auto max-w-5xl">
      <div class="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <section aria-label="Profile photos" class="grid grid-cols-2 gap-2 overflow-hidden rounded-lg sm:grid-cols-3">
          <div v-for="(photo, index) in galleryPhotos" :key="`${photo.src}-${photo.panel}`" class="profile-photo aspect-square" :class="index === 0 && 'col-span-2 row-span-2'">
            <img :src="photo.src" :alt="photo.alt || `${profile.name} profile photo`" :class="photo.panel ? ['triptych', `triptych-${photo.panel}`] : 'h-full w-full object-cover'">
          </div>
        </section>

        <aside class="rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-6 lg:sticky lg:top-24">
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1"><h1 class="text-3xl font-semibold">{{ profile.name }}, {{ profile.age }}</h1><span class="text-sm text-[#6E4D58]">{{ profile.pronouns }}</span></div>
          <p v-if="profile.place || profile.distance" class="mt-2 inline-flex items-center gap-1 text-sm text-[#6E4D58]"><MapPin class="size-4" /><span>{{ [profile.place, profile.distance].filter(Boolean).join(' · ') }}</span></p>
          <div v-if="profile.matchReason" class="mt-5 rounded-lg bg-[#EAF2DE] p-4"><p class="inline-flex items-center gap-2 text-sm font-semibold"><Sparkles class="size-4 text-[#6E8B52]" />Strong activity overlap</p><p class="mt-1 text-xs leading-5 text-[#4D2F39]">{{ profile.matchReason }}</p></div>
          <DailyInterestCounter class="mt-5" :count="todaysInterests.length" :limit="dailyInterestLimit" />
          <button type="button" :disabled="sending || profile.isMatched || profile.interestSent || atMatchLimit || hasUsedDailyInterest" class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8F1839] disabled:cursor-not-allowed disabled:bg-[#D7A7B3]" @click="showInterest(profileSlug, profile.name)"><HeartHandshake class="size-4" />{{ sending ? 'Sending…' : profile.isMatched ? `Already matched with ${profile.name}` : profile.interestSent ? 'Interest already sent' : atMatchLimit ? '5-match limit reached' : isTodaysChoice(profileSlug) ? `Interest sent to ${profile.name}` : 'Show interest' }}</button>
          <p v-if="profile.isMatched" class="mt-3 rounded-lg bg-[#EAF2DE] p-3 text-xs leading-5 text-[#4D2F39]" role="status">You and {{ profile.name }} have already matched. You can continue from Matches & plans.</p>
          <p v-else-if="profile.interestSent" class="mt-3 rounded-lg bg-[#F3E8DA] p-3 text-xs leading-5 text-[#4D2F39]" role="status">You have already shown interest in {{ profile.name }}. You cannot send it again.</p>
          <p v-else-if="atMatchLimit" class="mt-3 rounded-lg bg-[#FFF1C7] p-3 text-xs leading-5 text-[#694C00]" role="status">You already have five active matches. Complete or remove one before matching with someone new.</p>
          <p v-else-if="hasUsedDailyInterest" class="mt-3 rounded-lg bg-[#FCE3E8] p-3 text-xs leading-5 text-[#6E4D58]" role="status"><template v-if="isTodaysChoice(profileSlug)">You sent interest to {{ profile.name }} today.</template><template v-else>You have sent your 5 interests for today.</template> You can send more tomorrow.</p>
          <p v-else class="mt-3 text-xs leading-5 text-[#6E4D58]">Choose thoughtfully — you can show interest in up to 5 people each day.</p>
          <p v-if="successMessage" class="mt-3 rounded-lg bg-[#EAF2DE] p-3 text-xs font-semibold text-[#4D2F39]" role="status">{{ successMessage }} <NuxtLink to="/interests/sent" class="text-[#8F1839] underline">View sent interests</NuxtLink></p>
          <p v-if="errorMessage" class="mt-3 text-xs font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
          <p class="mt-3 flex items-start gap-2 text-xs leading-5 text-[#6E4D58]"><ShieldCheck class="mt-0.5 size-3.5 shrink-0" />Only share contact details when you feel comfortable. Meet in a public place first.</p>
        </aside>
      </div>

      <div class="mt-5 grid gap-5 lg:grid-cols-2">
        <section class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] sm:p-6"><div class="flex items-center gap-2"><UserRound class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">About me</h2></div><p class="mt-4 leading-7 text-[#4D2F39]">{{ profile.bio }}</p></section>
        <section class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] sm:p-6"><div class="flex items-center gap-2"><CalendarDays class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">Usually free</h2></div><div class="mt-4 flex flex-wrap gap-2"><span v-for="time in profile.availability" :key="time" class="rounded-full bg-[#F3E8DA] px-3 py-2 text-sm font-semibold text-[#4D2F39]">{{ time }}</span></div></section>
        <section class="rounded-lg bg-[#FCE3E8] p-5 sm:p-6"><h2 class="text-xl font-semibold">Activities I’d enjoy together</h2><div class="mt-4 flex flex-wrap gap-2"><span v-for="activity in profile.activities" :key="activity" class="rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-[#8F1839]">{{ activity }}</span></div></section>
        <section v-if="profile.interests?.length" class="rounded-lg bg-[#EAF2DE] p-5 sm:p-6"><h2 class="text-xl font-semibold">A few more interests</h2><div class="mt-4 flex flex-wrap gap-2"><span v-for="interest in profile.interests" :key="interest" class="rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-[#4D2F39]">{{ interest }}</span></div></section>
      </div>
    </section>

    <section v-else class="mx-auto max-w-xl rounded-lg bg-white p-8 text-center"><UserRound class="mx-auto size-8 text-[#B4234A]" /><h1 class="mt-4 text-2xl font-semibold">{{ profileLoadError ? 'Profile unavailable' : 'Profile not found' }}</h1><p class="mt-2 text-sm text-[#6E4D58]">{{ profileLoadError || 'This profile may no longer be available.' }}</p><NuxtLink to="/matches" class="mt-5 inline-flex rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Browse matches</NuxtLink></section>
  </main>
</template>

<style scoped>
.profile-photo { position: relative; overflow: hidden; background: #F3E8DA; }
.triptych { height: 100%; width: 300%; max-width: none; object-fit: cover; }
.triptych-first { transform: translateX(0); }
.triptych-second { transform: translateX(-33.333%); }
.triptych-third { transform: translateX(-66.666%); }
</style>
