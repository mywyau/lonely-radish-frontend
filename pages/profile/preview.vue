<script setup lang="ts">
import { CalendarDays, Eye, HeartHandshake, ImagePlus, MapPin, ShieldCheck, UserRound } from '@lucide/vue';

definePageMeta({ title: 'Profile Preview · Lonely Radish', middleware: 'logged-in' })

type PreviewData = {
  profile: { displayName: string; dateOfBirth?: string; pronouns?: string; bio?: string; neighbourhood?: string; visibility?: string } | null
  photos: Array<{ id: string; url: string; altText?: string; position: number }>
  activities: string[]
  interestCategories: string[]
  availability: string[]
}

const loading = ref(true)
const errorMessage = ref('')
const data = ref<PreviewData | null>(null)
const activitiesFlipped = ref(false)
const age = computed(() => {
  const value = data.value?.profile?.dateOfBirth
  if (!value) return null
  const birth = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  const today = new Date()
  let years = today.getUTCFullYear() - birth.getUTCFullYear()
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) years--
  return years
})
const gallerySlots = computed(() => [
  ...(data.value?.photos || []).slice(0, 6).map(photo => ({ ...photo, empty: false })),
  ...Array.from({ length: Math.max(0, 6 - (data.value?.photos.length || 0)) }, (_, index) => ({ id: `empty-${index}`, url: '', empty: true, position: (data.value?.photos.length || 0) + index + 1 })),
])

