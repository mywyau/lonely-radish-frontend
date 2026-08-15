<script setup lang="ts">
import { AtSign, CalendarDays, Clock3, Mail, Phone, RefreshCw } from '@lucide/vue'

type ContactDetails = {
  phoneNumber?: string | null
  contactEmail?: string | null
  socialHandle?: string | null
  shareWithMatches?: boolean
}

const props = withDefaults(defineProps<{
  availability: string[]
  contactDetails?: ContactDetails | null
  flipped?: boolean
  headingLevel?: 'h2' | 'h3'
  ownerPreview?: boolean
  profileName?: string
}>(), {
  contactDetails: null,
  flipped: false,
  headingLevel: 'h2',
  ownerPreview: false,
  profileName: '',
})

const emit = defineEmits<{ 'update:flipped': [value: boolean] }>()

const hasContactDetails = computed(() => Boolean(props.contactDetails
  && (props.contactDetails.phoneNumber || props.contactDetails.contactEmail || props.contactDetails.socialHandle)))
const availabilitySummary = computed(() => `${props.availability.length} ${props.availability.length === 1 ? 'timeslot' : 'timeslots'}`)
const availabilityIntro = computed(() => props.ownerPreview
  ? 'This is how your regular availability appears on your profile.'
  : `${props.profileName || 'Their'} regular availability. Use it as a starting point for making a plan.`)

function availabilityParts(label: string) {
  const structured = label.match(/^(.+?)\s*·\s*(.+)$/)
  if (structured) return { day: structured[1], time: structured[2] }
  const descriptive = label.match(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Weekdays?|Weekends?)\s+(.+)$/i)
  if (descriptive) return { day: descriptive[1], time: descriptive[2] }
  return { day: label, time: '' }
}
</script>

