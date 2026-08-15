<script setup lang="ts">
import { Archive, Building2, MapPin, Pencil, Plus, RotateCcw, ShieldCheck, X } from '@lucide/vue'
import type { BusinessVenueStatus } from '~/types/api/businessSubmissions'

definePageMeta({ title: 'Business venues · Lonely Radish', middleware: 'business-only' })

type Venue = {
    id: string
    name: string
    category: string
    addressLine: string
    city: string
    postcode: string
    status: BusinessVenueStatus
    rejectionNote: string | null
    revision: number
    archivedAt: string | null
}
type Business = {
    id: string
    name: string
    status: 'draft' | 'pending' | 'active' | 'paused' | 'suspended'
    role: 'owner' | 'manager' | 'staff'
    venues: Venue[]
}

const business = ref<Business | null>(null)
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const editingVenueId = ref<string | null>(null)
const lifecycleSavingId = ref('')
const form = reactive({
    name: '',
    category: 'cafe',
    addressLine: '',
    city: '',
    postcode: '',
})
const canManage = computed(() => business.value?.role === 'owner' || business.value?.role === 'manager')

function resetForm() {
    editingVenueId.value = null
    Object.assign(form, { name: '', category: 'cafe', addressLine: '', city: '', postcode: '' })
}

function editVenue(venue: Venue) {
    editingVenueId.value = venue.id
    Object.assign(form, { name: venue.name, category: venue.category, addressLine: venue.addressLine,
        city: venue.city, postcode: venue.postcode })
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
}

async function load() {
    const result = await $fetch<{ business: Business | null }>('/api/business/me')
    business.value = result.business
}

async function addVenue() {
    saving.value = true
    errorMessage.value = ''
    successMessage.value = ''
    try {
        const wasEditing = Boolean(editingVenueId.value)
        const endpoint = editingVenueId.value ? `/api/business/venues/${editingVenueId.value}` : '/api/business/venues'
        const result = await $fetch<{ approvalReset?: boolean }>(endpoint, {
            method: editingVenueId.value ? 'PATCH' : 'POST', body: form,
        })
        resetForm()
        successMessage.value = wasEditing
            ? result.approvalReset ? 'Location changes saved as a draft. Resubmit it when ready.' : 'No location changes were needed.'
            : 'Location added and submitted for venue approval.'
        await load()
    } catch (error: any) {
        errorMessage.value = error?.data?.statusMessage || 'The location could not be saved.'
    } finally {
        saving.value = false
    }
}

async function lifecycleAction(venue: Venue, action: 'archive' | 'resubmit') {
    if (action === 'archive' && !window.confirm(`Archive “${venue.name}”? Offers with no other approved location will be paused.`)) return
    lifecycleSavingId.value = venue.id
    errorMessage.value = ''
    successMessage.value = ''
    try {
        await $fetch(`/api/business/venues/${venue.id}/${action}`, { method: 'POST' })
        if (editingVenueId.value === venue.id) resetForm()
        successMessage.value = action === 'archive' ? 'Location archived.' : 'Location submitted for review.'
        await load()
    } catch (error: any) {
        errorMessage.value = error?.data?.statusMessage || 'The location lifecycle could not be updated.'
    } finally { lifecycleSavingId.value = '' }
}

onMounted(() => load()
    .catch((error: any) => { errorMessage.value = error?.data?.statusMessage || 'Locations could not be loaded.' })
    .finally(() => { loading.value = false }))
</script>

