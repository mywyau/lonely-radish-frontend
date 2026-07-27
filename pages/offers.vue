<script setup lang="ts">
import { BadgeCheck, BadgePercent, ChevronDown, Clock3, Copy, MapPin, Search, Store, TicketCheck, X } from '@lucide/vue'

definePageMeta({ title: 'Date offers · Lonely Radish', middleware: 'logged-in' })

type OfferVenue = { id: string; name: string; category: string; city: string; postcode: string }
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
  offerTitle: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  terms: string | null
  businessName: string
  venueName: string
}

const categoryOptions = [
  { value: 'cafe', label: 'Cafés' }, { value: 'restaurant', label: 'Restaurants' },
  { value: 'bar', label: 'Bars' }, { value: 'activity', label: 'Activities' },
  { value: 'culture', label: 'Culture' }, { value: 'wellness', label: 'Wellness' },
  { value: 'other', label: 'Other' },
]
const route = useRoute()
const proposalId = computed(() => typeof route.query.proposal === 'string' ? route.query.proposal : '')
const offers = ref<Offer[]>([])
const claims = ref<Record<string, OfferClaim>>({})
const searchInput = ref('')
const locationInput = ref('')
const category = ref('')
const discountType = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const catalogueLoading = ref(true)
const claimsLoading = ref(true)
const loadingMore = ref(false)
const errorMessage = ref('')
const claimErrors = ref<Record<string, string>>({})
const qrCodes = ref<Record<string, string>>({})
const claimingId = ref('')
const copiedClaimId = ref('')
const now = ref(Date.now())
let clock: ReturnType<typeof setInterval> | undefined
let filterTimer: ReturnType<typeof setTimeout> | undefined
let offerRequest = 0

const hasFilters = computed(() => Boolean(searchInput.value.trim() || locationInput.value.trim() || category.value || discountType.value))
const currentAttachedClaim = computed(() => Object.values(claims.value).find(claim => attachedToCurrentDate(claim)))
const pinnedClaims = computed(() => Object.values(claims.value).filter(claim =>
  attachedToCurrentDate(claim) || (!proposalId.value && claimStatus(claim) === 'issued')))

