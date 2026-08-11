<script setup lang="ts">
import { BadgeCheck, Camera, CameraOff, History, MapPin, ScanLine, ShieldCheck } from '@lucide/vue'
import type QrScanner from 'qr-scanner'
import { trackProductEvent } from '~/utils/productAnalytics'
import type { OfferRedemptionResponse } from '~/types/api/offers'

definePageMeta({ title: 'Redeem offers · Lonely Radish', middleware: 'business-only' })

type Redemption = {
    offerTitle: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    terms: string | null
    businessName: string
    venueName: string
    redeemedAt: string
}

type Venue = {
    id: string
    name: string
    addressLine: string
    city: string
    postcode: string
    status: 'pending' | 'active' | 'paused'
}

type Business = {
    id: string
    venues: Venue[]
}

const code = ref('')
const business = ref<Business | null>(null)
const selectedVenueId = ref('')
const scannerVideo = ref<HTMLVideoElement | null>(null)
const scanning = ref(false)
const scannerStarting = ref(false)
const scannerError = ref('')
const scannerMessage = ref('')
const saving = ref(false)
const loading = ref(true)
const errorMessage = ref('')
const redemption = ref<Redemption | null>(null)
const summary = ref({ total: 0, last30Days: 0 })
const redemptions = ref<Redemption[]>([])
const activeVenues = computed(() => business.value?.venues.filter(venue => venue.status === 'active') || [])
const selectedVenue = computed(() => activeVenues.value.find(venue => venue.id === selectedVenueId.value) || null)
let scanner: QrScanner | null = null
let scanHandled = false
let redemptionAttempt: { signature: string; key: string } | null = null

function discountLabel(item: Pick<Redemption, 'discountType' | 'discountValue'>) {
    return item.discountType === 'percentage' ? `${item.discountValue}% off` : `£${item.discountValue} off`
}

function normalizeScannedCode(value: string) {
    const compact = value.trim().toUpperCase().replace(/[\s-]/g, '')
    if (!/^LR[A-HJ-NP-Z2-9]{12}$/.test(compact)) return null
    const token = compact.slice(2)
    return `LR-${token.slice(0, 4)}-${token.slice(4, 8)}-${token.slice(8)}`
}

function stopScanner() {
    scanner?.stop()
    scanner?.destroy()
    scanner = null
    scanning.value = false
    scannerStarting.value = false
}

function cancelScanner() {
    stopScanner()
    scannerError.value = ''
    scannerMessage.value = ''
}

async function handleScan(value: string) {
    if (scanHandled || saving.value) return
    const normalized = normalizeScannedCode(value)
    if (!normalized) {
        scannerError.value = 'That QR is not a Lonely Radish offer code. Try another code or enter it manually.'
        return
    }
    scanHandled = true
    scannerError.value = ''
    scannerMessage.value = 'Offer code found. Checking it now…'
    code.value = normalized
    stopScanner()
    try {
        await redeem()
    } finally {
        scanHandled = false
        scannerMessage.value = ''
    }
}

async function startScanner() {
    if (!selectedVenueId.value) {
        scannerError.value = 'Choose the venue serving the customer before scanning.'
        return
    }
    scannerError.value = ''
    scannerMessage.value = 'Starting the rear camera…'
    scannerStarting.value = true
    scanning.value = true
    await nextTick()
    try {
        if (!window.isSecureContext) {
            throw new Error('Camera scanning requires HTTPS or localhost.')
        }
        const { default: QrScannerClass } = await import('qr-scanner')
        if (!(await QrScannerClass.hasCamera())) throw new Error('No camera was found on this device.')
        if (!scannerVideo.value) throw new Error('The camera preview could not be opened.')
        scanner = new QrScannerClass(
            scannerVideo.value,
            result => { void handleScan(result.data) },
            {
                preferredCamera: 'environment',
                maxScansPerSecond: 10,
                highlightScanRegion: true,
                highlightCodeOutline: true,
                returnDetailedScanResult: true,
            },
        )
        await scanner.start()
        scannerMessage.value = 'Point the camera at the customer’s Lonely Radish QR code.'
    } catch (error) {
        stopScanner()
        const message = error instanceof Error ? error.message : String(error)
        scannerError.value = /permission|notallowed|denied/i.test(message)
            ? 'Camera permission was denied. Allow camera access in your browser settings or enter the code manually.'
            : message || 'The camera could not be started. Enter the code manually instead.'
        scannerMessage.value = ''
    } finally {
        scannerStarting.value = false
    }
}

async function loadRedemptions() {
    if (!selectedVenueId.value) {
        summary.value = { total: 0, last30Days: 0 }
        redemptions.value = []
        return
    }
    const result = await $fetch<{ summary: typeof summary.value; redemptions: Redemption[] }>('/api/business/offer-claims', {
        query: { venueId: selectedVenueId.value },
    })
    summary.value = result.summary
    redemptions.value = result.redemptions
}