<template>
    <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
        <section class="mx-auto max-w-5xl">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Business dashboard</p>
            <h1 class="mt-2 text-4xl font-semibold">Locations</h1>
            <p class="mt-3 max-w-2xl leading-7 text-[#6E4D58]">Add and manage each of your locations. We’ll review a new location before people can see it or use an offer there.</p>

            <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-[#6E4D58]">Loading locations…</div>
            <template v-else-if="business">
                <div class="mt-8 grid gap-4 sm:grid-cols-2">
                    <article v-for="venue in business.venues" :key="venue.id"
                        class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
                        <div class="flex items-start gap-3">
                            <MapPin class="mt-0.5 size-5 shrink-0 text-[#B4234A]" />
                            <div class="min-w-0 flex-1">
                                <h2 class="text-lg font-semibold">{{ venue.name }}</h2>
                                <p class="mt-1 text-sm leading-6 text-[#6E4D58]">{{ venue.addressLine }}, {{ venue.city
                                    }},
                                    {{ venue.postcode }}</p>
                                <div class="mt-3 flex flex-wrap gap-2">
                                    <span
                                        class="rounded-full bg-[#F3E8DA] px-2.5 py-1 text-xs font-semibold capitalize">{{
                                        venue.category }}</span>
                                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold capitalize"
                                        :class="venue.status === 'active' ? 'bg-[#EAF2DE] text-[#52713A]' : ['paused','rejected','archived'].includes(venue.status) ? 'bg-[#FCE3E8] text-[#8F1839]' : 'bg-[#FFF1C7] text-[#694C00]'">
                                        {{ venue.status }}
                                    </span>
                                </div>
                                <p v-if="venue.rejectionNote" class="mt-2 text-xs font-semibold text-[#8F1839]">Review note: {{ venue.rejectionNote }}</p>
                                <div v-if="canManage" class="mt-4 flex flex-wrap gap-2">
                                    <button v-if="venue.status !== 'archived'" type="button"
                                        class="rounded-lg bg-[#F3E8DA] px-3 py-2 text-xs font-semibold"
                                        @click="editVenue(venue)"><Pencil class="mr-1 inline size-3.5" />Edit</button>
                                    <button v-if="['draft','rejected','archived'].includes(venue.status)" type="button"
                                        :disabled="lifecycleSavingId === venue.id || business.status !== 'active'"
                                        class="rounded-lg bg-[#FFF1C7] px-3 py-2 text-xs font-semibold text-[#694C00] disabled:opacity-50"
                                        @click="lifecycleAction(venue, 'resubmit')"><RotateCcw class="mr-1 inline size-3.5" />Resubmit</button>
                                    <button v-if="venue.status !== 'archived'" type="button"
                                        :disabled="lifecycleSavingId === venue.id"
                                        class="rounded-lg bg-[#FCE3E8] px-3 py-2 text-xs font-semibold text-[#8F1839] disabled:opacity-50"
                                        @click="lifecycleAction(venue, 'archive')"><Archive class="mr-1 inline size-3.5" />Archive</button>
                                </div>
                            </div>
                        </div>
                    </article>
                </div>

                <section v-if="business.status !== 'active' && !editingVenueId"
                    class="mt-6 rounded-lg bg-[#FFF1C7] p-5 text-sm text-[#694C00]">
                    <ShieldCheck class="size-5" />
                    <p class="mt-2 font-semibold">{{ business.status === 'paused' ? 'Promotion has been temporarily paused.' : 'The initial business review must be completed first.' }}</p>
                    <p class="mt-1">{{ business.status === 'paused' ? 'Contact support for help resolving the review.' : 'Additional locations can be submitted after the business has been approved.' }}</p>
                </section>

                <form v-else-if="canManage"
                    class="mt-6 rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-8"
                    @submit.prevent="addVenue">
                    <div class="flex items-center gap-2">
                        <Plus class="size-5 text-[#B4234A]" />
                        <h2 class="text-xl font-semibold">{{ editingVenueId ? 'Edit location' : 'Add another location' }}</h2>
                        <button v-if="editingVenueId" type="button" class="ml-auto text-sm font-semibold text-[#8F1839]"
                            @click="resetForm"><X class="mr-1 inline size-4" />Cancel edit</button>
                    </div>
                    <p class="mt-2 text-sm text-[#6E4D58]">Once approved, this location will automatically join any offers that apply everywhere.</p>
                    <div class="mt-5 grid gap-4 sm:grid-cols-2">
                        <label class="text-sm font-semibold">Location name
                            <input v-model="form.name" minlength="2" maxlength="120" required class="field"
                                placeholder="For example, Camden High Street">
                        </label>
                        <label class="text-sm font-semibold">Venue type
                            <select v-model="form.category" class="field">
                                <option value="cafe">Café</option>
                                <option value="restaurant">Restaurant</option>
                                <option value="bar">Bar</option>
                                <option value="activity">Activity venue</option>
                                <option value="culture">Culture venue</option>
                                <option value="wellness">Wellness venue</option>
                                <option value="other">Other</option>
                            </select>
                        </label>
                        <label class="text-sm font-semibold sm:col-span-2">Address
                            <input v-model="form.addressLine" maxlength="200" required class="field"
                                autocomplete="street-address">
                        </label>
                        <label class="text-sm font-semibold">City
                            <input v-model="form.city" maxlength="100" required class="field"
                                autocomplete="address-level2">
                        </label>
                        <label class="text-sm font-semibold">Postcode
                            <input v-model="form.postcode" maxlength="16" required class="field"
                                autocomplete="postal-code">
                        </label>
                    </div>
                    <label class="mt-5 flex items-start gap-3 rounded-lg bg-[#EAF2DE] p-4 text-sm">
                        <input required type="checkbox" class="mt-1 size-4 accent-[#B4234A]">
                        <span>I confirm this is a genuine establishment operated by {{ business.name }} and the address
                            is accurate.</span>
                    </label>
                    <button type="submit" :disabled="saving"
                        class="mt-5 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                        {{ saving ? 'Saving location…' : editingVenueId ? 'Save location changes' : 'Add location for review' }}
                    </button>
                </form>

                <p v-else class="mt-6 rounded-lg bg-[#F3E8DA] p-5 text-sm text-[#6E4D58]">Owner or manager access is
                    required
                    to add locations.</p>
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
                <Building2 class="size-4" />Back to business dashboard
            </NuxtLink>
        </section>
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
</style>
