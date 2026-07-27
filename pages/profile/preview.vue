<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight, Expand, Eye, HeartHandshake, ImagePlus, MapPin, ShieldCheck, UserRound, X } from '@lucide/vue';

definePageMeta({ title: 'Profile Preview · Lonely Radish', middleware: 'logged-in' })

type PreviewData = {
  profile: { displayName: string; dateOfBirth?: string; pronouns?: string; bio?: string; neighbourhood?: string; visibility?: string; heightCm?: number; drinking?: string; smoking?: string; dailyRhythm?: string } | null
  photos: Array<{ id: string; url: string; altText?: string; position: number }>
  activities: string[]
  interestCategories: string[]
  availability: string[]
}

const loading = ref(true)
const errorMessage = ref('')
const data = ref<PreviewData | null>(null)
const activitiesFlipped = ref(false)
const activePhotoIndex = ref(0)
const photoViewerOpen = ref(false)
const photoSwipeStartX = ref<number | null>(null)
const lifestyleLabels = computed(() => {
  const profile = data.value?.profile
  if (!profile) return []
  const labels: string[] = []
  if (profile.heightCm) labels.push(`${profile.heightCm} cm`)
  if (profile.drinking && profile.drinking !== 'prefer_not_to_say') labels.push(`Drinks ${profile.drinking}`)
  if (profile.smoking && profile.smoking !== 'prefer_not_to_say') labels.push(profile.smoking === 'never' ? 'Non-smoker' : `Smokes ${profile.smoking}`)
  if (profile.dailyRhythm) labels.push({ early_bird: 'Early bird', night_owl: 'Night owl', flexible: 'A bit of both' }[profile.dailyRhythm] || profile.dailyRhythm)
  return labels
})
const age = computed(() => {
  const value = data.value?.profile?.dateOfBirth
  if (!value) return null
  const birth = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  const today = new Date()
  let years = today.getUTCFullYear() - birth.getUTCFullYear()
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) years--
  return years
})
const galleryPhotos = computed(() => (data.value?.photos || []).slice(0, 6))
const gallerySlots = computed(() => [
  ...galleryPhotos.value.map(photo => ({ ...photo, empty: false })),
  ...Array.from({ length: Math.max(0, 6 - galleryPhotos.value.length) }, (_, index) => ({ id: `empty-${index}`, url: '', empty: true, position: galleryPhotos.value.length + index + 1 })),
])
const activePhoto = computed(() => galleryPhotos.value[activePhotoIndex.value] || null)

function selectPhoto(index: number) {
  activePhotoIndex.value = index
}
function changePhoto(direction: -1 | 1) {
  const count = galleryPhotos.value.length
  if (!count) return
  activePhotoIndex.value = (activePhotoIndex.value + direction + count) % count
}
function startPhotoSwipe(event: TouchEvent) {
  photoSwipeStartX.value = event.changedTouches[0]?.clientX ?? null
}
function endPhotoSwipe(event: TouchEvent) {
  const startX = photoSwipeStartX.value
  const endX = event.changedTouches[0]?.clientX
  photoSwipeStartX.value = null
  if (startX == null || endX == null || Math.abs(endX - startX) < 40) return
  changePhoto(endX < startX ? 1 : -1)
}
function handleGalleryKeydown(event: KeyboardEvent) {
  if (!photoViewerOpen.value) return
  if (event.key === 'Escape') photoViewerOpen.value = false
  if (event.key === 'ArrowLeft') changePhoto(-1)
  if (event.key === 'ArrowRight') changePhoto(1)
}
onMounted(async () => {
  window.addEventListener('keydown', handleGalleryKeydown)
  try { data.value = await $fetch<PreviewData>('/api/profile/me') }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your profile preview could not be loaded.' }
  finally { loading.value = false }
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleGalleryKeydown))
</script>