async function changeVenue() {
    stopScanner()
    redemption.value = null
    errorMessage.value = ''
    if (business.value && selectedVenueId.value) {
        localStorage.setItem(`business-redemption-venue:${business.value.id}`, selectedVenueId.value)
    }
    loading.value = true
    try {
        await loadRedemptions()
    } catch (error: any) {
        errorMessage.value = error?.data?.statusMessage || 'Redemptions could not be loaded.'
    } finally { loading.value = false }
}

async function load() {
    const result = await $fetch<{ business: Business | null }>('/api/business/me')
    business.value = result.business
    if (!business.value) return
    const savedVenueId = localStorage.getItem(`business-redemption-venue:${business.value.id}`)
    selectedVenueId.value = activeVenues.value.some(venue => venue.id === savedVenueId)
        ? savedVenueId!
        : activeVenues.value[0]?.id || ''
    await loadRedemptions()
}

async function redeem() {
    saving.value = true
    errorMessage.value = ''
    redemption.value = null
    try {
        const signature = `${selectedVenueId.value}:${code.value.trim().toUpperCase()}`
        if (redemptionAttempt?.signature !== signature) {
            redemptionAttempt = { signature, key: crypto.randomUUID() }
        }
        const result = await $fetch<OfferRedemptionResponse>('/api/business/offer-claims/redeem', {
            method: 'POST', body: { code: code.value, venueId: selectedVenueId.value,
                idempotencyKey: redemptionAttempt.key },
        })
        redemption.value = result.redemption
        code.value = ''
        redemptionAttempt = null
        trackProductEvent('Offer Redeemed')
        await loadRedemptions()
    } catch (error: any) {
        errorMessage.value = error?.data?.statusMessage || 'The offer could not be redeemed.'
    } finally { saving.value = false }
}

onMounted(() => load()
    .catch((error: any) => { errorMessage.value = error?.data?.statusMessage || 'Redemptions could not be loaded.' })
    .finally(() => { loading.value = false }))
onBeforeUnmount(stopScanner)
</script>

