<script setup lang="ts">
import { BadgePercent, MapPin, Store } from '@lucide/vue'

definePageMeta({ title: 'Date offers · Lonely Radish', middleware: 'logged-in' })
const offers = ref<any[]>([])
const loading = ref(true)
const errorMessage = ref('')

onMounted(async () => {
  try {
    offers.value = (await $fetch<{ offers: any[] }>('/api/offers')).offers
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Offers could not be loaded.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-4 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Plan something together</p>
      <h1 class="mt-2 text-4xl font-semibold">Date-friendly offers</h1>
      <p class="mt-3 max-w-2xl leading-7 text-[#6E4D58]">Offers from businesses and venues reviewed by Lonely Radish. Check the terms with the venue when booking.</p>
      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-[#6E4D58]">Loading offers…</div>
      <div v-else-if="offers.length" class="mt-8 grid gap-4 sm:grid-cols-2">
        <article v-for="offer in offers" :key="offer.id" class="rounded-lg bg-white p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] sm:p-6">
          <BadgePercent class="size-6 text-[#B4234A]" />
          <p class="mt-4 text-xs font-bold uppercase tracking-wide text-[#8F1839]">{{ offer.businessName }}</p>
          <h2 class="mt-1 text-xl font-semibold">{{ offer.title }}</h2>
          <p class="mt-2 text-lg font-bold text-[#52713A]">{{ offer.discountType === 'percentage' ? `${offer.discountValue}% off` : `£${offer.discountValue} off` }}</p>
          <p class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#6E4D58]"><MapPin class="size-4" />{{ offer.venueName }}, {{ offer.city }}</p>
          <p v-if="offer.description" class="mt-3 text-sm leading-6 text-[#4D2F39]">{{ offer.description }}</p>
          <p v-if="offer.terms" class="mt-4 rounded-lg bg-[#F3E8DA] p-3 text-xs leading-5 text-[#6E4D58]">Terms: {{ offer.terms }}</p>
        </article>
      </div>
      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center"><Store class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">No approved offers yet</h2><p class="mt-2 text-sm text-[#6E4D58]">Check again as more date-friendly venues join.</p></div>
    </section>
  </main>
</template>
