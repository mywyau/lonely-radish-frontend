<script setup lang="ts">
import { ArrowLeft, HeartHandshake, PauseCircle, ShieldCheck } from '@lucide/vue'

definePageMeta({ title: 'Account Controls · Lonely Radish', middleware: 'logged-in' })

const { entitlement, resolve } = useMeStateV2()
const pauseState = ref<{ paused: boolean; pausedUntil: string | null }>({ paused: false, pausedUntil: null })
const pauseChoice = ref('7_days')
const savingPause = ref(false)
const pauseError = ref('')
const reliability = ref<{ confirmedNoShows: number; restrictedUntil: string | null; attendedDates: number; pendingReports: number } | null>(null)
const openingBillingPortal = ref(false)
const billingError = ref('')
const loading = ref(true)
const planLabel = computed(() => entitlement.value?.plan === 'yearly' ? 'Yearly plan' : entitlement.value?.plan === 'quarterly' ? 'Three-month plan' : entitlement.value?.plan === 'monthly' ? 'Monthly plan' : 'Free plan')
const isPaidPlan = computed(() => ['monthly','quarterly','yearly'].includes(entitlement.value?.plan || ''))

async function updatePause(choice = pauseChoice.value) {
  savingPause.value = true
  pauseError.value = ''
  try { pauseState.value = await $fetch('/api/account/pause', { method: 'PUT', body: { choice } }) }
  catch (error: any) { pauseError.value = error?.data?.statusMessage || 'Your pause setting could not be updated.' }
  finally { savingPause.value = false }
}
async function managePlan() {
  openingBillingPortal.value = true
  billingError.value = ''
  try {
    const result = await $fetch<{ url: string }>('/api/stripe/portal', { method: 'POST' })
    await navigateTo(result.url, { external: true })
  } catch (error: any) {
    billingError.value = error?.data?.statusMessage || 'Subscription management could not be opened.'
    openingBillingPortal.value = false
  }
}
onMounted(async () => {
  await resolve({ force: true })
  await Promise.all([
    $fetch<any>('/api/account/pause').then(result => { pauseState.value = result }).catch(() => {}),
    $fetch<any>('/api/account/reliability').then(result => { reliability.value = result }).catch(() => {}),
  ])
  loading.value = false
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <NuxtLink to="/account/v2" class="inline-flex items-center gap-2 text-sm font-semibold text-[#8F1839] hover:underline"><ArrowLeft class="size-4" />Back to account details</NuxtLink>
      <p class="mt-7 text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Account</p>
      <h1 class="mt-2 text-4xl font-semibold">Plan and discovery controls</h1>
      <p class="mt-3 text-[#6E4D58]">Manage visibility, billing and your private date reliability history.</p>
      <p v-if="loading" class="mt-8 rounded-lg bg-white p-6 text-center text-sm text-[#6E4D58]">Loading account controls…</p>

      <div v-else class="mt-8 space-y-5">
        <section class="rounded-lg bg-[#2A1520] p-6 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)]">
          <HeartHandshake class="size-6 text-[#F7B7C4]" />
          <div class="mt-4 flex items-center gap-2"><h2 class="text-xl font-semibold">Plan preview</h2><span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="isPaidPlan ? 'bg-[#EAF2DE] text-[#4D2F39]' : 'bg-white/15 text-white'">{{ isPaidPlan ? 'Paid' : 'Free' }}</span></div>
          <p class="mt-2 text-sm text-white/75">You are currently on the <strong class="text-white">{{ planLabel }}</strong>.</p>
          <button v-if="isPaidPlan" type="button" class="mt-5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#8F1839] disabled:opacity-60" :disabled="openingBillingPortal" @click="managePlan">{{ openingBillingPortal ? 'Opening Stripe…' : 'Manage plan' }}</button>
          <NuxtLink v-else to="/upgrade" class="mt-5 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#8F1839]">View paid plans</NuxtLink>
          <p v-if="billingError" class="mt-3 text-sm font-semibold text-[#F7B7C4]" role="alert">{{ billingError }}</p>
        </section>

        <section class="rounded-lg bg-[#EAF2DE] p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><PauseCircle class="mt-1 size-5 text-[#6E8B52]" /><div class="min-w-0 flex-1">
            <h2 class="text-xl font-semibold">Pause discovery</h2><p class="mt-2 text-sm leading-6 text-[#4D2F39]">Hide your profile from new people while keeping existing matches, plans and dates available.</p>
            <div v-if="pauseState.paused" class="mt-4 rounded-lg bg-white/75 p-4"><p class="text-sm font-semibold">Your profile is paused<span v-if="pauseState.pausedUntil"> until {{ new Date(pauseState.pausedUntil).toLocaleDateString('en-GB', { dateStyle: 'long' }) }}</span><span v-else> indefinitely</span>.</p><button type="button" class="mt-3 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white" :disabled="savingPause" @click="updatePause('resume')">{{ savingPause ? 'Resuming…' : 'Resume discovery now' }}</button></div>
            <div v-else class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><label class="text-sm font-semibold">Pause for<select v-model="pauseChoice" class="mt-2 w-full rounded-lg border border-[#D8C8B6] bg-white px-4 py-3"><option value="7_days">7 days</option><option value="30_days">30 days</option><option value="indefinite">Until I resume</option></select></label><button type="button" class="rounded-lg bg-[#4D2F39] px-4 py-3 text-sm font-semibold text-white" :disabled="savingPause" @click="updatePause()">{{ savingPause ? 'Pausing…' : 'Pause my profile' }}</button></div>
            <p v-if="pauseError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ pauseError }}</p>
          </div></div>
        </section>

        <section v-if="reliability" class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><ShieldCheck class="mt-1 size-5 text-[#6E8B52]" /><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 class="text-xl font-semibold">Date reliability</h2><span class="rounded-full bg-[#EAF2DE] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#52713A]">Private</span></div><p class="mt-2 text-sm leading-6 text-[#4D2F39]">This history is private. Clear cancellations are not treated as no-shows.</p>
            <div class="mt-4 grid grid-cols-2 gap-3"><div class="rounded-lg bg-[#EAF2DE] p-4"><strong class="text-2xl">{{ reliability.attendedDates }}</strong><span class="mt-1 block text-xs">Dates confirmed as attended</span></div><div class="rounded-lg bg-[#FBF7F1] p-4"><strong class="text-2xl">{{ reliability.confirmedNoShows }}</strong><span class="mt-1 block text-xs">Confirmed no-shows</span></div></div>
            <p v-if="reliability.pendingReports" class="mt-3 rounded-lg bg-[#FFF1C7] p-3 text-xs font-semibold text-[#694C00]">You have an attendance report awaiting your response.</p>
            <p v-if="reliability.restrictedUntil && new Date(reliability.restrictedUntil) > new Date()" class="mt-3 rounded-lg bg-[#FCE3E8] p-3 text-xs font-semibold text-[#8F1839]">New discovery is paused until {{ new Date(reliability.restrictedUntil).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) }}.</p>
          </div></div>
        </section>
      </div>
    </section>
  </main>
</template>
