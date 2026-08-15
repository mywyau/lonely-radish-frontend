<script setup lang="ts">
import {
  BadgePercent,
  Building2,
  Check,
  ChevronDown,
  Clock3,
  MapPin,
  RotateCcw,
  Search,
  Pause,
  Play,
  Store,
  X,
} from '@lucide/vue'

definePageMeta({ title: 'Business approvals · Lonely Radish', middleware: 'admin' })

type EntityType = 'business' | 'venue' | 'offer'
type ReviewStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'paused'
type ApprovalItem = {
  id: string
  entityType: EntityType
  status: Exclude<ReviewStatus, 'all'>
  name?: string
  title?: string
  businessName?: string
  contactEmail?: string
  category?: string
  addressLine?: string
  city?: string
  postcode?: string
  venueName?: string
  venueCount?: number
  offerCount?: number
  description?: string
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  terms?: string
  active?: boolean
  venueScope?: 'single' | 'selected' | 'all'
  locationCount?: number
  startsAt?: string | null
  endsAt?: string | null
  createdAt: string
  reviewedAt?: string | null
  reviewedBy?: string | null
  latestReviewNote?: string | null
}

const tabs: { value: EntityType; label: string }[] = [
  { value: 'business', label: 'Businesses' },
  { value: 'venue', label: 'Venues' },
  { value: 'offer', label: 'Offers' },
]
const items = ref<ApprovalItem[]>([])
const pendingCounts = ref({ businesses: 0, venues: 0, offers: 0 })
const entityType = ref<EntityType>('business')
const status = ref<ReviewStatus>('pending')
const age = ref('all')
const searchInput = ref('')
const loading = ref(true)
const loadingMore = ref(false)
const savingKey = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const reviewNotes = reactive<Record<string, string>>({})
let filterTimer: ReturnType<typeof setTimeout> | undefined
let requestNumber = 0

function pendingCount(type: EntityType) {
  if (type === 'business') return pendingCounts.value.businesses
  if (type === 'venue') return pendingCounts.value.venues
  return pendingCounts.value.offers
}

function itemTitle(item: ApprovalItem) {
  return item.title || item.name || 'Untitled submission'
}

function discountLabel(item: ApprovalItem) {
  if (item.discountValue == null) return ''
  return item.discountType === 'percentage' ? `${item.discountValue}% off` : `£${item.discountValue} off`
}

function locationScopeLabel(item: ApprovalItem) {
  if (item.venueScope === 'all') return `All ${item.locationCount || 0} current and future venues`
  if (item.venueScope === 'selected') return `${item.locationCount || 0} selected venues`
  return [item.venueName, item.city, item.postcode].filter(Boolean).join(' · ')
}

function submittedLabel(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

async function loadReviews(append = false) {
  const thisRequest = ++requestNumber
  if (append) loadingMore.value = true
  else loading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{
      items: ApprovalItem[]
      pendingCounts: { businesses: number; venues: number; offers: number }
      nextCursor: string | null
      hasMore: boolean
    }>('/api/admin/businesses', {
      query: {
        entityType: entityType.value,
        status: status.value,
        age: age.value,
        ...(searchInput.value.trim() ? { q: searchInput.value.trim() } : {}),
        ...(append && nextCursor.value ? { cursor: nextCursor.value } : {}),
      },
    })
    if (thisRequest !== requestNumber) return
    items.value = append ? [...items.value, ...result.items] : result.items
    pendingCounts.value = result.pendingCounts
    nextCursor.value = result.nextCursor
    hasMore.value = result.hasMore
  } catch (error: any) {
    if (thisRequest === requestNumber) {
      errorMessage.value = error?.data?.statusMessage || 'Business reviews could not be loaded.'
    }
  } finally {
    if (thisRequest === requestNumber) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

function selectTab(type: EntityType) {
  if (entityType.value === type) return
  entityType.value = type
  nextCursor.value = null
  if (status.value === 'paused' && type !== 'business') {
    status.value = 'pending'
    return
  }
  void loadReviews()
}

function scheduleReload() {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    nextCursor.value = null
    void loadReviews()
  }, 300)
}

