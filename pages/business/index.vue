<script setup lang="ts">
import { BadgePoundSterling, Building2, MapPin, Plus, ScanLine, Store } from '@lucide/vue'

definePageMeta({ title: 'Business dashboard · Lonely Radish', middleware: 'business-only' })

const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const business = ref<any>(null)
const form = reactive({
  businessName: '', contactEmail: '', venueName: '', category: 'cafe',
  addressLine: '', city: '', postcode: ''
})
const planLabel = computed(() => business.value?.plan === 'featured' ? 'Featured' :
  business.value?.plan === 'standard' ? 'Standard' : 'Free')
const offerLimit = computed(() => business.value?.plan === 'featured' ? 10 : business.value?.plan === 'standard' ? 5 : 1)
const heroTitle = computed(() => business.value?.name || 'Bring more dates through your door.')
const heroDescription = computed(() => business.value
  ? 'Manage your venue, offers and business subscription.'
  : 'Create date-friendly offers for couples already deciding where to meet.')

async function load() {
  const result = await $fetch<{ business: any }>('/api/business/me')
  business.value = result.business
}
async function createBusiness() {
  saving.value = true; errorMessage.value = ''
  try {
    await $fetch('/api/business', { method: 'POST', body: form })
    successMessage.value = 'Business profile created and submitted for verification.'
    await load()
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your business profile could not be created.' }
  finally { saving.value = false }
}
async function manageSubscription() {
  try {
    const result = await $fetch<{ url: string }>('/api/business/portal', { method: 'POST' })
    await navigateTo(result.url, { external: true })
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Subscription management could not be opened.' }
}
onMounted(() => load().catch((error: any) => { errorMessage.value = error?.data?.statusMessage || 'Business details could not be loaded.' }).finally(() => { loading.value = false }))
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Lonely Radish for business</p>
      <h1 class="mt-2 text-4xl font-semibold sm:text-5xl">{{ heroTitle }}</h1>
      <p class="mt-3 max-w-2xl leading-7 text-[#6E4D58]">{{ heroDescription }}</p>
      <p v-if="!loading && !business && $route.query.onboarding === 'required'"
        class="mt-5 rounded-lg bg-[#FFF1C7] p-4 text-sm font-semibold text-[#694C00]" role="status">Complete your
        business profile before using the rest of the business portal.</p>

      <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading business tools…</div>

      <template v-else-if="business">
        <div v-if="$route.query.checkout === 'success'"
          class="mt-6 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#52713A]" role="status">Payment received.
          Stripe is activating your business plan; this may take a moment.</div>
        <div class="mt-8 grid gap-4 md:grid-cols-3">
          <article class="rounded-lg bg-white p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
            <Building2 class="size-6 text-[#B4234A]" />
            <p class="mt-4 text-xs font-bold uppercase tracking-wide text-[#6E4D58]">Verification</p>
            <h2 class="mt-1 text-xl font-semibold capitalize">{{ business.status }}</h2>
            <p class="mt-2 text-sm text-[#6E4D58]">Offers remain private until the business and venue are approved.</p>
          </article>
          <article class="rounded-lg bg-[#FCE3E8] p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
            <BadgePoundSterling class="size-6 text-[#B4234A]" />
            <p class="mt-4 text-xs font-bold uppercase tracking-wide text-[#8F1839]">Business plan</p>
            <h2 class="mt-1 text-xl font-semibold">{{ planLabel }}</h2>
            <p class="mt-2 text-sm text-[#6E4D58]">{{ business.offerCount }} of {{ offerLimit }} offers created.</p>
          </article>
          <article class="rounded-lg bg-[#EAF2DE] p-6 shadow-[0_10px_24px_rgba(110,139,82,0.1)]">
            <Store class="size-6 text-[#52713A]" />
            <p class="mt-4 text-xs font-bold uppercase tracking-wide text-[#52713A]">Venues</p>
            <h2 class="mt-1 text-xl font-semibold">{{ business.venues.length }}</h2>
            <p class="mt-2 text-sm text-[#4D2F39]">Campaigns can cover one, selected, or every approved location.</p>
          </article>
        </div>

        <section class="mt-5 rounded-lg bg-white p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-xl font-semibold">Your locations</h2>
            <NuxtLink to="/business/venues" class="text-sm font-semibold text-[#8F1839] hover:underline">Manage
              locations</NuxtLink>
          </div>
          <div v-for="venue in business.venues" :key="venue.id"
            class="mt-4 flex items-start gap-3 rounded-lg bg-[#FBF7F1] p-4">
            <MapPin class="mt-0.5 size-5 shrink-0 text-[#B4234A]" />
            <div>
              <p class="font-semibold">{{ venue.name }}</p>
              <p class="mt-1 text-sm text-[#6E4D58]">{{ venue.addressLine }}, {{ venue.city }}, {{ venue.postcode }}</p>
              <span
                class="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-[#52713A]">{{
                  venue.status }}</span>
            </div>
          </div>
        </section>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NuxtLink to="/business/venues" class="group rounded-lg bg-[#2A1520] p-6 text-white">
            <MapPin class="size-6" />
            <h2 class="mt-4 text-xl font-semibold">Manage locations</h2>
            <p class="mt-2 text-sm text-white/75">Add establishments and follow each venue’s approval state.</p>
          </NuxtLink>
          <NuxtLink to="/business/offers" class="group rounded-lg bg-[#B4234A] p-6 text-white">
            <Plus class="size-6" />
            <h2 class="mt-4 text-xl font-semibold">Manage campaigns</h2>
            <p class="mt-2 text-sm text-white/75">Create one offer for one, selected, or all locations.</p>
          </NuxtLink>
          <NuxtLink to="/business/redeem" class="group rounded-lg bg-[#52713A] p-6 text-white">
            <ScanLine class="size-6" />
            <h2 class="mt-4 text-xl font-semibold">Redeem customer code</h2>
            <p class="mt-2 text-sm text-white/75">Choose the serving venue, enter the customer’s code and record
              one-time use.</p>
          </NuxtLink>
          <NuxtLink v-if="!business.plan" to="/business/pricing" class="rounded-lg bg-[#F3E8DA] p-6">
            <BadgePoundSterling class="size-6 text-[#B4234A]" />
            <h2 class="mt-4 text-xl font-semibold">Compare business plans</h2>
            <p class="mt-2 text-sm text-[#6E4D58]">Add more offers, multi-location campaigns and priority offer placement.</p>
          </NuxtLink>
          <button v-else type="button" class="rounded-lg bg-[#F3E8DA] p-6 text-left" @click="manageSubscription">
            <BadgePoundSterling class="size-6 text-[#B4234A]" />
            <h2 class="mt-4 text-xl font-semibold">Manage subscription</h2>
            <p class="mt-2 text-sm text-[#6E4D58]">Update payment details or cancel through Stripe.</p>
          </button>
        </div>
      </template>

      <form v-else class="mt-8 rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-8"
        @submit.prevent="createBusiness">
        <div class="flex items-start gap-3">
          <Building2 class="mt-1 size-6 text-[#B4234A]" />
          <div>
            <h2 class="text-2xl font-semibold">Create your business profile</h2>
            <p class="mt-1 text-sm text-[#6E4D58]">We manually review businesses before their offers can appear to
              members.
            </p>
          </div>
        </div>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <label class="text-sm font-semibold">Business name<input v-model="form.businessName" minlength="2"
              maxlength="120" required class="field" placeholder="For example, North Street Coffee"></label>
          <label class="text-sm font-semibold">Business contact email<input v-model="form.contactEmail" maxlength="254"
              required type="email" class="field" placeholder="hello@example.com"></label>
          <label class="text-sm font-semibold">Venue name<input v-model="form.venueName" minlength="2" maxlength="120"
              required class="field" placeholder="Your customer-facing venue name"></label>
          <label class="text-sm font-semibold">Venue type<select v-model="form.category" class="field">
              <option value="cafe">Café</option>
              <option value="restaurant">Restaurant</option>
              <option value="bar">Bar</option>
              <option value="activity">Activity venue</option>
              <option value="culture">Culture venue</option>
              <option value="wellness">Wellness venue</option>
              <option value="other">Other</option>
            </select></label>
          <label class="text-sm font-semibold sm:col-span-2">Venue address<input v-model="form.addressLine"
              maxlength="200" required class="field" autocomplete="street-address"></label>
          <label class="text-sm font-semibold">City<input v-model="form.city" maxlength="100" required class="field"
              autocomplete="address-level2"></label>
          <label class="text-sm font-semibold">Postcode<input v-model="form.postcode" maxlength="16" required
              class="field" autocomplete="postal-code"></label>
        </div>
        <label class="mt-5 flex items-start gap-3 rounded-lg bg-[#EAF2DE] p-4 text-sm"><input required type="checkbox"
            class="mt-1 size-4 accent-[#B4234A]"><span>I confirm I am authorised to represent this business and that the
            venue
            information is accurate.</span></label>
        <button type="submit" :disabled="saving"
          class="mt-5 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{{ saving
            ?
            'Creating profile…' : 'Create business profile' }}</button>
      </form>
      <p v-if="successMessage" class="mt-4 text-sm font-semibold text-[#52713A]" role="status">{{ successMessage }}</p>
      <p v-if="errorMessage" class="mt-4 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">
        {{
          errorMessage }}</p>
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
