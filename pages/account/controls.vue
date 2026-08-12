<script setup lang="ts">
import { ArrowLeft, EyeOff, HeartHandshake, PauseCircle, ShieldCheck } from '@lucide/vue'

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
const controlsLoadError = ref('')
const pauseLoaded = ref(false)
const discoveryMode = ref<'standard' | 'incognito'>('standard')
const discoveryModeLoaded = ref(false)
const savingDiscoveryMode = ref(false)
const discoveryModeError = ref('')
const planLabel = computed(() => entitlement.value?.plan === 'yearly' ? 'Yearly supporter membership' : entitlement.value?.plan === 'quarterly' ? 'Three-month supporter membership' : entitlement.value?.plan === 'monthly' ? 'Monthly supporter membership' : 'Free core membership')
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
async function updateDiscoveryMode(mode: 'standard' | 'incognito') {
  savingDiscoveryMode.value = true
  discoveryModeError.value = ''
  try {
    const result = await $fetch<{ mode: 'standard' | 'incognito' }>('/api/account/discovery-mode', {
      method: 'PUT', body: { mode },
    })
    discoveryMode.value = result.mode
  } catch (error: any) {
    discoveryModeError.value = error?.data?.statusMessage || 'Your discovery privacy setting could not be updated.'
  } finally { savingDiscoveryMode.value = false }
}
async function loadControls() {
  loading.value = true
  controlsLoadError.value = ''
  await resolve({ force: true })
  const [pauseResult, reliabilityResult, discoveryModeResult] = await Promise.allSettled([
    $fetch<any>('/api/account/pause'),
    $fetch<any>('/api/account/reliability'),
    $fetch<{ mode: 'standard' | 'incognito' }>('/api/account/discovery-mode'),
  ])
  if (pauseResult.status === 'fulfilled') {
    pauseState.value = pauseResult.value
    pauseLoaded.value = true
  } else {
    pauseLoaded.value = false
    controlsLoadError.value = 'Your discovery pause setting could not be loaded.'
  }
  if (reliabilityResult.status === 'fulfilled') reliability.value = reliabilityResult.value
  else controlsLoadError.value ||= 'Your attendance history could not be loaded.'
  if (discoveryModeResult.status === 'fulfilled') {
    discoveryMode.value = discoveryModeResult.value.mode
    discoveryModeLoaded.value = true
  } else {
    discoveryModeLoaded.value = false
    controlsLoadError.value ||= 'Your discovery privacy setting could not be loaded.'
  }
  loading.value = false
}
onMounted(async () => {
  await loadControls()
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <NuxtLink to="/account/v2" class="inline-flex items-center gap-2 text-sm font-semibold text-[#8F1839] hover:underline"><ArrowLeft class="size-4" />Back to account details</NuxtLink>
      <p class="mt-7 text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Account</p>
      <h1 class="mt-2 text-4xl font-semibold">Your membership and privacy</h1>
      <p class="mt-3 text-[#6E4D58]">Manage an optional supporter membership, take a break from meeting new people and review your private attendance history.</p>
      <p v-if="loading" class="mt-8 rounded-lg bg-white p-6 text-center text-sm text-[#6E4D58]">Loading account controls…</p>

      <div v-else class="mt-8 space-y-5">
        <div v-if="controlsLoadError" class="rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">
          <p>{{ controlsLoadError }}</p><button type="button" class="mt-3 rounded-lg bg-white px-4 py-2" @click="loadControls">Try again</button>
        </div>
        <section class="rounded-lg bg-[#2A1520] p-6 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)]">
          <HeartHandshake class="size-6 text-[#F7B7C4]" />
          <div class="mt-4 flex items-center gap-2"><h2 class="text-xl font-semibold">Your membership</h2><span class="rounded-full px-2.5 py-1 text-xs font-bold" :class="isPaidPlan ? 'bg-[#EAF2DE] text-[#4D2F39]' : 'bg-white/15 text-white'">{{ isPaidPlan ? 'Supporter' : 'Core' }}</span></div>
          <p class="mt-2 text-sm text-white/75">You are currently on the <strong class="text-white">{{ planLabel }}</strong>.</p>
          <p class="mt-2 text-sm text-white/75">Supporting never changes who can see you, your ranking, match capacity, planning tools or safety controls.</p>
          <button v-if="isPaidPlan" type="button" class="mt-5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#8F1839] disabled:opacity-60" :disabled="openingBillingPortal" @click="managePlan">{{ openingBillingPortal ? 'Opening Stripe…' : 'Manage support' }}</button>
          <NuxtLink v-else to="/upgrade" class="mt-5 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#8F1839]">Support Lonely Radish</NuxtLink>
          <p v-if="billingError" class="mt-3 text-sm font-semibold text-[#F7B7C4]" role="alert">{{ billingError }}</p>
        </section>

        <section v-if="pauseLoaded" class="rounded-lg bg-[#EAF2DE] p-6 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><PauseCircle class="mt-1 size-5 text-[#6E8B52]" /><div class="min-w-0 flex-1">
            <h2 class="text-xl font-semibold">Take a break</h2><p class="mt-2 text-sm leading-6 text-[#4D2F39]">Stop showing your profile to new people without affecting your existing matches or plans.</p>
            <div v-if="pauseState.paused" class="mt-4 rounded-lg bg-white/75 p-4"><p class="text-sm font-semibold">Your profile is paused<span v-if="pauseState.pausedUntil"> until {{ new Date(pauseState.pausedUntil).toLocaleDateString('en-GB', { dateStyle: 'long' }) }}</span><span v-else> indefinitely</span>.</p><button type="button" class="mt-3 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white" :disabled="savingPause" @click="updatePause('resume')">{{ savingPause ? 'Resuming…' : 'Resume discovery now' }}</button></div>
            <div v-else class="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"><label class="text-sm font-semibold">Pause for<select v-model="pauseChoice" class="mt-2 w-full rounded-lg border border-[#D8C8B6] bg-white px-4 py-3"><option value="7_days">7 days</option><option value="30_days">30 days</option><option value="indefinite">Until I resume</option></select></label><button type="button" class="rounded-lg bg-[#4D2F39] px-4 py-3 text-sm font-semibold text-white" :disabled="savingPause" @click="updatePause()">{{ savingPause ? 'Pausing…' : 'Pause my profile' }}</button></div>
            <p v-if="pauseError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ pauseError }}</p>
          </div></div>
        </section>

        <section v-if="discoveryModeLoaded" class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><EyeOff class="mt-1 size-5 text-[#8F1839]" /><div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2"><h2 class="text-xl font-semibold">Only people I choose</h2><span class="rounded-full bg-[#FCE3E8] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#8F1839]">Incognito</span></div>
            <p class="mt-2 text-sm leading-6 text-[#4D2F39]">Browse normally without appearing in general discovery. After you show interest in someone, they can see your profile and decide whether to respond.</p>
            <p class="mt-2 text-xs leading-5 text-[#6E4D58]">Existing interests, matches and plans keep working. Blocking always hides both people from each other. This privacy option is available to everyone.</p>
            <fieldset class="mt-4 grid gap-3 sm:grid-cols-2" :disabled="savingDiscoveryMode">
              <legend class="sr-only">Choose who can discover your profile</legend>
              <label class="flex cursor-pointer items-start gap-3 rounded-lg border p-4" :class="discoveryMode === 'standard' ? 'border-[#B4234A] bg-[#FCE3E8]' : 'border-[#E8D8C4] bg-[#FBF7F1]'">
                <input :checked="discoveryMode === 'standard'" class="mt-1 size-4 accent-[#B4234A]" type="radio" name="discovery-mode" value="standard" @change="updateDiscoveryMode('standard')">
                <span><strong class="block">Appear in discovery</strong><span class="mt-1 block text-xs leading-5 text-[#6E4D58]">Compatible people can find your profile.</span></span>
              </label>
              <label class="flex cursor-pointer items-start gap-3 rounded-lg border p-4" :class="discoveryMode === 'incognito' ? 'border-[#B4234A] bg-[#FCE3E8]' : 'border-[#E8D8C4] bg-[#FBF7F1]'">
                <input :checked="discoveryMode === 'incognito'" class="mt-1 size-4 accent-[#B4234A]" type="radio" name="discovery-mode" value="incognito" @change="updateDiscoveryMode('incognito')">
                <span><strong class="block">Only people I choose</strong><span class="mt-1 block text-xs leading-5 text-[#6E4D58]">You become visible after showing interest.</span></span>
              </label>
            </fieldset>
            <p v-if="savingDiscoveryMode" class="mt-3 text-sm text-[#6E4D58]" role="status">Saving discovery privacy…</p>
            <p v-if="discoveryModeError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ discoveryModeError }}</p>
          </div></div>
        </section>

        <section v-if="reliability" class="rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
          <div class="flex items-start gap-3"><ShieldCheck class="mt-1 size-5 text-[#6E8B52]" /><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 class="text-xl font-semibold">Your attendance history</h2><span class="rounded-full bg-[#EAF2DE] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#52713A]">Private</span></div><p class="mt-2 text-sm leading-6 text-[#4D2F39]">Only you can see this. Cancelling clearly is not counted as a no-show.</p>
            <div class="mt-4 grid grid-cols-2 gap-3"><div class="rounded-lg bg-[#EAF2DE] p-4"><strong class="text-2xl">{{ reliability.attendedDates }}</strong><span class="mt-1 block text-xs">Dates confirmed as attended</span></div><div class="rounded-lg bg-[#FBF7F1] p-4"><strong class="text-2xl">{{ reliability.confirmedNoShows }}</strong><span class="mt-1 block text-xs">Confirmed no-shows</span></div></div>
            <p v-if="reliability.pendingReports" class="mt-3 rounded-lg bg-[#FFF1C7] p-3 text-xs font-semibold text-[#694C00]">You have an attendance report awaiting your response.</p>
            <p v-if="reliability.restrictedUntil && new Date(reliability.restrictedUntil) > new Date()" class="mt-3 rounded-lg bg-[#FCE3E8] p-3 text-xs font-semibold text-[#8F1839]">New discovery is paused until {{ new Date(reliability.restrictedUntil).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) }}.</p>
          </div></div>
        </section>
      </div>
    </section>
  </main>
</template>