<template>
    <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
        <section class="mx-auto max-w-5xl">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Business dashboard</p>
            <h1 class="mt-2 text-4xl font-semibold">Redeem an offer</h1>
            <p class="mt-3 max-w-2xl leading-7 text-[#6E4D58]">Choose the venue serving the customer, then enter the
                short-lived code shown on their device. A code works only at the venue assigned to its offer and can be
                accepted once.</p>

            <p v-if="!loading && !activeVenues.length"
                class="mt-6 rounded-lg bg-[#FFF1C7] p-4 text-sm font-semibold text-[#694C00]" role="alert">No active
                venue can redeem offers yet. An administrator must approve the venue first.</p>

            <div class="mt-8 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
                <form class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]"
                    @submit.prevent="redeem">
                    <div class="flex items-center gap-2">
                        <ScanLine class="size-6 text-[#B4234A]" />
                        <h2 class="text-xl font-semibold">Scan or enter a redemption code</h2>
                    </div>
                    <label class="mt-5 block text-sm font-semibold">Venue
                        <select v-model="selectedVenueId" required
                            class="mt-2 w-full rounded-lg border border-[#D8C8B6] bg-[#FBF7F1] px-4 py-3 outline-none focus:border-[#B4234A] focus:ring-4 focus:ring-[#B4234A]/10"
                            @change="changeVenue">
                            <option value="" disabled>Choose an active venue</option>
                            <option v-for="venue in activeVenues" :key="venue.id" :value="venue.id">{{ venue.name }} ·
                                {{ venue.postcode }}</option>
                        </select>
                    </label>
                    <div v-if="selectedVenue" class="mt-3 flex items-start gap-2 rounded-lg bg-[#F3E8DA] p-3 text-sm">
                        <MapPin class="mt-0.5 size-4 shrink-0 text-[#B4234A]" />
                        <span><strong class="block">This device is redeeming for {{ selectedVenue.name }}</strong><span
                                class="mt-0.5 block text-xs text-[#6E4D58]">{{ selectedVenue.addressLine }}, {{
                                    selectedVenue.city }}, {{ selectedVenue.postcode }}</span></span>
                    </div>

                    <div class="mt-5">
                        <p class="text-sm font-semibold">Customer QR code</p>
                        <button v-if="!scanning" type="button" :disabled="!selectedVenueId || saving"
                            class="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#52713A] px-5 py-3 font-semibold text-white disabled:opacity-50"
                            @click="startScanner">
                            <Camera class="size-5" />{{ scannerStarting ? 'Starting camera…' : 'Scan QR code' }}
                        </button>
                        <div v-else class="mt-2 overflow-hidden rounded-lg bg-[#2A1520] p-3">
                            <div class="relative overflow-hidden rounded-lg bg-black">
                                <video ref="scannerVideo" class="aspect-square w-full object-cover" playsinline muted />
                                <div
                                    class="pointer-events-none absolute inset-x-6 bottom-5 rounded-lg bg-black/70 px-3 py-2 text-center text-xs font-semibold text-white">
                                    Hold the QR code inside the square
                                </div>
                            </div>
                            <button type="button"
                                class="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
                                @click="cancelScanner">
                                <CameraOff class="size-4" />Stop camera
                            </button>
                        </div>
                        <p v-if="scannerMessage" class="mt-2 text-xs font-semibold text-[#52713A]" role="status">{{
                            scannerMessage }}</p>
                        <p v-if="scannerError" class="mt-2 text-xs font-semibold text-[#8F1839]" role="alert">{{
                            scannerError }}</p>
                        <p class="mt-2 text-xs leading-5 text-[#6E4D58]">Camera frames stay on this device and are used
                            only to read the code. Camera access requires HTTPS or localhost.</p>
                    </div>

                    <div class="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-wide text-[#6E4D58]">
                        <span class="h-px flex-1 bg-[#E8D8C4]" />or enter manually<span
                            class="h-px flex-1 bg-[#E8D8C4]" />
                    </div>
                    <label class="block text-sm font-semibold">Code
                        <input v-model="code" required maxlength="20" autocomplete="off" autocapitalize="characters"
                            spellcheck="false"
                            class="mt-2 w-full rounded-lg border border-[#D8C8B6] bg-[#FBF7F1] px-4 py-3 font-mono text-lg font-bold uppercase tracking-wider outline-none focus:border-[#B4234A] focus:ring-4 focus:ring-[#B4234A]/10"
                            placeholder="LR-ABCD-2345-WXYZ">
                    </label>
                    <button type="submit" :disabled="saving || !code.trim() || !selectedVenueId"
                        class="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                        <BadgeCheck class="size-4" />{{ saving ? 'Checking…' : 'Redeem offer' }}
                    </button>
                    <p v-if="errorMessage" class="mt-4 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]"
                        role="alert">{{ errorMessage }}</p>
                    <div v-if="redemption" class="mt-4 rounded-lg bg-[#EAF2DE] p-5" role="status">
                        <div class="flex items-center gap-2 font-semibold text-[#52713A]">
                            <BadgeCheck class="size-5" />Offer redeemed
                        </div>
                        <p class="mt-3 text-lg font-semibold">{{ redemption.offerTitle }}</p>
                        <p class="mt-1 font-bold text-[#52713A]">{{ discountLabel(redemption) }}</p>
                        <p class="mt-1 text-sm text-[#6E4D58]">{{ redemption.venueName }}</p>
                        <p v-if="redemption.terms" class="mt-3 text-xs leading-5 text-[#6E4D58]">Terms: {{
                            redemption.terms }}</p>
                    </div>
                </form>

                <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    <article class="rounded-lg bg-[#FCE3E8] p-5">
                        <p class="text-xs font-bold uppercase tracking-wide text-[#8F1839]">Last 30 days</p>
                        <p class="mt-2 text-3xl font-semibold">{{ summary.last30Days }}</p>
                        <p class="mt-1 text-sm text-[#6E4D58]">Verified at {{ selectedVenue?.name || 'this venue' }}</p>
                    </article>
                    <article class="rounded-lg bg-[#F3E8DA] p-5">
                        <p class="text-xs font-bold uppercase tracking-wide text-[#8F1839]">All time</p>
                        <p class="mt-2 text-3xl font-semibold">{{ summary.total }}</p>
                        <p class="mt-1 text-sm text-[#6E4D58]">Verified at {{ selectedVenue?.name || 'this venue' }}</p>
                    </article>
                    <article class="rounded-lg bg-white p-5 text-sm leading-6 text-[#6E4D58]">
                        <ShieldCheck class="size-6 text-[#52713A]" />
                        <p class="mt-3 font-semibold text-[#2A1520]">What you can see</p>
                        <p class="mt-1">You’ll receive only the offer and redemption details. Dating profiles, matches and preferences remain private.</p>
                    </article>
                </div>
            </div>

            <section class="mt-8 rounded-lg bg-white p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
                <div class="flex items-center gap-2">
                    <History class="size-5 text-[#B4234A]" />
                    <h2 class="text-xl font-semibold">Recent redemptions<span v-if="selectedVenue"> · {{
                        selectedVenue.name }}</span></h2>
                </div>
                <p v-if="loading" class="mt-5 text-sm text-[#6E4D58]">Loading redemptions…</p>
                <div v-else-if="redemptions.length" class="mt-5 divide-y divide-[#E8D8C4]">
                    <article v-for="item in redemptions" :key="`${item.redeemedAt}-${item.offerTitle}`"
                        class="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p class="font-semibold">{{ item.offerTitle }}</p>
                            <p class="mt-1 text-sm text-[#6E4D58]">{{ item.venueName }} · {{ discountLabel(item) }}</p>
                        </div>
                        <time class="text-xs text-[#6E4D58]">{{ new Date(item.redeemedAt).toLocaleString('en-GB', {
                            dateStyle: 'medium', timeStyle: 'short'
                        }) }}</time>
                    </article>
                </div>
                <p v-else class="mt-5 text-sm text-[#6E4D58]">No offers have been redeemed yet.</p>
            </section>
        </section>
    </main>
</template>
