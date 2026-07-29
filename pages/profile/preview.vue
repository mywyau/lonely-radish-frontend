<script setup lang="ts">
import { AtSign, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Expand, Eye, HeartHandshake, ImagePlus, Mail, MapPin, Phone, RefreshCw, ShieldCheck, UserRound, X } from '@lucide/vue';
import { profileDetails } from '~/utils/profileDetails';

definePageMeta({ title: 'Profile Preview · Lonely Radish', middleware: 'logged-in' })

type PreviewData = {
  profile: { displayName: string; dateOfBirth?: string; pronouns?: string; bio?: string; neighbourhood?: string; visibility?: string; heightCm?: number; weightKg?: number; drinking?: string; smoking?: string; dailyRhythm?: string } | null
  photos: Array<{ id: string; url: string; altText?: string; position: number }>
  activities: string[]
  interestCategories: string[]
  personalInterests: string[]
  availability: string[]
  contactDetails: { phoneNumber?: string | null; contactEmail?: string | null; socialHandle?: string | null; shareWithMatches: boolean } | null
}

const loading = ref(true)
const errorMessage = ref('')
const data = ref<PreviewData | null>(null)
const activitiesFlipped = ref(false)
const profileCardFlipped = ref(false)
const profileDetailsCollapsed = ref(true)
const bioExpanded = ref(false)
const activePhotoIndex = ref(0)
const photoViewerOpen = ref(false)
const photoSwipeStartX = ref<number | null>(null)
const lifestyleDetails = computed(() => {
  const profile = data.value?.profile
  return profile ? profileDetails(profile) : []
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
const bioNeedsExpansion = computed(() => (data.value?.profile?.bio?.length || 0) > 420)
const hasContactDetails = computed(() => Boolean(data.value?.contactDetails
  && (data.value.contactDetails.phoneNumber || data.value.contactDetails.contactEmail || data.value.contactDetails.socialHandle)))

function selectPhoto(index: number) {
  activePhotoIndex.value = index
}
function openPhoto(index: number) {
  activePhotoIndex.value = index
  photoViewerOpen.value = true
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
async function loadPreview() {
  loading.value = true
  errorMessage.value = ''
  try { data.value = await $fetch<PreviewData>('/api/profile/me') }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your profile preview could not be loaded.' }
  finally { loading.value = false }
}
onMounted(async () => {
  window.addEventListener('keydown', handleGalleryKeydown)
  await loadPreview()
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
          <p class="mt-2 text-sm text-[#6E4D58]">This page is visible only to you. Saved contact details are previewed below, but other people see them only when you enable sharing and they are an active match. Private matching preferences are never included.</p>
        </div>
        <div class="flex gap-2">
          <NuxtLink to="/account/v2" class="rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold text-[#8F1839]">
            Edit account</NuxtLink>
          <NuxtLink to="/photos" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white">Manage
            photos</NuxtLink>
        </div>
      </div>

      <div v-if="loading" class="rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading your preview…</div>
      <div v-else-if="errorMessage" class="rounded-lg bg-[#FCE3E8] p-5 text-sm font-semibold text-[#8F1839]" role="alert">
        <p>{{ errorMessage }}</p><button type="button" class="mt-3 rounded-lg bg-white px-4 py-2" @click="loadPreview">Try again</button></div>
      <template v-else-if="data?.profile">
        <div class="flex min-w-0 flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
          <div class="contents lg:block lg:space-y-5">
            <section v-if="activePhoto" aria-label="Your profile photos" class="order-1 min-w-0 max-w-full sm:hidden">
              <button type="button"
                class="profile-photo relative block aspect-[4/3] w-full max-w-full overflow-hidden rounded-lg"
                :aria-label="`Expand ${activePhoto.altText || 'your profile photo'}`"
                @click="openPhoto(activePhotoIndex)">
                <img :src="activePhoto.url" :alt="activePhoto.altText || `Your profile photo ${activePhotoIndex + 1}`"
                  class="h-full w-full object-cover">
                <span class="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[#2A1520]/80 px-3 py-2 text-xs font-semibold text-white">
                  <Expand class="size-3.5" aria-hidden="true" />Tap to expand
                </span>
                <span class="absolute left-3 top-3 rounded-full bg-[#2A1520]/75 px-2.5 py-1 text-xs font-semibold text-white">{{ activePhotoIndex + 1 }} / {{ galleryPhotos.length }}</span>
              </button>
              <div v-if="galleryPhotos.length > 1"
                class="mt-2 flex min-w-0 max-w-full gap-2 overflow-x-auto overscroll-x-contain pb-1"
                aria-label="Choose a profile photo">
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
              class="order-1 hidden grid-cols-3 gap-2 overflow-hidden rounded-lg sm:grid">
              <button v-for="(photo, index) in gallerySlots" :key="photo.id" type="button"
                class="profile-photo group aspect-square text-left disabled:cursor-default"
                :class="[index === 0 && 'col-span-2 row-span-2', photo.empty && 'profile-photo-empty']"
                :disabled="photo.empty"
                :aria-label="photo.empty ? `Empty photo slot ${photo.position}` : `Expand ${photo.altText || `your profile photo ${index + 1}`}`"
                @click="!photo.empty && openPhoto(index)">
                <img v-if="!photo.empty" :src="photo.url" :alt="photo.altText || `Your profile photo ${index + 1}`"
                  class="h-full w-full object-cover">
                <span v-if="!photo.empty"
                  class="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-[#2A1520]/80 px-3 py-2 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Expand class="size-3.5" aria-hidden="true" />Expand
                </span>
                <span v-else class="flex h-full w-full items-center justify-center" aria-hidden="true"><span
                    class="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-[#8A6A74]">Photo {{ photo.position }}</span></span>
              </button>
            </section>

            <ProfileActivityPanel class="hidden lg:block" :activities="data.activities"
              :personal-interests="data.personalInterests" :flipped="activitiesFlipped" preview
              @toggle="activitiesFlipped = !activitiesFlipped" />
          </div>

          <div class="contents lg:block lg:space-y-5">
            <div class="profile-summary-flip order-2 min-w-0 max-w-full" :class="profileCardFlipped && 'is-flipped'">
              <div class="profile-summary-inner">
                <aside
                  class="profile-summary-face profile-summary-front min-w-0 max-w-full rounded-lg bg-white p-4 shadow-[0_12px_28px_rgba(180,35,74,0.08)] min-[360px]:p-5 sm:p-6"
                  :aria-hidden="profileCardFlipped" :inert="profileCardFlipped || undefined">
                  <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 class="text-3xl font-semibold">{{ data.profile.displayName }}<template v-if="age !== null">, {{ age }}</template></h2>
                      <span v-if="data.profile.pronouns" class="text-sm text-[#6E4D58]">{{ data.profile.pronouns }}</span>
                    </div>
                    <button type="button"
                      class="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#FCE3E8] px-3 py-2 text-xs font-semibold text-[#8F1839]"
                      aria-label="View About me" @click="profileCardFlipped = true">
                      <UserRound class="size-3.5" aria-hidden="true" />
                      <RefreshCw class="size-3.5" aria-hidden="true" />
                    </button>
                  </div>
                  <p v-if="data.profile.neighbourhood" class="mt-2 inline-flex items-center gap-1 text-sm text-[#6E4D58]">
                    <MapPin class="size-4" />{{ data.profile.neighbourhood }}
                  </p>
                  <div class="mt-5 rounded-lg bg-[#F3E8DA] p-4 text-sm leading-6 text-[#4D2F39]">
                    <p class="font-semibold">Profile preview</p>
                    <p class="mt-1 text-xs">The actions below match a live profile but are disabled in your own preview.</p>
                  </div>
                  <button type="button" disabled
                    class="mt-5 inline-flex w-full cursor-default items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">
                    <HeartHandshake class="size-4" />Show interest
                  </button>
                  <p class="mt-3 flex items-start gap-2 text-xs leading-5 text-[#6E4D58]">
                    <ShieldCheck class="mt-0.5 size-3.5 shrink-0" />Only share contact details when you feel comfortable. Meet in a public place first.
                  </p>
                  <div class="mt-4 flex gap-4 border-t border-[#E8D8C4] pt-4 text-xs font-semibold text-[#8F1839]">
                    <span>Report profile</span><span>Block user</span>
                  </div>
                  <p class="mt-2 text-[11px] text-[#6E4D58]">Preview only — these controls are not active here.</p>
                  <div v-if="lifestyleDetails.length" class="mt-5 border-t border-[#E8D8C4] pt-5">
                    <button type="button" class="flex w-full items-center justify-between gap-3 text-left"
                      :aria-expanded="!profileDetailsCollapsed" aria-controls="preview-profile-details"
                      @click="profileDetailsCollapsed = !profileDetailsCollapsed">
                      <h3 class="text-sm font-semibold text-[#4D2F39]">Profile details</h3>
                      <ChevronDown class="size-4 text-[#8F1839] transition-transform"
                        :class="!profileDetailsCollapsed && 'rotate-180'" aria-hidden="true" />
                    </button>
                    <dl id="preview-profile-details" v-show="!profileDetailsCollapsed"
                      class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                      <div v-for="detail in lifestyleDetails" :key="detail.label" class="rounded-lg bg-[#F3E8DA] p-3">
                        <dt class="text-xs font-bold uppercase tracking-wide text-[#6E4D58]">{{ detail.label }}</dt>
                        <dd class="mt-1 text-sm font-semibold text-[#2A1520]">{{ detail.value }}</dd>
                      </div>
                    </dl>
                  </div>
                </aside>
                <section
                  class="profile-summary-face profile-summary-back min-w-0 max-w-full rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-6"
                  :aria-hidden="!profileCardFlipped" :inert="!profileCardFlipped || undefined">
                  <div class="flex items-start justify-between gap-4">
                    <div class="flex items-center gap-2">
                      <UserRound class="size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
                      <h3 class="text-xl font-semibold">About me</h3>
                    </div>
                    <button type="button"
                      class="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#F3E8DA] px-3 py-2 text-xs font-semibold text-[#8F1839]"
                      @click="profileCardFlipped = false">
                      <RefreshCw class="size-3.5" aria-hidden="true" />Back
                    </button>
                  </div>
                  <p class="mt-5 whitespace-pre-line break-words leading-7 text-[#4D2F39]"
                    :class="bioNeedsExpansion && !bioExpanded && 'line-clamp-6'">{{ data.profile.bio || 'Add a short bio to introduce yourself.' }}</p>
                  <button v-if="bioNeedsExpansion" type="button"
                    class="mt-4 text-sm font-semibold text-[#8F1839] hover:underline" :aria-expanded="bioExpanded"
                    @click="bioExpanded = !bioExpanded">{{ bioExpanded ? 'Show less' : 'Read more' }}</button>
                </section>
              </div>
            </div>

            <section v-if="data.availability?.length"
              class="order-4 rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] sm:p-6">
              <div class="flex items-center gap-2">
                <CalendarDays class="size-5 text-[#B4234A]" />
                <h3 class="text-xl font-semibold">Usually free</h3>
              </div>
              <div class="mt-4 flex flex-wrap gap-2"><span v-for="time in data.availability" :key="time"
                  class="rounded-full bg-[#F3E8DA] px-3 py-2 text-sm font-semibold text-[#4D2F39]">{{ time }}</span></div>
              <p class="mt-4 rounded-lg bg-[#F3E8DA] p-3 text-xs leading-5 text-[#6E4D58]">Live visibility depends on your Schedule &amp; Safety setting and whether the viewer is an active match.</p>
            </section>

            <section v-if="hasContactDetails && data.contactDetails"
              class="order-5 rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] sm:p-6">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div><h3 class="text-xl font-semibold">Contact details</h3><p class="mt-2 text-xs leading-5 text-[#6E4D58]">This is how your saved details appear to an active match when sharing is enabled.</p></div>
                <span class="rounded-full px-3 py-1.5 text-xs font-bold" :class="data.contactDetails.shareWithMatches ? 'bg-[#EAF2DE] text-[#52713A]' : 'bg-[#F3E8DA] text-[#6E4D58]'">{{ data.contactDetails.shareWithMatches ? 'Shared with active matches' : 'Currently hidden' }}</span>
              </div>
              <div class="mt-4 space-y-3 text-sm">
                <p v-if="data.contactDetails.phoneNumber" class="flex items-center gap-2 font-semibold text-[#8F1839]"><Phone class="size-4 shrink-0" aria-hidden="true" />{{ data.contactDetails.phoneNumber }}</p>
                <p v-if="data.contactDetails.contactEmail" class="flex items-center gap-2 break-all font-semibold text-[#8F1839]"><Mail class="size-4 shrink-0" aria-hidden="true" />{{ data.contactDetails.contactEmail }}</p>
                <p v-if="data.contactDetails.socialHandle" class="flex items-center gap-2 font-semibold text-[#4D2F39]"><AtSign class="size-4 shrink-0 text-[#8F1839]" aria-hidden="true" /><span class="break-all">{{ data.contactDetails.socialHandle }}</span></p>
              </div>
              <p v-if="!data.contactDetails.shareWithMatches" class="mt-4 rounded-lg bg-[#FFF1C7] p-3 text-xs leading-5 text-[#694C00]">These details are saved but are not visible to matches. Enable “Share with active matches” in your account when you are comfortable.</p>
              <NuxtLink to="/account/v2" class="mt-4 inline-flex text-sm font-semibold text-[#8F1839] hover:underline">Manage contact sharing →</NuxtLink>
            </section>

            <ProfileActivityPanel class="order-6 block lg:hidden" :activities="data.activities"
              :personal-interests="data.personalInterests" :flipped="activitiesFlipped" preview
              @toggle="activitiesFlipped = !activitiesFlipped" />
          </div>
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

.profile-photo:focus-visible {
  z-index: 1;
  outline: 3px solid #B4234A;
  outline-offset: -3px;
}

.profile-photo-empty {
  border: 2px dashed #CDB9A8;
  background: rgba(243, 232, 218, .5);
}

.profile-summary-flip {
  perspective: 1200px;
}

.profile-summary-inner {
  display: grid;
  min-width: 0;
  transform-style: preserve-3d;
  transition: transform .55s cubic-bezier(.2, .7, .2, 1);
}

.profile-summary-flip.is-flipped .profile-summary-inner {
  transform: rotateY(180deg);
}

.profile-summary-face {
  grid-area: 1 / 1;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.profile-summary-back {
  transform: rotateY(180deg);
}

.profile-summary-flip:not(.is-flipped) .profile-summary-back,
.profile-summary-flip.is-flipped .profile-summary-front {
  pointer-events: none;
}

.profile-flip-card {
  min-height: 13rem;
  border-radius: .5rem;
  outline: none;
  perspective: 1000px;
  transition: filter .2s ease, transform .2s ease;
}

.profile-flip-card:hover,
.profile-flip-card:focus-visible {
  filter: brightness(1.035) drop-shadow(0 12px 18px rgba(180, 35, 74, .16));
  transform: translateY(-2px);
}

.profile-flip-card:focus-visible {
  box-shadow: 0 0 0 3px rgba(180, 35, 74, .3);
}

.profile-flip-inner {
  position: relative;
  display: block;
  min-height: 13rem;
  transform-style: preserve-3d;
  transition: transform .55s cubic-bezier(.2, .7, .2, 1);
}

.profile-flip-card.is-flipped .profile-flip-inner {
  transform: rotateY(180deg);
}

.profile-flip-face {
  position: absolute;
  inset: 0;
  display: block;
  overflow: auto;
  border-radius: .5rem;
  padding: 1.25rem;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.profile-flip-front {
  background: #FCE3E8;
}

.profile-flip-back {
  background: #EAF2DE;
  transform: rotateY(180deg);
}

@media (prefers-reduced-motion: reduce) {

  .profile-flip-card,
  .profile-flip-inner,
  .profile-summary-inner {
    transition: none;
  }

  .profile-flip-card:hover,
  .profile-flip-card:focus-visible {
    transform: none;
  }
}
</style>
