<script setup lang="ts">
import { BadgePercent, Building2, Check, MapPin, RotateCcw, X } from '@lucide/vue'

definePageMeta({ title: 'Business approvals · Lonely Radish', middleware: 'admin' })

const businesses = ref<any[]>([])
const loading = ref(true)
const savingKey = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const reviewNotes = reactive<Record<string,string>>({})

async function loadReviews() {
  const result = await $fetch<{ businesses: any[] }>('/api/admin/businesses')
  businesses.value = result.businesses
}

async function review(entityType: 'business' | 'venue' | 'offer', entityId: string, decision: 'pending' | 'approved' | 'rejected') {
  const key = `${entityType}:${entityId}`
  savingKey.value = key
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch('/api/admin/reviews', {
      method: 'PATCH',
      body: { entityType, entityId, decision, note: reviewNotes[key] || '' },
    })
    successMessage.value = `${entityType.charAt(0).toUpperCase()}${entityType.slice(1)} review saved.`
    await loadReviews()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'The review could not be saved.'
  } finally {
    savingKey.value = ''
  }
}

onMounted(() => loadReviews()
  .catch((error: any) => { errorMessage.value = error?.data?.statusMessage || 'Business reviews could not be loaded.' })
  .finally(() => { loading.value = false }))
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-4 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-6xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Administration</p>
      <h1 class="mt-2 text-4xl font-semibold">Business approvals</h1>
      <p class="mt-3 max-w-3xl leading-7 text-[#6E4D58]">Approve the business, each venue, and each offer before it can appear to dating members.</p>
      <p v-if="successMessage" class="mt-5 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#52713A]" role="status">{{ successMessage }}</p>
      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-[#6E4D58]">Loading reviews…</div>
      <div v-else-if="businesses.length" class="mt-8 grid gap-6">
        <article v-for="business in businesses" :key="business.id" class="overflow-hidden rounded-lg bg-white shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="p-5 sm:p-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div class="flex items-center gap-2"><Building2 class="size-5 text-[#B4234A]" /><h2 class="text-2xl font-semibold">{{ business.name }}</h2></div>
                <p class="mt-2 text-sm text-[#6E4D58]">{{ business.contactEmail }}</p>
                <p class="mt-2 text-xs font-bold uppercase tracking-wide" :class="business.status === 'active' ? 'text-[#52713A]' : business.status === 'suspended' ? 'text-[#8F1839]' : 'text-[#9A6900]'">Business · {{ business.status }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <button class="review-approve" :disabled="savingKey === `business:${business.id}`" @click="review('business',business.id,'approved')"><Check class="size-4" />Approve</button>
                <button class="review-reject" :disabled="savingKey === `business:${business.id}`" @click="review('business',business.id,'rejected')"><X class="size-4" />Reject</button>
                <button class="review-reset" :disabled="savingKey === `business:${business.id}`" @click="review('business',business.id,'pending')"><RotateCcw class="size-4" />Reset</button>
              </div>
            </div>
          </div>
          <div class="border-t border-[#E8D8C4] bg-[#FBF7F1] p-4 sm:p-6">
            <div v-for="venue in business.venues" :key="venue.id" class="mb-4 rounded-lg border border-[#E8D8C4] bg-white p-4 last:mb-0">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div><h3 class="flex items-center gap-2 text-lg font-semibold"><MapPin class="size-4 text-[#B4234A]" />{{ venue.name }}</h3><p class="mt-1 text-sm text-[#6E4D58]">{{ venue.addressLine }}, {{ venue.city }}, {{ venue.postcode }}</p><p class="mt-2 text-xs font-bold uppercase tracking-wide">Venue · {{ venue.status }}</p></div>
                <div class="flex flex-wrap gap-2"><button class="review-approve" @click="review('venue',venue.id,'approved')"><Check class="size-4" />Approve</button><button class="review-reject" @click="review('venue',venue.id,'rejected')"><X class="size-4" />Reject</button><button class="review-reset" @click="review('venue',venue.id,'pending')"><RotateCcw class="size-4" />Reset</button></div>
              </div>
              <div v-if="venue.offers.length" class="mt-4 grid gap-3">
                <section v-for="offer in venue.offers" :key="offer.id" class="rounded-lg bg-[#F3E8DA] p-4">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><h4 class="flex items-center gap-2 font-semibold"><BadgePercent class="size-4 text-[#B4234A]" />{{ offer.title }}</h4><p class="mt-1 text-sm text-[#6E4D58]">{{ offer.discountType === 'percentage' ? `${offer.discountValue}% off` : `£${offer.discountValue} off` }} · {{ offer.active ? 'Business marked active' : 'Business marked inactive' }}</p><p v-if="offer.description" class="mt-2 text-sm">{{ offer.description }}</p><p v-if="offer.terms" class="mt-2 text-xs text-[#6E4D58]">Terms: {{ offer.terms }}</p><p class="mt-2 text-xs font-bold uppercase tracking-wide">Offer · {{ offer.approvalStatus }}</p></div>
                    <div class="flex shrink-0 flex-wrap gap-2"><button class="review-approve" @click="review('offer',offer.id,'approved')"><Check class="size-4" />Approve</button><button class="review-reject" @click="review('offer',offer.id,'rejected')"><X class="size-4" />Reject</button><button class="review-reset" @click="review('offer',offer.id,'pending')"><RotateCcw class="size-4" />Reset</button></div>
                  </div>
                  <label class="mt-3 block text-xs font-semibold">Private review note<textarea v-model="reviewNotes[`offer:${offer.id}`]" maxlength="500" rows="2" class="mt-1 w-full rounded-lg border border-[#D8C8B6] bg-white p-3 font-normal" placeholder="Optional reason for rejection or internal note" /></label>
                </section>
              </div>
              <p v-else class="mt-4 text-sm text-[#6E4D58]">No offers submitted for this venue.</p>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center text-[#6E4D58]">No businesses have been submitted.</div>
    </section>
  </main>
</template>

<style scoped>
.review-approve,.review-reject,.review-reset{display:inline-flex;align-items:center;gap:.35rem;border-radius:.5rem;padding:.55rem .75rem;font-size:.75rem;font-weight:700}.review-approve{background:#EAF2DE;color:#3F6229}.review-reject{background:#FCE3E8;color:#8F1839}.review-reset{background:#F3E8DA;color:#6E4D58}.review-approve:disabled,.review-reject:disabled,.review-reset:disabled{opacity:.5}
</style>