<template>
  <main class="min-h-screen overflow-x-hidden bg-[#FBF7F1] px-4 py-8 text-[#2A1520] min-[360px]:px-5 sm:px-8 sm:py-10">
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
          <section v-if="activePhoto" aria-label="Your profile photos" class="min-w-0 max-w-full sm:hidden">
            <button type="button" class="profile-photo relative block aspect-[4/3] w-full max-w-full overflow-hidden rounded-lg"
              :aria-label="`Expand ${activePhoto.altText || 'your profile photo'}`" @click="photoViewerOpen = true">
              <img :src="activePhoto.url" :alt="activePhoto.altText || `Your profile photo ${activePhotoIndex + 1}`"
                class="h-full w-full object-cover">
              <span class="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[#2A1520]/80 px-3 py-2 text-xs font-semibold text-white">
                <Expand class="size-3.5" aria-hidden="true" />Tap to expand
              </span>
              <span class="absolute left-3 top-3 rounded-full bg-[#2A1520]/75 px-2.5 py-1 text-xs font-semibold text-white">{{ activePhotoIndex + 1 }} / {{ galleryPhotos.length }}</span>
            </button>
            <div v-if="galleryPhotos.length > 1" class="mt-2 flex min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1" aria-label="Choose a profile photo">
              <button v-for="(photo, index) in galleryPhotos" :key="`${photo.id}-mobile`" type="button"
                class="profile-photo size-16 shrink-0 overflow-hidden rounded-lg border-2"
                :class="index === activePhotoIndex ? 'border-[#B4234A]' : 'border-transparent opacity-70'"
                :aria-label="`View profile photo ${index + 1}`" :aria-pressed="index === activePhotoIndex"
                @click="selectPhoto(index)">
                <img :src="photo.url" alt="" class="h-full w-full object-cover">
              </button>
            </div>
          </section>
          <section aria-label="Your profile photos"
            class="hidden grid-cols-3 gap-2 overflow-hidden rounded-lg sm:grid">
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
            <div v-if="lifestyleLabels.length" class="mt-5 flex flex-wrap gap-2"><span v-for="label in lifestyleLabels" :key="label" class="rounded-full bg-[#F3E8DA] px-3 py-2 text-sm font-semibold text-[#4D2F39]">{{ label }}</span></div>
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

    <Teleport to="body">
      <div v-if="photoViewerOpen && activePhoto" class="fixed inset-0 z-[100] flex items-center justify-center bg-[#160B10]/95 p-4"
        role="dialog" aria-modal="true" aria-label="Expanded profile photo" @click.self="photoViewerOpen = false">
        <button type="button" class="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 rounded-full bg-white/20 p-3 text-white"
          aria-label="Close expanded photo" @click.stop="photoViewerOpen = false"><X class="size-6" /></button>
        <button v-if="galleryPhotos.length > 1" type="button" class="absolute left-3 z-10 rounded-full bg-white/20 p-3 text-white"
          aria-label="Previous photo" @click="changePhoto(-1)"><ChevronLeft class="size-7" /></button>
        <div class="profile-photo h-[78vh] w-[calc(100vw-2rem)] max-w-3xl touch-pan-y overflow-hidden rounded-lg bg-black"
          @touchstart.passive="startPhotoSwipe" @touchend.passive="endPhotoSwipe">
          <img :src="activePhoto.url" :alt="activePhoto.altText || `Your profile photo ${activePhotoIndex + 1}`"
            class="h-full w-full object-contain">
        </div>
        <button v-if="galleryPhotos.length > 1" type="button" class="absolute right-3 z-10 rounded-full bg-white/20 p-3 text-white"
          aria-label="Next photo" @click="changePhoto(1)"><ChevronRight class="size-7" /></button>
        <p class="absolute bottom-4 rounded-full bg-black/60 px-3 py-1.5 text-sm font-semibold text-white">{{ activePhotoIndex + 1 }} / {{ galleryPhotos.length }}</p>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.profile-photo {
  position: relative;
  overflow: hidden;
  background: #F3E8DA;
}

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