<template>
  <div class="availability-contact-flip" :class="flipped && 'is-flipped'">
    <div class="availability-contact-inner">
      <section
        class="availability-contact-face availability-contact-front overflow-hidden rounded-lg bg-white shadow-[0_10px_24px_rgba(180,35,74,0.08)]"
        :aria-hidden="flipped" :inert="flipped || undefined">
        <div class="h-1 bg-gradient-to-r from-[#B4234A] via-[#D77B91] to-[#E8D8C4]"></div>
        <div class="relative p-5 sm:p-6">
          <div class="pr-12 sm:pr-40">
            <div class="flex min-w-0 items-start gap-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FCE3E8]">
                <CalendarDays class="size-5 text-[#B4234A]" aria-hidden="true" />
              </span>
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <component :is="headingLevel" class="text-xl font-semibold">Usually free</component>
                  <span class="rounded-full bg-[#EAF2DE] px-2.5 py-1 text-[.68rem] font-bold uppercase tracking-wide text-[#52713A]">
                    {{ availabilitySummary }}
                  </span>
                </div>
                <!-- <p class="mt-1 max-w-xl text-sm leading-5 text-[#6E4D58]">{{ availabilityIntro }}</p> -->
              </div>
            </div>
          </div>
          <button v-if="hasContactDetails" type="button"
            class="absolute right-5 top-5 inline-flex shrink-0 items-center gap-2 rounded-full bg-[#FCE3E8] px-3 py-2 text-xs font-semibold text-[#8F1839] hover:brightness-95 sm:right-6 sm:top-6"
            :aria-label="ownerPreview ? 'Show saved contact details' : 'Show shared contact details'"
            @click="emit('update:flipped', true)">
            <RefreshCw class="size-3.5" aria-hidden="true" /><span class="hidden sm:inline">Contact details</span>
          </button>

          <div class="mt-5 grid gap-2 sm:grid-cols-2">
            <div v-for="label in availability" :key="label"
              class="flex min-w-0 items-center gap-3 rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] p-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#F3E8DA] text-[.68rem] font-extrabold uppercase tracking-wide text-[#8F1839]">
                {{ availabilityParts(label).day.slice(0, 3) }}
              </span>
              <span class="min-w-0">
                <span class="block truncate text-sm font-semibold text-[#2A1520]">{{ availabilityParts(label).day }}</span>
                <span v-if="availabilityParts(label).time" class="mt-0.5 block text-sm text-[#6E4D58]">{{ availabilityParts(label).time }}</span>
              </span>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8D8C4] pt-4">
            <p class="flex items-start gap-2 text-xs leading-5 text-[#6E4D58]">
              <Clock3 class="mt-0.5 size-3.5 shrink-0 text-[#B4234A]" aria-hidden="true" />
              Plan together using these times as a guide.
            </p>
            <NuxtLink v-if="ownerPreview" to="/preferences/schedule"
              class="text-xs font-semibold text-[#8F1839] hover:underline">Edit availability →</NuxtLink>
          </div>
        </div>
      </section>

      <section v-if="hasContactDetails && contactDetails"
        class="availability-contact-face availability-contact-back rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] sm:p-6"
        :aria-hidden="!flipped" :inert="!flipped || undefined">
        <div class="flex items-start justify-between gap-3">
          <div>
            <component :is="headingLevel" class="text-xl font-semibold">Contact details</component>
            <p class="mt-2 text-xs leading-5 text-[#6E4D58]">
              <template v-if="ownerPreview">{{ contactDetails.shareWithMatches
                ? 'This is how your details appear to an active match.'
                : 'Preview only — these saved details are currently hidden from matches.' }}</template>
              <template v-else>{{ profileName }} chose to share these with active matches.</template>
            </p>
          </div>
          <button type="button"
            class="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#F3E8DA] px-3 py-2 text-xs font-semibold text-[#8F1839] hover:brightness-95"
            aria-label="Show usual availability" @click="emit('update:flipped', false)">
            <RefreshCw class="size-3.5" aria-hidden="true" /> Usually free
          </button>
        </div>
        <div class="mt-4 space-y-3 text-sm">
          <component :is="ownerPreview ? 'p' : 'a'" v-if="contactDetails.phoneNumber"
            :href="ownerPreview ? undefined : `tel:${contactDetails.phoneNumber}`"
            class="flex items-center gap-2 font-semibold text-[#8F1839]">
            <Phone class="size-4 shrink-0" aria-hidden="true" />{{ contactDetails.phoneNumber }}
          </component>
          <component :is="ownerPreview ? 'p' : 'a'" v-if="contactDetails.contactEmail"
            :href="ownerPreview ? undefined : `mailto:${contactDetails.contactEmail}`"
            class="flex items-center gap-2 break-all font-semibold text-[#8F1839]">
            <Mail class="size-4 shrink-0" aria-hidden="true" />{{ contactDetails.contactEmail }}
          </component>
          <p v-if="contactDetails.socialHandle" class="flex items-center gap-2 font-semibold text-[#4D2F39]">
            <AtSign class="size-4 shrink-0 text-[#8F1839]" aria-hidden="true" />
            <span class="break-all">{{ contactDetails.socialHandle }}</span>
          </p>
        </div>
        <div v-if="ownerPreview" class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8D8C4] pt-4">
          <span class="rounded-full px-3 py-1.5 text-xs font-bold"
            :class="contactDetails.shareWithMatches ? 'bg-[#EAF2DE] text-[#52713A]' : 'bg-[#FFF1C7] text-[#694C00]'">
            {{ contactDetails.shareWithMatches ? 'Shared with active matches' : 'Currently hidden' }}
          </span>
          <NuxtLink to="/account/v2" class="text-xs font-semibold text-[#8F1839] hover:underline">Manage sharing →</NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.availability-contact-flip { perspective: 1200px; }
.availability-contact-inner {
  display: grid;
  min-width: 0;
  transform-style: preserve-3d;
  transition: transform .55s cubic-bezier(.2, .7, .2, 1);
}
.availability-contact-flip.is-flipped .availability-contact-inner { transform: rotateY(180deg); }
.availability-contact-face {
  grid-area: 1 / 1;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.availability-contact-back { transform: rotateY(180deg); }
.availability-contact-flip:not(.is-flipped) .availability-contact-back,
.availability-contact-flip.is-flipped .availability-contact-front { pointer-events: none; }

@media (prefers-reduced-motion: reduce) {
  .availability-contact-inner { transition: none; }
}
</style>
