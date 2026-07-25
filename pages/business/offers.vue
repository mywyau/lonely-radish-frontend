<script setup lang="ts">
import { BadgePercent, Plus, Store } from '@lucide/vue'

definePageMeta({ title: 'Business offers · Lonely Radish', middleware: 'business-only' })
const business = ref<any>(null)
const offers = ref<any[]>([])
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const form = reactive({ venueId: '',title: '',description: '',discountType: 'percentage',
  discountValue: 10,terms: '',active: false })
const offerLimit = computed(() => business.value?.plan === 'featured' ? 10 : business.value?.plan === 'standard' ? 5 : 1)
async function load() {
  const [me,result] = await Promise.all([$fetch<any>('/api/business/me'),$fetch<any>('/api/business/offers')])
  business.value = me.business; offers.value = result.offers
  form.venueId ||= business.value?.venues?.[0]?.id || ''
}
async function addOffer() {
  saving.value = true; errorMessage.value = ''
  try {
    await $fetch('/api/business/offers',{ method:'POST',body:form })
    Object.assign(form,{ title:'',description:'',discountValue:10,terms:'',active:false })
    await load()
  } catch (error:any) { errorMessage.value = error?.data?.statusMessage || 'The offer could not be created.' }
  finally { saving.value = false }
}
async function toggleOffer(offer:any) {
  try {
    const result = await $fetch<any>(`/api/business/offers/${offer.id}`,{ method:'PUT',body:{ active:!offer.active } })
    offer.active = result.active
  } catch (error:any) { errorMessage.value = error?.data?.statusMessage || 'The offer could not be updated.' }
}
onMounted(() => load().catch((error:any) => { errorMessage.value = error?.data?.statusMessage || 'Offers could not be loaded.' }).finally(() => { loading.value=false }))
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Business dashboard</p><h1 class="mt-2 text-4xl font-semibold">Date-friendly offers</h1>
      <p class="mt-3 text-[#6E4D58]">Your {{ business?.plan || 'free' }} plan allows {{ offerLimit }} {{ offerLimit === 1 ? 'offer' : 'offers' }}.</p>
      <div v-if="loading" class="mt-8 text-[#6E4D58]">Loading offers…</div>
      <template v-else-if="business">
        <div v-if="offers.length" class="mt-8 grid gap-3">
          <article v-for="offer in offers" :key="offer.id" class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]"><div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div class="flex items-center gap-2"><BadgePercent class="size-5 text-[#B4234A]" /><h2 class="text-lg font-semibold">{{ offer.title }}</h2></div><p class="mt-2 text-sm text-[#6E4D58]">{{ offer.venueName }} · {{ offer.discountType === 'percentage' ? `${offer.discountValue}% off` : `£${offer.discountValue} off` }}</p><p v-if="offer.description" class="mt-2 text-sm">{{ offer.description }}</p><span class="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold capitalize" :class="offer.approvalStatus === 'approved' ? 'bg-[#EAF2DE] text-[#52713A]' : offer.approvalStatus === 'rejected' ? 'bg-[#FCE3E8] text-[#8F1839]' : 'bg-[#FFF1C7] text-[#694C00]'">{{ offer.approvalStatus }} review</span><p v-if="offer.rejectionNote" class="mt-2 text-xs text-[#8F1839]">Review note: {{ offer.rejectionNote }}</p></div><button type="button" class="rounded-lg px-4 py-2 text-sm font-semibold" :class="offer.active ? 'bg-[#EAF2DE] text-[#52713A]' : 'bg-[#F3E8DA] text-[#8F1839]'" @click="toggleOffer(offer)">{{ offer.active ? 'Active · Pause' : 'Inactive · Activate' }}</button></div></article>
        </div>
        <form class="mt-6 rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]" @submit.prevent="addOffer">
          <div class="flex items-center gap-2"><Plus class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">Create an offer</h2></div>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <label class="text-sm font-semibold">Venue<select v-model="form.venueId" required class="field"><option v-for="venue in business.venues" :key="venue.id" :value="venue.id">{{ venue.name }}</option></select></label>
            <label class="text-sm font-semibold">Offer title<input v-model="form.title" maxlength="120" required class="field" placeholder="20% off coffee for two"></label>
            <label class="text-sm font-semibold sm:col-span-2">Description<textarea v-model="form.description" maxlength="500" rows="3" class="field resize-none" placeholder="Explain what the date receives."></textarea><span class="counter">{{ form.description.length }}/500</span></label>
            <label class="text-sm font-semibold">Discount type<select v-model="form.discountType" class="field"><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></label>
            <label class="text-sm font-semibold">Discount value<input v-model.number="form.discountValue" required min="0.01" :max="form.discountType === 'percentage' ? 100 : 10000" step="0.01" type="number" class="field"></label>
            <label class="text-sm font-semibold sm:col-span-2">Terms and exclusions<textarea v-model="form.terms" maxlength="500" rows="3" class="field resize-none" placeholder="For example: Monday–Thursday, dine-in only, cannot be combined."></textarea><span class="counter">{{ form.terms.length }}/500</span></label>
            <label class="flex items-start gap-3 rounded-lg bg-[#EAF2DE] p-4 text-sm sm:col-span-2"><input v-model="form.active" type="checkbox" class="mt-1 size-4 accent-[#B4234A]"><span><strong class="block">Mark ready for review</strong>It will only become publicly visible after business approval.</span></label>
          </div>
          <button type="submit" :disabled="saving || offers.length >= offerLimit" class="mt-5 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Creating…' : offers.length >= offerLimit ? 'Offer limit reached' : 'Create offer' }}</button>
          <NuxtLink v-if="offers.length >= offerLimit && offerLimit < 10" to="/business/pricing" class="ml-3 text-sm font-semibold text-[#8F1839] hover:underline">Compare plans</NuxtLink>
        </form>
      </template>
      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      <NuxtLink to="/business" class="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#8F1839] hover:underline"><Store class="size-4" />Back to business dashboard</NuxtLink>
    </section>
  </main>
</template>
<style scoped>
.field{margin-top:.4rem;width:100%;border-radius:.5rem;border:1px solid #E8D8C4;background:#FBF7F1;padding:.75rem .9rem;outline:none}.field:focus{border-color:#B4234A;box-shadow:0 0 0 3px rgba(180,35,74,.14)}.counter{margin-top:.25rem;display:block;text-align:right;font-size:.75rem;font-weight:400;color:#6E4D58}
</style>