function clearFilters() {
  searchInput.value = ''
  status.value = 'pending'
  age.value = 'all'
}

async function review(entity: EntityType, entityId: string, decision: Exclude<ReviewStatus, 'all'>) {
  const key = `${entity}:${entityId}`
  savingKey.value = key
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch('/api/admin/reviews', {
      method: 'PATCH',
      body: { entityType: entity, entityId, decision, note: reviewNotes[key] || '' },
    })
    successMessage.value = `${entity.charAt(0).toUpperCase()}${entity.slice(1)} review saved.`
    await loadReviews()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'The review could not be saved.'
  } finally {
    savingKey.value = ''
  }
}

async function intervene(item: ApprovalItem, action: 'pause' | 'restore') {
  const key = `${item.entityType}:${item.id}`
  const reason = reviewNotes[key]?.trim()
  if (!reason) {
    errorMessage.value = `Add a private reason before you ${action} this business.`
    return
  }
  if (action === 'pause' && !window.confirm(`Pause “${itemTitle(item)}”? Its offers will be disabled and current redemption codes revoked.`)) return

  savingKey.value = key
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch(`/api/admin/businesses/${item.id}/intervention`, {
      method: 'PATCH',
      body: { action, reason },
    })
    successMessage.value = action === 'pause'
      ? 'Business promotion paused. Offers were disabled and current codes revoked.'
      : 'Business restored. Its offers remain inactive until the business chooses to enable them again.'
    await loadReviews()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'The business intervention could not be saved.'
  } finally {
    savingKey.value = ''
  }
}