onMounted(async () => {
  try { data.value = await $fetch<PreviewData>('/api/profile/me') }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your profile preview could not be loaded.' }
  finally { loading.value = false }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-8 text-[#2A1520] sm:px-8 sm:py-10">
    <section class="mx-auto max-w-5xl">
      <div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">
            <Eye class="size-4" />Private preview
          </p>
          <h1 class="mt-2 text-3xl font-semibold sm:text-4xl">See your profile as others do.</h1>
          <p class="mt-2 text-sm text-[#6E4D58]">This page is visible only to you. Contact details and private matching
            preferences are never included.</p>
        </div>
        <div class="flex gap-2">
          <NuxtLink to="/account/v2" class="rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold text-[#8F1839]">
            Edit account</NuxtLink>
          <NuxtLink to="/photos" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white">Manage
            photos</NuxtLink>
        </div>
      </div>

      <div v-if="loading" class="rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading your preview…</div>
      <p v-else-if="errorMessage" class="rounded-lg bg-[#FCE3E8] p-5 text-sm font-semibold text-[#8F1839]" role="alert">
        {{ errorMessage }}</p>
      <template v-else-if="data?.profile">
        <div class="grid gap-5 lg:grid-cols-[1.05fr_.95fr] lg:items-start">
          <section aria-label="Your profile photos"
            class="grid grid-cols-2 gap-2 overflow-hidden rounded-lg sm:grid-cols-3">
            <div v-for="(photo, index) in gallerySlots" :key="photo.id"
              class="relative aspect-square overflow-hidden bg-[#F3E8DA]"
              :class="[index === 0 && 'col-span-2 row-span-2', photo.empty && 'border-2 border-dashed border-[#CDB9A8]']">
              <img v-if="!photo.empty" :src="photo.url" :alt="photo.altText || `Your profile photo ${index + 1}`"
                class="h-full w-full object-cover">
              <div v-else class="flex h-full items-center justify-center"><span
                  class="rounded-full bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#8A6A74]">Photo
                  {{ photo.position }}</span></div>
            </div>
          </section>
          <aside class="rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,.08)] sm:p-6 lg:sticky lg:top-24">
            <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 class="text-3xl font-semibold">{{ data.profile.displayName }}<template v-if="age !== null">, {{ age
                  }}</template>
              </h2><span v-if="data.profile.pronouns" class="text-sm text-[#6E4D58]">{{ data.profile.pronouns }}</span>
            </div>
            <p v-if="data.profile.neighbourhood" class="mt-2 inline-flex items-center gap-1 text-sm text-[#6E4D58]">
              <MapPin class="size-4" />{{ data.profile.neighbourhood }}
            </p>
            <div class="mt-5 rounded-lg bg-[#F3E8DA] p-4 text-sm leading-6 text-[#4D2F39]">
              <p class="font-semibold">Profile preview</p>
              <p class="mt-1 text-xs">Example actions are shown below to make this feel like a live profile, but they are disabled in your own preview.</p>
            </div>
            <div class="mt-5" aria-label="Example profile actions">
              <button type="button" aria-disabled="true" class="inline-flex w-full cursor-default items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white"><HeartHandshake class="size-4" />Show interest</button>
              <p class="mt-3 flex items-start gap-2 text-xs leading-5 text-[#6E4D58]"><ShieldCheck class="mt-0.5 size-3.5 shrink-0" />Only share contact details when you feel comfortable. Meet in a public place first.</p>
              <div class="mt-4 flex gap-4 border-t border-[#E8D8C4] pt-4 text-xs font-semibold text-[#8F1839]"><span>Report profile</span><span>Block user</span></div>
              <p class="mt-2 text-[11px] text-[#6E4D58]">Preview only — these controls are not active here.</p>
            </div>
          </aside>
        </div>

        <div class="mt-5 grid gap-5 lg:grid-cols-2">
          <section class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,.08)] sm:p-6">
            <div class="flex items-center gap-2">
              <UserRound class="size-5 text-[#B4234A]" />
              <h3 class="text-xl font-semibold">About me</h3>
            </div>
            <p class="mt-4 leading-7 text-[#4D2F39]">{{ data.profile.bio || 'Add a short bio to introduce yourself.' }}
            </p>
          </section>
          <section v-if="data.availability?.length"
            class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,.08)] sm:p-6">
            <div class="flex items-center gap-2">
              <CalendarDays class="size-5 text-[#B4234A]" />
              <h3 class="text-xl font-semibold">Usually free</h3>
            </div>
            <div class="mt-4 flex flex-wrap gap-2"><span v-for="time in data.availability" :key="time"
                class="rounded-full bg-[#F3E8DA] px-3 py-2 text-sm font-semibold text-[#4D2F39]">{{ time }}</span></div>
            <p class="mt-4 rounded-lg bg-[#F3E8DA] p-3 text-xs leading-5 text-[#6E4D58]">This schedule is shown in your private preview. On live profiles it is visible only to active matches, unless you enable “Show availability before matching” in Schedule &amp; Safety.</p>
          </section>
          <button type="button" class="flip-card text-left" :class="activitiesFlipped && 'is-flipped'"
            :aria-pressed="activitiesFlipped"
            :aria-label="activitiesFlipped ? 'Show detailed activities' : 'Show broader interests'"
            @click="activitiesFlipped = !activitiesFlipped">
            <span class="flip-card-inner">
              <span class="flip-face flip-front"><span class="flex items-center justify-between gap-3"><span
                    class="text-xl font-semibold">Activities I’d enjoy together</span>
                    <!-- <span class="flip-hint">Tap to see interests ↻</span> -->
                  </span><span v-if="data.activities.length" class="mt-4 flex flex-wrap gap-2"><span
                    v-for="activity in data.activities" :key="activity"
                    class="rounded-full bg-white/80 px-3 py-2 text-sm font-semibold text-[#8F1839]">{{ activity
                    }}</span></span><span v-else class="mt-2 block text-sm text-[#6E4D58]">No activities selected
                  yet.</span></span>
              <span class="flip-face flip-back"><span class="flex items-center justify-between gap-3"><span
                    class="text-xl font-semibold">My broader interests</span>
                  <!-- <span class="flip-hint">Tap to see activities ↻</span> -->
                </span><span v-if="data.interestCategories?.length" class="mt-4 flex flex-wrap gap-2"><span
                    v-for="interest in data.interestCategories" :key="interest"
                    class="rounded-full bg-white/85 px-3 py-2 text-sm font-semibold text-[#4D2F39]">{{ interest
                    }}</span></span><span v-else class="mt-2 block text-sm text-[#4D2F39]">Your broader interests will
                  appear
                  here.</span><span class="mt-4 block text-xs leading-5 text-[#4D2F39]">These are the categories where
                  other
                  people can discover your profile.</span></span>
            </span>
          </button>
        </div>
      </template>
      <div v-else class="rounded-lg bg-white p-8 text-center">
        <ImagePlus class="mx-auto size-8 text-[#B4234A]" />
        <h2 class="mt-3 text-xl font-semibold">Complete your profile to preview it</h2>
        <NuxtLink to="/onboarding"
          class="mt-5 inline-flex rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Continue profile
          setup
        </NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.flip-card {
  min-height: 13rem;
  border-radius: .5rem;
  outline: none;
  perspective: 1000px;
  transition: filter .2s ease, transform .2s ease;
}

.flip-card:hover,
.flip-card:focus-visible {
  filter: brightness(1.035) drop-shadow(0 12px 18px rgba(180, 35, 74, .16));
  transform: translateY(-2px);
}

.flip-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(180, 35, 74, .3);
}

.flip-card-inner {
  position: relative;
  display: block;
  min-height: 13rem;
  transform-style: preserve-3d;
  transition: transform .55s cubic-bezier(.2, .7, .2, 1);
}

.flip-card.is-flipped .flip-card-inner {
  transform: rotateY(180deg);
}

.flip-face {
  position: absolute;
  inset: 0;
  display: block;
  overflow: auto;
  border-radius: .5rem;
  padding: 1.25rem;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flip-front {
  background: #FCE3E8;
}

.flip-back {
  background: #EAF2DE;
  transform: rotateY(180deg);
}

.flip-hint {
  flex-shrink: 0;
  color: #8F1839;
  font-size: .7rem;
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {

  .flip-card,
  .flip-card-inner {
    transition: none;
  }

  .flip-card:hover,
  .flip-card:focus-visible {
    transform: none;
  }
}
</style>
