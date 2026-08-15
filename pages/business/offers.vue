<script setup lang="ts">
import { Archive, BadgePercent, Eye, MapPin, Pencil, Plus, RotateCcw, Store, X } from '@lucide/vue'
import type { BusinessOfferApprovalStatus, BusinessVenueStatus } from '~/types/api/businessSubmissions'

definePageMeta({ title: 'Business offers · Lonely Radish', middleware: 'business-only' })

type VenueScope = 'single' | 'selected' | 'all'
type Venue = { id: string; name: string; city: string; postcode: string; status: BusinessVenueStatus }
type Business = { name: string; status: 'draft' | 'pending' | 'active' | 'paused' | 'suspended'; role: 'owner' | 'manager' | 'staff'; plan: 'standard' | 'featured' | null; venues: Venue[] }
type Offer = {
    id: string
    title: string
    description: string | null
    terms: string | null
    discountType: 'percentage' | 'fixed'
    discountValue: number
    active: boolean
    approvalStatus: BusinessOfferApprovalStatus
    rejectionNote: string | null
    venueScope: VenueScope
    venueIds: string[]
    venueCount: number
    redemptionLimitTotal: number | null
    redemptionLimitPerUser: number
    revision: number
    archivedAt: string | null
}

const business = ref<Business | null>(null)
const offers = ref<Offer[]>([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const editingOfferId = ref<string | null>(null)
const lifecycleSavingId = ref('')
const venueSearch = ref('')
const previewOffer = ref<Offer | null>(null)
const form = reactive({
    venueScope: 'single' as VenueScope,
    venueId: '',
    venueIds: [] as string[],
    title: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    terms: '',
    redemptionLimitTotal: null as number | null,
    redemptionLimitPerUser: 1,
})

const offerLimit = computed(() => business.value?.plan === 'featured' ? 10 : business.value?.plan === 'standard' ? 5 : 1)
const availableVenues = computed(() => business.value?.venues.filter(venue => venue.status !== 'archived') || [])
const countedOffers = computed(() => offers.value.filter(offer => offer.approvalStatus !== 'archived').length)
const canManage = computed(() => business.value?.role === 'owner' || business.value?.role === 'manager')
const filteredVenues = computed(() => {
    const query = venueSearch.value.trim().toLowerCase()
    if (!query) return availableVenues.value
    return availableVenues.value.filter(venue =>
        `${venue.name} ${venue.city} ${venue.postcode}`.toLowerCase().includes(query)) || []
})
const locationSelectionValid = computed(() => {
    if (form.venueScope === 'all') return Boolean(availableVenues.value.length)
    if (form.venueScope === 'selected') return form.venueIds.length > 0
    return Boolean(form.venueId)
})
const submitLabel = computed(() => {
    if (saving.value) return 'Creating…'
    if (!editingOfferId.value && countedOffers.value >= offerLimit.value) return 'Offer limit reached'
    return editingOfferId.value ? 'Save changes' : 'Create campaign'
})

function locationLabel(offer: Offer) {
    if (offer.venueScope === 'all') return `All locations (${offer.venueCount} currently)`
    const selected = business.value?.venues.filter(venue => offer.venueIds.includes(venue.id)) || []
    if (offer.venueScope === 'selected') return `${selected.length} selected ${selected.length === 1 ? 'location' : 'locations'}`
    return selected[0]?.name || 'One location'
}

function previewVenues(offer: Offer) {
    const venues = business.value?.venues || []
    if (offer.venueScope === 'all') return venues.filter(venue => venue.status === 'active')
    return venues.filter(venue => offer.venueIds.includes(venue.id) && venue.status === 'active')
}

function customerLocationLabel(offer: Offer) {
    const venues = previewVenues(offer)
    if (offer.venueCount === 1 && venues[0]) return `${venues[0].name}, ${venues[0].city}`
    if (offer.venueCount > 1) return `${offer.venueCount} participating locations`
    return 'No approved participating locations yet'
}

function discountLabel(offer: Offer) {
    return offer.discountType === 'percentage' ? `${offer.discountValue}% off` : `£${offer.discountValue} off`
}

function closePreview() {
    previewOffer.value = null
}

function handlePreviewKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') closePreview()
}

function canPublish(offer: Offer) {
    return business.value?.status === 'active' && offer.approvalStatus === 'approved' && offer.venueCount > 0
}

function resetForm() {
    editingOfferId.value = null
    Object.assign(form, {
        venueScope: 'single',
        venueId: availableVenues.value[0]?.id || '',
        venueIds: [],
        title: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        terms: '',
        redemptionLimitTotal: null,
        redemptionLimitPerUser: 1,
    })
}

function editOffer(offer: Offer) {
    editingOfferId.value = offer.id
    Object.assign(form, {
        venueScope: offer.venueScope,
        venueId: offer.venueScope === 'single' ? offer.venueIds[0] || '' : '',
        venueIds: offer.venueScope === 'selected' ? [...offer.venueIds] : [],
        title: offer.title,
        description: offer.description || '',
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        terms: offer.terms || '',
        redemptionLimitTotal: offer.redemptionLimitTotal,
        redemptionLimitPerUser: offer.redemptionLimitPerUser,
    })
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

async function load() {
    const [me, result] = await Promise.all([
        $fetch<{ business: Business | null }>('/api/business/me'),
        $fetch<{ offers: Offer[] }>('/api/business/offers'),
    ])
    business.value = me.business
    offers.value = result.offers
    form.venueId ||= availableVenues.value[0]?.id || ''
}

async function addOffer() {
    saving.value = true
    errorMessage.value = ''
    successMessage.value = ''
    try {
        const wasEditing = Boolean(editingOfferId.value)
        const endpoint = editingOfferId.value ? `/api/business/offers/${editingOfferId.value}` : '/api/business/offers'
        const result = await $fetch<{ approvalReset?: boolean }>(endpoint, { method: editingOfferId.value ? 'PATCH' : 'POST',
            body: { ...form, venueIds: [...form.venueIds] } })
        successMessage.value = wasEditing
            ? result.approvalReset ? 'Material changes saved as a draft. Resubmit the offer when ready.' : 'Offer settings saved without changing its approval.'
            : form.venueScope === 'all'
            ? 'Offer created for every current and future approved location.'
            : 'Offer created and sent through the normal review process.'
        resetForm()
        await load()
    } catch (error: any) {
        errorMessage.value = error?.data?.statusMessage || 'The offer could not be saved.'
    } finally {
        saving.value = false
    }
}

async function lifecycleAction(offer: Offer, action: 'archive' | 'resubmit') {
    if (action === 'archive' && !window.confirm(`Archive “${offer.title}”? It will stop being public immediately.`)) return
    lifecycleSavingId.value = offer.id
    errorMessage.value = ''
    successMessage.value = ''
    try {
        await $fetch(`/api/business/offers/${offer.id}/${action}`, { method: 'POST' })
        if (editingOfferId.value === offer.id) resetForm()
        successMessage.value = action === 'archive' ? 'Offer archived.' : 'Offer submitted for review.'
        await load()
    } catch (error: any) {
        errorMessage.value = error?.data?.statusMessage || 'The offer lifecycle could not be updated.'
    } finally { lifecycleSavingId.value = '' }
}

async function toggleOffer(offer: Offer) {
    errorMessage.value = ''
    try {
        const result = await $fetch<{ active: boolean }>(`/api/business/offers/${offer.id}`, {
            method: 'PUT', body: { active: !offer.active },
        })
        offer.active = result.active
    } catch (error: any) {
        errorMessage.value = error?.data?.statusMessage || 'The offer could not be updated.'
    }
}

onMounted(() => {
    window.addEventListener('keydown', handlePreviewKeydown)
    void load()
        .catch((error: any) => { errorMessage.value = error?.data?.statusMessage || 'Offers could not be loaded.' })
        .finally(() => { loading.value = false })
})
onBeforeUnmount(() => window.removeEventListener('keydown', handlePreviewKeydown))
</script>

<template>
    <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
        <section class="mx-auto max-w-5xl">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Business dashboard</p>
            <h1 class="mt-2 text-4xl font-semibold">Your offers</h1>
            <p class="mt-3 text-[#6E4D58]">Your {{ business?.plan || 'free' }} plan allows {{ offerLimit }}
                {{ offerLimit === 1 ? 'offer' : 'offers' }}. One offer can cover one, selected, or all
                locations.</p>

            <div v-if="loading" class="mt-8 text-[#6E4D58]">Loading offers…</div>
            <template v-else-if="business">
                <div v-if="offers.length" class="mt-8 grid gap-3">
                    <article v-for="offer in offers" :key="offer.id"
                        class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
                        <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div class="flex items-center gap-2">
                                    <BadgePercent class="size-5 text-[#B4234A]" />
                                    <h2 class="text-lg font-semibold">{{ offer.title }}</h2>
                                </div>
                                <p class="mt-2 text-sm text-[#6E4D58]">
                                    {{ offer.discountType === 'percentage' ? `${offer.discountValue}% off` :
                                        `£${offer.discountValue} off` }}
                                </p>
                                <p class="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-[#4D2F39]">
                                    <MapPin class="size-4 text-[#B4234A]" />{{ locationLabel(offer) }}
                                </p>
                                <p v-if="offer.description" class="mt-2 text-sm">{{ offer.description }}</p>
                                <span class="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize"
                                    :class="offer.approvalStatus === 'approved' ? 'bg-[#EAF2DE] text-[#52713A]' : ['rejected','archived'].includes(offer.approvalStatus) ? 'bg-[#FCE3E8] text-[#8F1839]' : 'bg-[#FFF1C7] text-[#694C00]'">
                                    {{ offer.approvalStatus }}
                                </span>
                                <p v-if="offer.rejectionNote" class="mt-2 text-xs text-[#8F1839]">Review note: {{
                                    offer.rejectionNote }}</p>
                                <p class="mt-2 text-xs text-[#6E4D58]">Limit: {{ offer.redemptionLimitTotal || 'Unlimited' }} total · {{ offer.redemptionLimitPerUser }} per customer</p>
                            </div>
                            <div class="flex flex-wrap justify-end gap-2">
                                <button type="button"
                                    class="rounded-lg border border-[#B4234A]/20 bg-white px-3 py-2 text-sm font-semibold text-[#8F1839]"
                                    @click="previewOffer = offer"><Eye class="mr-1 inline size-4" />Preview</button>
                                <button v-if="canManage && offer.approvalStatus !== 'archived'" type="button"
                                    class="rounded-lg bg-[#F3E8DA] px-3 py-2 text-sm font-semibold text-[#4D2F39]"
                                    @click="editOffer(offer)"><Pencil class="mr-1 inline size-4" />Edit</button>
                                <button v-if="canManage && ['draft','rejected','archived'].includes(offer.approvalStatus)" type="button"
                                    :disabled="lifecycleSavingId === offer.id"
                                    class="rounded-lg bg-[#FFF1C7] px-3 py-2 text-sm font-semibold text-[#694C00] disabled:opacity-50"
                                    @click="lifecycleAction(offer, 'resubmit')"><RotateCcw class="mr-1 inline size-4" />Resubmit</button>
                                <button v-if="canManage && (offer.approvalStatus === 'approved' || offer.active)" type="button"
                                    :disabled="!offer.active && !canPublish(offer)"
                                    :title="!offer.active && !canPublish(offer) ? 'Business, offer and venue approval are required before publishing' : undefined"
                                    class="rounded-lg px-3 py-2 text-sm font-semibold hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50"
                                    :class="offer.active ? 'bg-[#EAF2DE] text-[#52713A]' : 'bg-[#F3E8DA] text-[#8F1839]'"
                                    @click="toggleOffer(offer)">{{ offer.active ? 'Active · Pause' : 'Activate' }}</button>
                                <button v-if="canManage && offer.approvalStatus !== 'archived'" type="button"
                                    :disabled="lifecycleSavingId === offer.id"
                                    class="rounded-lg bg-[#FCE3E8] px-3 py-2 text-sm font-semibold text-[#8F1839] disabled:opacity-50"
                                    @click="lifecycleAction(offer, 'archive')"><Archive class="mr-1 inline size-4" />Archive</button>
                            </div>
                        </div>
                    </article>
                </div>

                <form v-if="canManage" class="mt-6 rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]"
                    @submit.prevent="addOffer">
                    <div class="flex items-center gap-2">
                        <Plus class="size-5 text-[#B4234A]" />
                        <h2 class="text-xl font-semibold">{{ editingOfferId ? 'Edit offer' : 'Create an offer' }}</h2>
                        <button v-if="editingOfferId" type="button" class="ml-auto text-sm font-semibold text-[#8F1839]"
                            @click="resetForm"><X class="mr-1 inline size-4" />Cancel edit</button>
                    </div>
                    <div class="mt-5 grid gap-4 sm:grid-cols-2">
                        <label class="text-sm font-semibold">Offer title
                            <input v-model="form.title" maxlength="120" required class="field"
                                placeholder="20% off coffee for two">
                        </label>
                        <label class="text-sm font-semibold">Discount type
                            <select v-model="form.discountType" class="field">
                                <option value="percentage">Percentage</option>
                                <option value="fixed">Fixed amount</option>
                            </select>
                        </label>
                        <label class="text-sm font-semibold">Discount value
                            <input v-model.number="form.discountValue" required min="0.01"
                                :max="form.discountType === 'percentage' ? 100 : 10000" step="0.01" type="number"
                                class="field">
                        </label>
                        <label class="text-sm font-semibold sm:col-span-2">Description
                            <textarea v-model="form.description" maxlength="500" rows="3" class="field resize-none"
                                placeholder="Explain what the date receives."></textarea>
                            <span class="counter">{{ form.description.length }}/500</span>
                        </label>

                        <fieldset class="sm:col-span-2">
                            <legend class="text-sm font-semibold">Where can customers use this offer?</legend>
                            <div class="mt-2 grid gap-2 md:grid-cols-3">
                                <label class="scope-choice"
                                    :class="form.venueScope === 'single' ? 'scope-choice-active' : ''">
                                    <input v-model="form.venueScope" type="radio" value="single"
                                        class="mt-1 accent-[#B4234A]">
                                    <span><strong class="block">One location</strong><span class="scope-help">A
                                            location-specific offer.</span></span>
                                </label>
                                <label class="scope-choice"
                                    :class="form.venueScope === 'selected' ? 'scope-choice-active' : ''">
                                    <input v-model="form.venueScope" type="radio" value="selected"
                                        class="mt-1 accent-[#B4234A]">
                                    <span><strong class="block">Selected locations</strong><span
                                            class="scope-help">Choose participating branches.</span></span>
                                </label>
                                <label class="scope-choice"
                                    :class="form.venueScope === 'all' ? 'scope-choice-active' : ''">
                                    <input v-model="form.venueScope" type="radio" value="all"
                                        class="mt-1 accent-[#B4234A]">
                                    <span><strong class="block">All locations</strong><span class="scope-help">Includes
                                            future approved branches automatically.</span></span>
                                </label>
                            </div>
                        </fieldset>

                        <label v-if="form.venueScope === 'single'" class="text-sm font-semibold sm:col-span-2">Location
                            <select v-model="form.venueId" required class="field">
                                <option v-for="venue in business.venues" :key="venue.id" :value="venue.id">
                                    {{ venue.name }} · {{ venue.city }} · {{ venue.status }}
                                </option>
                            </select>
                        </label>

                        <div v-else-if="form.venueScope === 'selected'" class="sm:col-span-2">
                            <div class="flex items-end justify-between gap-3">
                                <label class="flex-1 text-sm font-semibold">Find your venues
                                    <input v-model="venueSearch" class="field"
                                        placeholder="Search name, city or postcode">
                                </label>
                                <p class="pb-3 text-xs font-semibold text-[#6E4D58]">{{ form.venueIds.length }} selected
                                </p>
                            </div>
                            <div
                                class="mt-3 grid max-h-72 gap-2 overflow-y-auto rounded-lg border border-[#E8D8C4] p-3 sm:grid-cols-2">
                                <label v-for="venue in filteredVenues" :key="venue.id"
                                    class="flex items-start gap-2 rounded-lg bg-[#FBF7F1] p-3 text-sm">
                                    <input v-model="form.venueIds" type="checkbox" :value="venue.id"
                                        class="mt-0.5 size-4 accent-[#B4234A]">
                                    <span><strong class="block">{{ venue.name }}</strong><span
                                            class="text-xs text-[#6E4D58]">
                                            {{ venue.city }}, {{ venue.postcode }} · {{ venue.status }}</span></span>
                                </label>
                                <p v-if="!filteredVenues.length" class="p-3 text-sm text-[#6E4D58]">No matching
                                    locations.</p>
                            </div>
                        </div>

                        <div v-else class="rounded-lg bg-[#EAF2DE] p-4 text-sm sm:col-span-2">
                            <strong>Every approved location</strong>
                            <p class="mt-1 text-[#4D2F39]">New locations join this campaign automatically after
                                approval.</p>
                        </div>

                        <label class="text-sm font-semibold sm:col-span-2">Terms and exclusions
                            <textarea v-model="form.terms" maxlength="500" rows="3" class="field resize-none"
                                placeholder="For example: Monday–Thursday, dine-in only, cannot be combined."></textarea>
                            <span class="counter">{{ form.terms.length }}/500</span>
                        </label>
                        <label class="text-sm font-semibold">Maximum total redemptions
                            <input v-model.number="form.redemptionLimitTotal" type="number" min="1" max="1000000"
                                class="field" placeholder="Unlimited">
                            <span class="mt-1 block text-xs font-normal text-[#6E4D58]">Leave empty for no campaign-wide cap.</span>
                        </label>
                        <label class="text-sm font-semibold">Maximum per customer
                            <input v-model.number="form.redemptionLimitPerUser" type="number" min="1" max="100"
                                required class="field">
                            <span class="mt-1 block text-xs font-normal text-[#6E4D58]">Applies across all of their confirmed dates.</span>
                        </label>
                        <p class="rounded-lg bg-[#EAF2DE] p-4 text-sm sm:col-span-2"><strong class="block">Approval before publication</strong>The offer is submitted inactive. After the business, participating venue and offer are approved, activate it above.</p>
                    </div>
                    <button type="submit" :disabled="saving || (!editingOfferId && countedOffers >= offerLimit) || !locationSelectionValid"
                        class="mt-5 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                        {{ submitLabel }}
                    </button>
                    <NuxtLink v-if="countedOffers >= offerLimit && offerLimit < 10" to="/business/pricing"
                        class="ml-3 text-sm font-semibold text-[#8F1839] hover:underline">Compare plans</NuxtLink>
                </form>
            </template>

            <p v-if="successMessage" class="mt-5 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#52713A]"
                role="status">
                {{ successMessage }}
            </p>
            <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]"
                role="alert">
                {{ errorMessage }}
            </p>
            <NuxtLink to="/business"
                class="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#8F1839] hover:underline">
                <Store class="size-4" />Back to business dashboard
            </NuxtLink>
        </section>

        <div v-if="previewOffer" class="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1520]/55 p-4"
            role="dialog" aria-modal="true" aria-labelledby="offer-preview-title" @click.self="closePreview">
            <section class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-[#FBF7F1] p-5 shadow-2xl sm:p-6">
                <div class="flex items-start justify-between gap-4">
                    <div>
                        <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Customer preview</p>
                        <h2 id="offer-preview-title" class="mt-1 text-xl font-semibold">How your offer will appear</h2>
                    </div>
                    <button type="button" class="rounded-full bg-white p-2 text-[#6E4D58] hover:text-[#2A1520]"
                        aria-label="Close offer preview" @click="closePreview"><X class="size-5" /></button>
                </div>
                <p class="mt-4 rounded-lg bg-[#FFF1C7] p-3 text-xs leading-5 text-[#694C00]">
                    This is a preview only. Customers can see the offer after its approvals are complete and you activate it.
                </p>

                <article class="mt-4 rounded-lg bg-white p-4 shadow-[0_8px_20px_rgba(180,35,74,0.07)]">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0">
                            <p class="truncate text-xs font-bold uppercase tracking-wide text-[#8F1839]">{{ business?.name }}</p>
                            <h3 class="mt-1 text-lg font-semibold">{{ previewOffer.title }}</h3>
                        </div>
                        <BadgePercent class="size-5 shrink-0 text-[#B4234A]" />
                    </div>
                    <p class="mt-2 text-base font-bold text-[#52713A]">{{ discountLabel(previewOffer) }}</p>
                    <p class="mt-2 flex items-start gap-1 text-xs font-semibold text-[#6E4D58]">
                        <MapPin class="mt-0.5 size-3.5 shrink-0" />{{ customerLocationLabel(previewOffer) }}
                    </p>
                    <div class="mt-4 border-t border-[#E8D8C4] pt-4">
                        <p v-if="previewOffer.description" class="text-sm leading-6 text-[#4D2F39]">{{ previewOffer.description }}</p>
                        <p v-else class="text-sm italic text-[#8F6A76]">No description added.</p>
                        <div v-if="previewOffer.venueCount > 1" class="mt-3 rounded-lg bg-[#FBF7F1] px-3 py-2 text-xs text-[#6E4D58]">
                            <p class="font-semibold text-[#4D2F39]">Participating locations</p>
                            <ul class="mt-2 grid gap-1.5">
                                <li v-for="venue in previewVenues(previewOffer).slice(0, 5)" :key="venue.id">
                                    {{ venue.name }} · {{ venue.city }}, {{ venue.postcode }}
                                </li>
                            </ul>
                            <p v-if="previewOffer.venueCount > 5" class="mt-2 font-semibold">And {{ previewOffer.venueCount - 5 }} more locations.</p>
                        </div>
                        <p v-if="previewOffer.terms" class="mt-3 rounded-lg bg-[#F3E8DA] p-3 text-xs leading-5 text-[#6E4D58]">Terms: {{ previewOffer.terms }}</p>
                        <button type="button" disabled class="mt-4 inline-flex cursor-not-allowed items-center gap-2 rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold text-[#8F1839] opacity-70">
                            Choose a confirmed date
                        </button>
                    </div>
                </article>
            </section>
        </div>
    </main>
</template>

<style scoped>
.field {
    margin-top: .4rem;
    width: 100%;
    border-radius: .5rem;
    border: 1px solid #E8D8C4;
    background: #FBF7F1;
    padding: .75rem .9rem;
    outline: none;
}

.field:focus {
    border-color: #B4234A;
    box-shadow: 0 0 0 3px rgba(180, 35, 74, .14);
}

.counter {
    margin-top: .25rem;
    display: block;
    text-align: right;
    font-size: .75rem;
    font-weight: 400;
    color: #6E4D58;
}

.scope-choice {
    display: flex;
    align-items: flex-start;
    gap: .65rem;
    border: 1px solid #E8D8C4;
    border-radius: .5rem;
    padding: .8rem;
    font-size: .875rem;
}

.scope-choice-active {
    border-color: #B4234A;
    background: #FCE3E8;
}

.scope-help {
    margin-top: .2rem;
    display: block;
    color: #6E4D58;
    font-size: .75rem;
    line-height: 1.2rem;
}
</style>
