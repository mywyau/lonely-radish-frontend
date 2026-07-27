<script setup lang="ts">
import { BadgeCheck, BadgePercent, Clock3, Copy, MapPin, Store, TicketCheck } from '@lucide/vue'

definePageMeta({ title: 'Date offers · Lonely Radish', middleware: 'logged-in' })

type OfferVenue = {
  id: string
  name: string
  category: string
  city: string
  postcode: string
}

type Offer = {
  id: string
  title: string
  description: string | null
  discountType: 'percentage' | 'fixed'
  discountValue: number
  terms: string | null
  businessName: string
  venueScope: 'single' | 'selected' | 'all'
  locationCount: number
  venues: OfferVenue[]
}
type OfferClaim = {
  id: string
  offerId: string
  proposalId: string | null
  status: 'issued' | 'redeemed' | 'expired' | 'revoked'
  code: string | null
  expiresAt: string
  redeemedAt: string | null
}

const route = useRoute()
const proposalId = computed(() => typeof route.query.proposal === 'string' ? route.query.proposal : '')
const currentAttachedClaim = computed(() => Object.values(claims.value).find(claim => attachedToCurrentDate(claim)))
const offers = ref<Offer[]>([])
const claims = ref<Record<string, OfferClaim>>({})
const loading = ref(true)
const errorMessage = ref('')
const claimErrors = ref<Record<string, string>>({})
const qrCodes = ref<Record<string, string>>({})
const claimingId = ref('')
const copiedClaimId = ref('')
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined

function offerLocationLabel(offer: Offer) {
  if (offer.locationCount === 1) {
    const venue = offer.venues[0]
    return venue ? `${venue.name}, ${venue.city}` : 'One participating location'
  }
  return `${offer.locationCount} participating locations`
}

function claimStatus(claim?: OfferClaim) {
  if (!claim) return null
  if (claim.status === 'issued' && new Date(claim.expiresAt).getTime() <= now.value) return 'expired'
  return claim.status
}

function attachedToCurrentDate(claim?: OfferClaim) {
  return Boolean(proposalId.value && claim?.proposalId === proposalId.value)
}

async function generateQrCode(claim: OfferClaim) {
  if (!claim.code || claim.status !== 'issued') return
  try {
    const { toDataURL } = await import('qrcode')
    qrCodes.value[claim.id] = await toDataURL(claim.code, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 240,
      color: { dark: '#2A1520', light: '#FFFFFFFF' },
    })
  } catch {
    claimErrors.value[claim.offerId] = 'The QR code could not be displayed. The text code still works.'
  }
}

async function claimOffer(offer: Offer) {
  claimingId.value = offer.id
  claimErrors.value[offer.id] = ''
  try {
    const result = await $fetch<{ claim: OfferClaim }>(`/api/offers/${offer.id}/claim`, {
      method: 'POST', body: proposalId.value ? { proposalId: proposalId.value } : {},
    })
    if (proposalId.value) {
      for (const claim of Object.values(claims.value)) {
        if (claim.offerId !== offer.id && claim.proposalId === proposalId.value) claim.proposalId = null
      }
    }
    claims.value[offer.id] = result.claim
    await generateQrCode(result.claim)
  } catch (error: any) {
    claimErrors.value[offer.id] = error?.data?.statusMessage || 'The offer code could not be created.'
  } finally { claimingId.value = '' }
}

async function copyCode(claim: OfferClaim) {
  if (!claim.code) return
  try {
    await navigator.clipboard.writeText(claim.code)
    copiedClaimId.value = claim.id
    setTimeout(() => { if (copiedClaimId.value === claim.id) copiedClaimId.value = '' }, 2000)
  } catch {
    claimErrors.value[claim.offerId] = 'Copy was unavailable. Press and hold the code to copy it.'
  }
}