watch([status, age], () => {
  nextCursor.value = null
  void loadReviews()
})
watch(searchInput, scheduleReload)
onMounted(() => loadReviews())
onBeforeUnmount(() => {
  if (filterTimer) clearTimeout(filterTimer)
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-4 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-6xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Administration</p>
      <h1 class="mt-2 text-4xl font-semibold">Business approvals</h1>
      <p class="mt-3 max-w-3xl leading-7 text-[#6E4D58]">
        Review brands, venues and offers from one approval inbox. Only fully approved offers appear to dating members.
      </p>

      <nav class="mt-7 flex gap-2 overflow-x-auto border-b border-[#E8D8C4]" aria-label="Approval queues">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold"
          :class="entityType === tab.value ? 'border-[#B4234A] text-[#8F1839]' : 'border-transparent text-[#6E4D58]'"
          @click="selectTab(tab.value)"
        >
          {{ tab.label }}
          <span class="rounded-full bg-[#FCE3E8] px-2 py-0.5 text-xs text-[#8F1839]">{{ pendingCount(tab.value) }}</span>
        </button>
      </nav>

      <section class="mt-5 rounded-lg bg-white p-4 shadow-[0_10px_24px_rgba(180,35,74,0.07)]" aria-label="Filter approvals">
        <div class="grid gap-3 md:grid-cols-[1.6fr_0.8fr_0.8fr]">
          <label class="text-sm font-semibold">
            Search
            <span class="relative block">
              <Search aria-hidden="true" class="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[#6E4D58]" />
              <input
                v-model="searchInput"
                class="filter-field search-field"
                :placeholder="entityType === 'business' ? 'Brand or contact email' : entityType === 'venue' ? 'Venue, brand or postcode' : 'Offer, brand or venue'"
              >
            </span>
          </label>
          <label class="text-sm font-semibold">
            Status
            <select v-model="status" class="filter-field">
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option v-if="entityType === 'business'" value="paused">Intervention paused</option>
              <option value="all">All statuses</option>
            </select>
          </label>
          <label class="text-sm font-semibold">
            Submitted
            <select v-model="age" class="filter-field">
              <option value="all">Any time</option>
              <option value="day">Last 24 hours</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </label>
        </div>
        <div class="mt-3 flex items-center justify-between gap-3">
          <p class="text-xs text-[#6E4D58]">{{ loading ? 'Updating queue…' : `${items.length} submission${items.length === 1 ? '' : 's'} shown` }}</p>
          <button v-if="searchInput || status !== 'pending' || age !== 'all'" type="button" class="inline-flex items-center gap-1 text-xs font-semibold text-[#8F1839]" @click="clearFilters">
            <X class="size-3.5" />Clear filters
          </button>
        </div>
      </section>

      <p v-if="successMessage" class="mt-5 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#52713A]" role="status">{{ successMessage }}</p>
      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>

      <div v-if="loading && !items.length" class="mt-6 rounded-lg bg-white p-8 text-[#6E4D58]">Loading approval queue…</div>
      <div v-else-if="items.length" class="mt-6 grid gap-3">
        <details v-for="item in items" :key="`${item.entityType}:${item.id}`" class="approval-row group rounded-lg bg-white shadow-[0_8px_20px_rgba(180,35,74,0.06)]">
          <summary class="cursor-pointer list-none p-4 sm:p-5">
            <div class="flex items-start gap-3">
              <Building2 v-if="item.entityType === 'business'" class="mt-0.5 size-5 shrink-0 text-[#B4234A]" />
              <MapPin v-else-if="item.entityType === 'venue'" class="mt-0.5 size-5 shrink-0 text-[#B4234A]" />
              <BadgePercent v-else class="mt-0.5 size-5 shrink-0 text-[#B4234A]" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h2 class="font-semibold sm:text-lg">{{ itemTitle(item) }}</h2>
                  <span class="status-chip" :class="`status-${item.status}`">{{ item.status }}</span>
                </div>
                <p v-if="item.businessName" class="mt-1 truncate text-sm font-semibold text-[#6E4D58]">{{ item.businessName }}</p>
                <p class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6E4D58]">
                  <span class="inline-flex items-center gap-1"><Clock3 class="size-3.5" />{{ submittedLabel(item.createdAt) }}</span>
                  <span v-if="item.entityType === 'business'">{{ item.venueCount }} venues · {{ item.offerCount }} offers</span>
                  <span v-else-if="item.entityType === 'venue'">{{ item.city }} · {{ item.postcode }} · {{ item.offerCount }} offers</span>
                  <span v-else>{{ discountLabel(item) }} · {{ item.locationCount }} location{{ item.locationCount === 1 ? '' : 's' }}</span>
                </p>
              </div>
              <ChevronDown class="mt-1 size-5 shrink-0 text-[#6E4D58]" />
            </div>
          </summary>

          <div class="border-t border-[#E8D8C4] p-4 sm:p-5">
            <dl class="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <div v-if="item.contactEmail"><dt>Contact</dt><dd>{{ item.contactEmail }}</dd></div>
              <div v-if="item.entityType === 'venue'"><dt>Address</dt><dd>{{ item.addressLine }}, {{ item.city }}, {{ item.postcode }}</dd></div>
              <div v-if="item.category"><dt>Category</dt><dd class="capitalize">{{ item.category }}</dd></div>
              <div v-if="item.entityType === 'offer'"><dt>Locations</dt><dd>{{ locationScopeLabel(item) }}</dd></div>
              <div v-if="item.entityType === 'offer'"><dt>Business visibility</dt><dd>{{ item.active ? 'Marked active' : 'Marked inactive' }}</dd></div>
              <div v-if="item.reviewedAt"><dt>Last reviewed</dt><dd>{{ submittedLabel(item.reviewedAt) }}<span v-if="item.reviewedBy"> by {{ item.reviewedBy }}</span></dd></div>
            </dl>
            <div v-if="item.description || item.terms" class="mt-4 grid gap-3 text-sm">
              <p v-if="item.description"><span class="detail-label">Description</span>{{ item.description }}</p>
              <p v-if="item.terms"><span class="detail-label">Terms</span>{{ item.terms }}</p>
            </div>
            <p v-if="item.latestReviewNote" class="mt-4 rounded-lg bg-[#F3E8DA] p-3 text-sm text-[#6E4D58]">
              <span class="font-semibold text-[#4D2F39]">Latest private note:</span> {{ item.latestReviewNote }}
            </p>

            <label class="mt-4 block text-xs font-semibold">
              Private review note
              <textarea
                v-model="reviewNotes[`${item.entityType}:${item.id}`]"
                maxlength="500"
                rows="2"
                class="mt-1 w-full rounded-lg border border-[#D8C8B6] bg-white p-3 font-normal outline-none focus:border-[#B4234A]"
                :placeholder="item.entityType === 'business' && ['approved', 'paused'].includes(item.status) ? 'Required reason for pausing or restoring' : 'Optional internal note or reason for rejection'"
              />
            </label>
            <div class="mt-4 flex flex-wrap gap-2">
              <template v-if="item.entityType === 'business' && item.status === 'approved'">
                <button class="review-pause" :disabled="savingKey === `${item.entityType}:${item.id}`" @click="intervene(item, 'pause')"><Pause class="size-4" />Pause promotion</button>
              </template>
              <template v-else-if="item.entityType === 'business' && item.status === 'paused'">
                <button class="review-restore" :disabled="savingKey === `${item.entityType}:${item.id}`" @click="intervene(item, 'restore')"><Play class="size-4" />Restore business</button>
              </template>
              <template v-else>
                <button class="review-approve" :disabled="savingKey === `${item.entityType}:${item.id}`" @click="review(item.entityType, item.id, 'approved')"><Check class="size-4" />Approve</button>
                <button class="review-reject" :disabled="savingKey === `${item.entityType}:${item.id}`" @click="review(item.entityType, item.id, 'rejected')"><X class="size-4" />Reject</button>
                <button class="review-reset" :disabled="savingKey === `${item.entityType}:${item.id}`" @click="review(item.entityType, item.id, 'pending')"><RotateCcw class="size-4" />Return to pending</button>
              </template>
            </div>
          </div>
        </details>
      </div>
      <div v-else-if="!loading" class="mt-6 rounded-lg bg-white p-8 text-center">
        <Store class="mx-auto size-8 text-[#B4234A]" />
        <h2 class="mt-3 text-xl font-semibold">No submissions found</h2>
        <p class="mt-2 text-sm text-[#6E4D58]">Try another queue or clear the current filters.</p>
      </div>

      <div v-if="hasMore" class="mt-6 text-center">
        <button type="button" :disabled="loadingMore" class="rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="loadReviews(true)">
          {{ loadingMore ? 'Loading…' : 'Load more submissions' }}
        </button>
      </div>
    </section>
  </main>
</template>

<style scoped>
.filter-field { margin-top: .3rem; width: 100%; border-radius: .5rem; border: 1px solid #E8D8C4; background: #FBF7F1; padding: .7rem .8rem; font-size: .875rem; outline: none; }
.filter-field.search-field { padding-left: 2.5rem; }
.filter-field:focus { border-color: #B4234A; box-shadow: 0 0 0 3px rgba(180,35,74,.12); }
.approval-row[open] > summary svg:last-child { transform: rotate(180deg); }
.approval-row > summary svg:last-child { transition: transform .2s ease; }
.status-chip { border-radius: 9999px; padding: .2rem .55rem; font-size: .65rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
.status-pending { background: #FFF3CD; color: #7A5600; }
.status-approved { background: #EAF2DE; color: #3F6229; }
.status-rejected { background: #FCE3E8; color: #8F1839; }
.status-paused { background: #FFF1C7; color: #694C00; }
dt, .detail-label { display: block; margin-bottom: .2rem; font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: #6E4D58; }
dd { color: #2A1520; }
.review-approve, .review-reject, .review-reset, .review-pause, .review-restore { display: inline-flex; align-items: center; gap: .35rem; border-radius: .5rem; padding: .6rem .8rem; font-size: .75rem; font-weight: 700; }
.review-approve { background: #EAF2DE; color: #3F6229; }
.review-reject { background: #FCE3E8; color: #8F1839; }
.review-reset { background: #F3E8DA; color: #6E4D58; }
.review-pause { background: #FFF1C7; color: #694C00; }
.review-restore { background: #EAF2DE; color: #3F6229; }
.review-approve:disabled, .review-reject:disabled, .review-reset:disabled, .review-pause:disabled, .review-restore:disabled { opacity: .5; }
</style>
