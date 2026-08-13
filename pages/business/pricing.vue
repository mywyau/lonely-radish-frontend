<script setup lang="ts">
import { Check, Sparkles } from '@lucide/vue'

definePageMeta({ title: 'Business pricing · Lonely Radish', middleware: 'business-only' })
const business = ref<any>(null)
const loading = ref(true)
const purchasing = ref<string | null>(null)
const errorMessage = ref('')
const plans = [
  { id: 'free', name: 'Free', price: '£0', description: 'Test whether date-friendly offers work for your venue.', features: ['One offer','All location tools','One-time redemption codes'] },
  { id: 'standard', name: 'Standard', price: '£19/month', description: 'For venues running regular offers.', features: ['Up to five offers','All location tools','One-time redemption codes'] },
  { id: 'featured', name: 'Featured', price: '£49/month', description: 'For venues wanting more visibility.', features: ['Up to ten offers','Priority offer placement','All location tools'] },
]
async function subscribe(plan: string) {
  if (!business.value) return
  purchasing.value = plan; errorMessage.value = ''
  try {
    const result = await $fetch<{ url: string }>('/api/business/checkout', { method: 'POST',
      body: { businessId: business.value.id,plan } })
    await navigateTo(result.url,{ external: true })
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Checkout could not be opened.'; purchasing.value = null }
}
onMounted(async () => {
  try { business.value = (await $fetch<any>('/api/business/me')).business }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Business details could not be loaded.' }
  finally { loading.value = false }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-6xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Business subscriptions</p>
      <h1 class="mt-2 text-4xl font-semibold">Choose the plan that suits your venue.</h1>
      <p class="mt-3 max-w-2xl leading-7 text-[#6E4D58]">Start free and upgrade if you need more offers or visibility. You’ll never receive anyone’s dating profile or preferences.</p>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-[#6E4D58]">Every plan includes approved locations, multi-location campaigns and one-time redemption codes.</p>
      <div v-if="loading" class="mt-8 text-[#6E4D58]">Loading plans…</div>
      <div v-else-if="!business" class="mt-8 rounded-lg bg-white p-6"><p class="font-semibold">Create a business profile before choosing a plan.</p><NuxtLink to="/business" class="mt-4 inline-flex rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Create business profile</NuxtLink></div>
      <div v-else class="mt-8 grid gap-4 lg:grid-cols-3">
        <article v-for="plan in plans" :key="plan.id" class="flex flex-col rounded-lg border p-6" :class="plan.id === 'featured' ? 'border-[#B4234A] bg-[#FCE3E8]' : 'border-[#E8D8C4] bg-white'">
          <Sparkles class="size-6 text-[#B4234A]" /><h2 class="mt-4 text-2xl font-semibold">{{ plan.name }}</h2><p class="mt-1 text-xl font-bold text-[#8F1839]">{{ plan.price }}</p><p class="mt-3 min-h-12 text-sm leading-6 text-[#6E4D58]">{{ plan.description }}</p>
          <ul class="mt-5 flex-1 space-y-3"><li v-for="feature in plan.features" :key="feature" class="flex items-start gap-2 text-sm"><Check class="mt-0.5 size-4 shrink-0 text-[#52713A]" />{{ feature }}</li></ul>
          <span v-if="(business.plan || 'free') === plan.id" class="mt-6 rounded-lg bg-[#EAF2DE] px-4 py-3 text-center text-sm font-bold text-[#52713A]">Current plan</span>
          <button v-else-if="plan.id !== 'free'" type="button" :disabled="Boolean(purchasing) || Boolean(business.plan)" class="mt-6 rounded-lg bg-[#B4234A] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="subscribe(plan.id)">{{ purchasing === plan.id ? 'Opening checkout…' : `Choose ${plan.name}` }}</button>
        </article>
      </div>
      <p v-if="$route.query.cancelled" class="mt-5 text-sm font-semibold text-[#6E4D58]">Checkout was cancelled. Your business plan has not changed.</p>
      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      <NuxtLink to="/business" class="mt-8 inline-flex text-sm font-semibold text-[#8F1839] hover:underline">← Back to business dashboard</NuxtLink>
    </section>
  </main>
</template>