function discountLabel(value: Pick<Offer, 'discountType' | 'discountValue'> | Pick<OfferClaim, 'discountType' | 'discountValue'>) {
  return value.discountType === 'percentage' ? `${value.discountValue}% off` : `£${value.discountValue} off`
}
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
  if (!claim.code || claimStatus(claim) !== 'issued' || qrCodes.value[claim.id]) return
  try {
    const { toDataURL } = await import('qrcode')
    qrCodes.value[claim.id] = await toDataURL(claim.code, {
      errorCorrectionLevel: 'M', margin: 2, width: 240,
      color: { dark: '#2A1520', light: '#FFFFFFFF' },
    })
  } catch {
    claimErrors.value[claim.offerId] = 'The QR code could not be displayed. The text code still works.'
  }
}
function revealClaimQr(event: Event, claim?: OfferClaim) {
  if ((event.currentTarget as HTMLDetailsElement).open && claim) void generateQrCode(claim)
}
async function loadOffers(append = false) {
  const request = ++offerRequest
  if (append) loadingMore.value = true
  else catalogueLoading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{ offers: Offer[]; nextCursor: string | null; hasMore: boolean }>('/api/offers', {
      query: {
        ...(searchInput.value.trim() ? { q: searchInput.value.trim() } : {}),
        ...(locationInput.value.trim() ? { location: locationInput.value.trim() } : {}),
        ...(category.value ? { category: category.value } : {}),
        ...(discountType.value ? { discountType: discountType.value } : {}),
        ...(append && nextCursor.value ? { cursor: nextCursor.value } : {}),
      },
    })
    if (request !== offerRequest) return
    offers.value = append ? [...offers.value, ...result.offers] : result.offers
    nextCursor.value = result.nextCursor
    hasMore.value = result.hasMore
  } catch (error: any) {
    if (request === offerRequest) errorMessage.value = error?.data?.statusMessage || 'Offers could not be loaded.'
  } finally {
    if (request === offerRequest) catalogueLoading.value = false
    loadingMore.value = false
  }
}
async function loadClaims() {
  try {
    const result = await $fetch<{ claims: OfferClaim[] }>('/api/offer-claims')
    claims.value = {}
    for (const claim of result.claims) {
      if (proposalId.value) {
        if (claim.proposalId === proposalId.value) claims.value[claim.offerId] = claim
      } else {
        const current = claims.value[claim.offerId]
        if (!current || (claimStatus(claim) === 'issued' && claimStatus(current) !== 'issued')) {
          claims.value[claim.offerId] = claim
        }
      }
    }
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Your claimed offers could not be loaded.'
  } finally { claimsLoading.value = false }
}
function scheduleReload() {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => { void loadOffers() }, 300)
}
function clearFilters() {
  searchInput.value = ''
  locationInput.value = ''
  category.value = ''
  discountType.value = ''
}
async function claimOffer(offerId: string) {
  claimingId.value = offerId
  claimErrors.value[offerId] = ''
  try {
    const result = await $fetch<{ claim: OfferClaim }>(`/api/offers/${offerId}/claim`, {
      method: 'POST', body: { proposalId: proposalId.value },
    })
    if (proposalId.value) {
      for (const claim of Object.values(claims.value)) {
        if (claim.offerId !== offerId && claim.proposalId === proposalId.value) claim.proposalId = null
      }
    }
    claims.value[offerId] = result.claim
    await generateQrCode(result.claim)
  } catch (error: any) {
    claimErrors.value[offerId] = error?.data?.statusMessage || 'The offer code could not be created.'
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

watch([searchInput, locationInput, category, discountType], scheduleReload)
onMounted(async () => {
  await Promise.all([loadOffers(), loadClaims()])
  clock = setInterval(() => { now.value = Date.now() }, 1000)
})
onBeforeUnmount(() => {
  if (clock) clearInterval(clock)
  if (filterTimer) clearTimeout(filterTimer)
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-4 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-6xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Plan something together</p>
      <h1 class="mt-2 text-4xl font-semibold">Date-friendly offers</h1>
      <p class="mt-3 max-w-2xl leading-7 text-[#6E4D58]">Find an offer, open it for the full terms, and attach it when you are ready.</p>

      <div v-if="proposalId" class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-[#EAF2DE] p-4">
        <div><p class="text-sm font-semibold text-[#52713A]">Choose an offer for your confirmed date</p><p class="mt-1 text-xs text-[#4D2F39]">You can attach one offer. Your date will not see your private redemption code.</p></div>
        <NuxtLink to="/matches" class="text-sm font-semibold text-[#52713A] hover:underline">Back to matches</NuxtLink>
      </div>

      <section v-if="pinnedClaims.length" class="mt-7 rounded-lg border border-[#C9D8B5] bg-[#EAF2DE] p-5">
        <h2 class="text-xl font-semibold">{{ proposalId ? 'Offer attached to this date' : 'Your active offers' }}</h2>
        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <details v-for="claim in pinnedClaims" :key="claim.id" class="rounded-lg bg-white p-4" @toggle="revealClaimQr($event, claim)">
            <summary class="cursor-pointer list-none">
              <div class="flex items-start justify-between gap-3"><div><p class="text-xs font-bold uppercase tracking-wide text-[#8F1839]">{{ claim.businessName }}</p><h3 class="mt-1 font-semibold">{{ claim.offerTitle }}</h3><p class="mt-1 text-sm font-bold text-[#52713A]">{{ discountLabel(claim) }}</p></div><ChevronDown class="mt-2 size-5 shrink-0 text-[#6E4D58]" /></div>
              <p class="mt-2 text-xs text-[#6E4D58]">{{ claim.venueName }}</p>
            </summary>
            <div class="mt-4 border-t border-[#E8D8C4] pt-4">
              <p v-if="claimStatus(claim) === 'redeemed'" class="flex items-center gap-2 text-sm font-semibold text-[#52713A]"><BadgeCheck class="size-5" />Offer redeemed for this date</p>
              <p v-else-if="claimStatus(claim) === 'revoked'" class="rounded-lg bg-[#F3E8DA] p-3 text-sm text-[#6E4D58]">This claim is no longer available.</p>
              <template v-else-if="claimStatus(claim) === 'issued'">
                <p class="flex items-center gap-2 text-sm font-semibold text-[#8F1839]"><TicketCheck class="size-5" />{{ claim.code ? 'Ask the venue to scan this code' : 'Your date has the active redemption code' }}</p>
                <div v-if="qrCodes[claim.id]" class="mt-3 rounded-lg bg-white p-2 text-center"><img :src="qrCodes[claim.id]" :alt="`QR redemption code for ${claim.offerTitle}`" class="mx-auto size-44 max-w-full" width="176" height="176"></div>
                <button v-if="claim.code" type="button" class="mt-3 w-full rounded-lg bg-[#FCE3E8] px-3 py-3 font-mono text-base font-bold tracking-wider" @click="copyCode(claim)">{{ claim.code }}</button>
                <p class="mt-2 flex items-center gap-1 text-xs text-[#6E4D58]"><Clock3 class="size-3.5" />Expires {{ new Date(claim.expiresAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) }}</p>
              </template>
              <button v-else-if="proposalId && claimStatus(claim) === 'expired'" type="button" :disabled="claimingId === claim.offerId" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" @click="claimOffer(claim.offerId)">{{ claimingId === claim.offerId ? 'Creating code…' : 'Get a new code' }}</button>
              <p v-if="claim.terms" class="mt-3 rounded-lg bg-[#F3E8DA] p-3 text-xs leading-5 text-[#6E4D58]">Terms: {{ claim.terms }}</p>
              <p v-if="claimErrors[claim.offerId]" class="mt-3 text-xs font-semibold text-[#8F1839]" role="alert">{{ claimErrors[claim.offerId] }}</p>
            </div>
          </details>
        </div>
      </section>

      <section class="mt-7 rounded-lg bg-white p-4 shadow-[0_10px_24px_rgba(180,35,74,0.07)] sm:p-5" aria-label="Filter offers">
        <div class="grid gap-3 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr]">
          <label class="text-sm font-semibold">
            Search offers
            <span class="relative block">
              <Search aria-hidden="true" class="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[#6E4D58]" />
              <input v-model="searchInput" class="filter-field search-field" placeholder="Offer, business or venue">
            </span>
          </label>
          <label class="text-sm font-semibold">Location<input v-model="locationInput" class="filter-field" placeholder="City or postcode"></label>
          <label class="text-sm font-semibold">Category<select v-model="category" class="filter-field"><option value="">All categories</option><option v-for="option in categoryOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
          <label class="text-sm font-semibold">Discount<select v-model="discountType" class="filter-field"><option value="">Any discount</option><option value="percentage">Percentage</option><option value="fixed">Money off</option></select></label>
        </div>
        <div class="mt-3 flex items-center justify-between gap-3"><p class="text-xs text-[#6E4D58]">{{ catalogueLoading ? 'Updating offers…' : `${offers.length} offer${offers.length === 1 ? '' : 's'} shown` }}</p><button v-if="hasFilters" type="button" class="inline-flex items-center gap-1 text-xs font-semibold text-[#8F1839]" @click="clearFilters"><X class="size-3.5" />Clear filters</button></div>
      </section>

      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      <div v-if="catalogueLoading && !offers.length" class="mt-6 rounded-lg bg-white p-8 text-[#6E4D58]">Loading offers…</div>
      <div v-else-if="offers.length" class="mt-6 grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article v-for="offer in offers" :key="offer.id" class="rounded-lg bg-white p-4 shadow-[0_8px_20px_rgba(180,35,74,0.07)]">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0"><p class="truncate text-xs font-bold uppercase tracking-wide text-[#8F1839]">{{ offer.businessName }}</p><h2 class="mt-1 text-lg font-semibold">{{ offer.title }}</h2></div>
            <BadgePercent class="size-5 shrink-0 text-[#B4234A]" />
          </div>
          <p class="mt-2 text-base font-bold text-[#52713A]">{{ discountLabel(offer) }}</p>
          <p class="mt-2 flex items-start gap-1 text-xs font-semibold text-[#6E4D58]"><MapPin class="mt-0.5 size-3.5 shrink-0" />{{ offerLocationLabel(offer) }}</p>
          <p v-if="attachedToCurrentDate(claims[offer.id])" class="mt-3 inline-flex items-center gap-1 rounded-full bg-[#EAF2DE] px-2.5 py-1 text-xs font-semibold text-[#52713A]"><BadgeCheck class="size-3.5" />Attached</p>
          <details class="mt-4 border-t border-[#E8D8C4] pt-3" @toggle="revealClaimQr($event, claims[offer.id])">
            <summary class="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-[#8F1839]">View details <ChevronDown class="size-4" /></summary>
            <div class="mt-4">
              <p v-if="offer.description" class="text-sm leading-6 text-[#4D2F39]">{{ offer.description }}</p>
              <details v-if="offer.locationCount > 1" class="mt-3 rounded-lg bg-[#FBF7F1] px-3 py-2 text-xs text-[#6E4D58]"><summary class="cursor-pointer font-semibold text-[#4D2F39]">Participating locations</summary><ul class="mt-2 grid gap-1.5"><li v-for="venue in offer.venues" :key="venue.id">{{ venue.name }} · {{ venue.city }}, {{ venue.postcode }}</li></ul><p v-if="offer.locationCount > offer.venues.length" class="mt-2 font-semibold">And {{ offer.locationCount - offer.venues.length }} more locations.</p></details>
              <p v-if="offer.terms" class="mt-3 rounded-lg bg-[#F3E8DA] p-3 text-xs leading-5 text-[#6E4D58]">Terms: {{ offer.terms }}</p>
              <div class="mt-4">
                <p v-if="claimStatus(claims[offer.id]) === 'redeemed'" class="flex items-center gap-2 rounded-lg bg-[#EAF2DE] p-3 text-sm font-semibold text-[#52713A]"><BadgeCheck class="size-5" />{{ proposalId ? 'Offer redeemed for this date' : 'Used on a previous confirmed date' }}</p>
                <p v-else-if="claimStatus(claims[offer.id]) === 'revoked'" class="rounded-lg bg-[#F3E8DA] p-3 text-sm text-[#6E4D58]">This claim is no longer available.</p>
                <button v-else-if="proposalId && !attachedToCurrentDate(claims[offer.id])" type="button" :disabled="claimingId === offer.id" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" @click="claimOffer(offer.id)"><TicketCheck class="mr-1 inline size-4" />{{ claimingId === offer.id ? 'Attaching offer…' : currentAttachedClaim ? 'Replace attached offer' : 'Attach this offer' }}</button>
                <template v-else-if="claimStatus(claims[offer.id]) === 'issued'">
                  <p class="flex items-center gap-2 text-sm font-semibold text-[#8F1839]"><TicketCheck class="size-5" />{{ claims[offer.id].code ? 'Ask the venue to scan this code' : 'Your date has the active redemption code' }}</p>
                  <div v-if="qrCodes[claims[offer.id].id]" class="mt-3 text-center"><img :src="qrCodes[claims[offer.id].id]" :alt="`QR redemption code for ${offer.title}`" class="mx-auto size-44 max-w-full" width="176" height="176"></div>
                  <button v-if="claims[offer.id].code" type="button" class="mt-3 w-full rounded-lg bg-[#FCE3E8] px-3 py-3 font-mono font-bold tracking-wider" title="Copy redemption code" @click="copyCode(claims[offer.id])">{{ claims[offer.id].code }}</button>
                  <button v-if="claims[offer.id].code" type="button" class="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#8F1839]" @click="copyCode(claims[offer.id])"><Copy class="size-3.5" />{{ copiedClaimId === claims[offer.id].id ? 'Copied' : 'Copy code' }}</button>
                </template>
                <NuxtLink v-else-if="!proposalId" to="/matches" class="inline-flex items-center gap-2 rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold text-[#8F1839]"><TicketCheck class="size-4" />Choose a confirmed date</NuxtLink>
                <button v-else type="button" :disabled="claimingId === offer.id" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" @click="claimOffer(offer.id)">{{ claimingId === offer.id ? 'Creating code…' : 'Get a new code' }}</button>
                <p v-if="!claims[offer.id]" class="mt-2 text-xs leading-5 text-[#6E4D58]">Codes expire after 15 minutes and each offer can be redeemed once per confirmed couple date.</p>
                <p v-if="claimErrors[offer.id]" class="mt-3 text-xs font-semibold text-[#8F1839]" role="alert">{{ claimErrors[offer.id] }}</p>
              </div>
            </div>
          </details>
        </article>
      </div>
      <div v-else-if="!catalogueLoading" class="mt-6 rounded-lg bg-white p-8 text-center">
        <Search v-if="hasFilters" class="mx-auto size-8 text-[#B4234A]" /><Store v-else class="mx-auto size-8 text-[#B4234A]" />
        <h2 class="mt-3 text-xl font-semibold">{{ hasFilters ? 'No offers match those filters' : 'No approved offers yet' }}</h2>
        <button v-if="hasFilters" type="button" class="mt-4 text-sm font-semibold text-[#8F1839] underline" @click="clearFilters">Clear filters</button>
        <p v-else class="mt-2 text-sm text-[#6E4D58]">Check again as more date-friendly venues join.</p>
      </div>
      <div v-if="hasMore" class="mt-6 text-center"><button type="button" :disabled="loadingMore" class="rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="loadOffers(true)">{{ loadingMore ? 'Loading…' : 'Load more offers' }}</button></div>
      <p v-if="claimsLoading" class="mt-4 text-center text-xs text-[#6E4D58]">Checking your active offers…</p>
    </section>
  </main>
</template>

<style scoped>
.filter-field { margin-top: .3rem; width: 100%; border-radius: .5rem; border: 1px solid #E8D8C4; background: #FBF7F1; padding: .7rem .8rem; font-size: .875rem; outline: none; }
.filter-field.search-field { padding-left: 2.5rem; }
.filter-field:focus { border-color: #B4234A; box-shadow: 0 0 0 3px rgba(180,35,74,.12); }
details[open] > summary svg { transform: rotate(180deg); }
summary svg { transition: transform .2s ease; }
</style>