onMounted(async () => {
  try {
    const [offerResult, claimResult] = await Promise.all([
      $fetch<{ offers: Offer[] }>('/api/offers'),
      $fetch<{ claims: OfferClaim[] }>('/api/offer-claims'),
    ])
    offers.value = offerResult.offers
    claims.value = Object.fromEntries(claimResult.claims.map(claim => [claim.offerId, claim]))
    await Promise.all(claimResult.claims.map(generateQrCode))
    clock = setInterval(() => { now.value = Date.now() }, 1000)
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Offers could not be loaded.'
  } finally {
    loading.value = false
  }
})
onBeforeUnmount(() => { if (clock) clearInterval(clock) })
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-4 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Plan something together</p>
      <h1 class="mt-2 text-4xl font-semibold">Date-friendly offers</h1>
      <p class="mt-3 max-w-2xl leading-7 text-[#6E4D58]">Offers from businesses and venues reviewed by Lonely Radish.
        Claim a code only when you are ready to show it at the venue.</p>
      <div v-if="proposalId" class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#EAF2DE] p-4">
        <div><p class="text-sm font-semibold text-[#52713A]">Choose an offer for your confirmed date</p><p class="mt-1 text-xs text-[#4D2F39]">Attach one here so it stays connected to your plan. Your date will not see your private redemption code.</p></div>
        <NuxtLink to="/matches" class="text-sm font-semibold text-[#52713A] hover:underline">Back to matches</NuxtLink>
      </div>
      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">
        {{ errorMessage }}</p>
      <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-[#6E4D58]">Loading offers…</div>
      <div v-else-if="offers.length" class="mt-8 grid gap-4 sm:grid-cols-2">
        <article v-for="offer in offers" :key="offer.id"
          class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] sm:p-6">
          <BadgePercent class="size-6 text-[#B4234A]" />
          <p class="mt-4 text-xs font-bold uppercase tracking-wide text-[#8F1839]">{{ offer.businessName }}</p>
          <h2 class="mt-1 text-xl font-semibold">{{ offer.title }}</h2>
          <p class="mt-2 text-lg font-bold text-[#52713A]">{{ offer.discountType === 'percentage' ?
            `${offer.discountValue}% off` : `£${offer.discountValue} off` }}</p>
          <p class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#6E4D58]">
            <MapPin class="size-4" />{{ offerLocationLabel(offer) }}
          </p>
          <details v-if="offer.locationCount > 1" class="mt-2 rounded-lg bg-[#FBF7F1] px-3 py-2 text-xs text-[#6E4D58]">
            <summary class="cursor-pointer font-semibold text-[#4D2F39]">Preview participating locations</summary>
            <ul class="mt-2 grid gap-1.5">
              <li v-for="venue in offer.venues" :key="venue.id">{{ venue.name }} · {{ venue.city }}, {{ venue.postcode
                }}</li>
            </ul>
            <p v-if="offer.locationCount > offer.venues.length" class="mt-2 font-semibold">
              And {{ offer.locationCount - offer.venues.length }} more locations.
            </p>
          </details>
          <p v-if="offer.description" class="mt-3 text-sm leading-6 text-[#4D2F39]">{{ offer.description }}</p>
          <p v-if="offer.terms" class="mt-4 rounded-lg bg-[#F3E8DA] p-3 text-xs leading-5 text-[#6E4D58]">Terms: {{
            offer.terms }}</p>
          <div class="mt-5 border-t border-[#E8D8C4] pt-5">
            <div v-if="attachedToCurrentDate(claims[offer.id])" class="mb-3 flex items-center gap-2 rounded-lg bg-[#EAF2DE] p-3 text-sm font-semibold text-[#52713A]">
              <BadgeCheck class="size-5" />Attached to this date
            </div>
            <div v-if="claimStatus(claims[offer.id]) === 'redeemed'"
              class="flex items-center gap-2 rounded-lg bg-[#EAF2DE] p-3 text-sm font-semibold text-[#52713A]">
              <BadgeCheck class="size-5" />Offer redeemed
            </div>
            <div v-else-if="claimStatus(claims[offer.id]) === 'revoked'"
              class="rounded-lg bg-[#F3E8DA] p-3 text-sm text-[#6E4D58]">This claim is no longer available.</div>
            <button v-else-if="proposalId && !attachedToCurrentDate(claims[offer.id])" type="button" :disabled="claimingId === offer.id"
              class="inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              @click="claimOffer(offer)">
              <TicketCheck class="size-4" />{{ claimingId === offer.id ? 'Attaching offer…' : currentAttachedClaim ? 'Replace attached offer' : 'Attach this offer' }}
            </button>
            <div v-else-if="claimStatus(claims[offer.id]) === 'issued'" class="rounded-lg bg-[#FCE3E8] p-4">
              <div class="flex items-center gap-2 text-sm font-semibold text-[#8F1839]">
                <TicketCheck class="size-5" />Ask the venue to scan this code
              </div>
              <div v-if="qrCodes[claims[offer.id].id]" class="mt-3 rounded-lg bg-white p-3 text-center">
                <img :src="qrCodes[claims[offer.id].id]"
                  :alt="`QR redemption code for ${offer.title} at ${offerLocationLabel(offer)}`"
                  class="mx-auto size-52 max-w-full" width="208" height="208">
                <p class="mt-2 text-xs text-[#6E4D58]">The QR contains only the short-lived offer code and can be used
                  once at any participating location.</p>
              </div>
              <button type="button"
                class="mt-3 w-full rounded-lg bg-white px-3 py-3 text-center font-mono text-lg font-bold tracking-wider text-[#2A1520]"
                title="Copy redemption code" @click="copyCode(claims[offer.id])">{{ claims[offer.id].code }}</button>
              <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#6E4D58]"><span
                  class="inline-flex items-center gap-1">
                  <Clock3 class="size-3.5" />Expires {{ new Date(claims[offer.id].expiresAt).toLocaleTimeString('en-GB',
                    { hour: '2-digit', minute: '2-digit' }) }}
                </span><button type="button" class="inline-flex items-center gap-1 font-semibold text-[#8F1839]"
                  @click="copyCode(claims[offer.id])">
                  <Copy class="size-3.5" />{{ copiedClaimId === claims[offer.id].id ? 'Copied' : 'Copy code' }}
                </button></div>
            </div>
            <button v-else type="button" :disabled="claimingId === offer.id"
              class="inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              @click="claimOffer(offer)">
              <TicketCheck class="size-4" />{{ claimingId === offer.id ? 'Creating code…' :
                claimStatus(claims[offer.id]) === 'expired' ? 'Get a new code' : 'Claim this offer' }}
            </button>
            <p v-if="!claims[offer.id]" class="mt-2 text-xs leading-5 text-[#6E4D58]">Codes expire after 15 minutes and
              can be redeemed once.</p>
            <p v-if="claimErrors[offer.id]" class="mt-3 text-xs font-semibold text-[#8F1839]" role="alert">{{
              claimErrors[offer.id] }}</p>
          </div>
        </article>
      </div>
      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center">
        <Store class="mx-auto size-8 text-[#B4234A]" />
        <h2 class="mt-3 text-xl font-semibold">No approved offers yet</h2>
        <p class="mt-2 text-sm text-[#6E4D58]">Check again as more date-friendly venues join.</p>
      </div>
    </section>
  </main>
</template>
