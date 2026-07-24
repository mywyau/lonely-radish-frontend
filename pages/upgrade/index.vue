<script setup lang="ts">

definePageMeta({ layout: 'default' })

import { CalendarDays, ChevronDown, HeartHandshake, MapPin, ShieldCheck, Sparkles, Tags } from '@lucide/vue';
import { markRaw } from 'vue';
import { useUpgrade } from '@/composables/useUpgrade';
import { useMeStateV2 } from '~/composables/useMeStateV2';
import { hasPaidAccess } from '~/utils/paidAccess';

const {
  authReady,
  entitlement,
  resolve,
} = useMeStateV2();

const currentPlan = computed(() => entitlement.value?.plan || null)
const isSubscribed = computed(() =>
  authReady.value && hasPaidAccess(entitlement.value!)
)
const currentPlanLabel = computed(() => ({
  free: 'Free plan',
  monthly: 'Monthly plan',
  quarterly: 'Three-month plan',
  yearly: 'Yearly plan',
}[currentPlan.value || ''] || ''))
const isCurrentPlan = (plan: 'monthly' | 'quarterly' | 'yearly') => currentPlan.value === plan

const monthlyPrice = 7.99
const quarterlyPrice = 19.99
const yearlyPrice = 55.99
const quarterlySavings = (monthlyPrice * 3 - quarterlyPrice).toFixed(2)
const quarterlyMonthlyEquivalent = (quarterlyPrice / 3).toFixed(2)
const yearlySavings = (monthlyPrice * 12 - yearlyPrice).toFixed(2)
const yearlyMonthlyEquivalent = (yearlyPrice / 12).toFixed(2)
const upgradingPlan = ref<'monthly' | 'quarterly' | 'yearly' | null>(null)
const upgradeError = ref('')
const showPaidPlans = ref(false)

const benefits = [
  { icon: markRaw(HeartHandshake), text: 'Respectfully apologise to previous matches and rejections' },
  { icon: markRaw(CalendarDays), text: 'See past connections' },
  { icon: markRaw(Sparkles), text: 'Get deals with partners and brand discounts' },
  { icon: markRaw(MapPin), text: 'Incognitio Discovery' },
  { icon: markRaw(ShieldCheck), text: 'Extra safety and privacy controls as they launch' },
  { icon: markRaw(Tags), text: 'Early access to new dating features' },
  { icon: markRaw(Sparkles), text: 'Profile polish tools for clearer first impressions' },
]

// Already paid → manage subscription instead
async function upgrade(plan: 'monthly' | 'quarterly' | 'yearly') {
  if (isSubscribed.value) {
    navigateTo('/account/v2')
    return
  }
  upgradingPlan.value = plan
  upgradeError.value = ''
  try {
    await useUpgrade(plan)
  } catch (error: any) {
    upgradeError.value = error?.data?.statusMessage || 'Secure checkout could not be started. Please try again.'
    upgradingPlan.value = null
  }
}

onMounted(() => resolve())
</script>

<template>
  <main class="min-h-[70vh] bg-[#FBF7F1] px-4 pb-10 pt-6 text-[#2A1520]">
    <div class="mx-auto max-w-3xl">



      <!-- Card -->
      <div class="space-y-6 p-6 text-center md:p-10">

        <!-- Icon -->
        <div class="flex justify-center">
          <div class="flex h-20 w-20 items-center justify-center rounded-full bg-[#FCE3E8] text-[#B4234A]">
            <Sparkles class="h-10 w-10" aria-hidden="true" />
          </div>
        </div>

        <!-- Title -->
        <h1 class="text-2xl font-semibold">
          Upgrade your plan
        </h1>

        <p class="mx-auto max-w-xl text-[#6E4D58]">
          Unlock premium matching, activity planning, and profile tools as they become available.
        </p>

        <!-- <p v-if="authReady && currentPlan"
          class="mx-auto inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm text-[#4D2F39] shadow-sm"
          role="status">
          Your current plan: <strong>{{ currentPlanLabel }}</strong>
        </p> -->

        <!-- Benefits -->
        <div class="mx-auto max-w-xl rounded-lg bg-[#FBF7F1] p-5 md:p-6">
          <ul class="space-y-3 text-left leading-relaxed text-[#4D2F39]">
            <li v-for="benefit in benefits" :key="benefit.text" class="flex items-start gap-3">
              <component :is="benefit.icon" class="mt-0.5 h-4 w-4 shrink-0 text-[#B4234A]" aria-hidden="true" />
              <span>{{ benefit.text }}</span>
            </li>
          </ul>
        </div>

        <section class="mx-auto grid w-full max-w-3xl gap-3 text-left sm:grid-cols-2"
          aria-labelledby="plan-limits-title">
          <h2 id="plan-limits-title" class="sr-only">Free and paid plan limits</h2>
          <div class="relative rounded-lg border bg-white p-5"
            :class="currentPlan === 'free' ? 'border-[#B4234A] ring-2 ring-[#F7B7C4]' : 'border-[#E8D8C4]'">
            <span v-if="currentPlan === 'free'"
              class="absolute right-4 top-4 rounded-full bg-[#B4234A] px-2.5 py-1 text-[11px] font-bold text-white">Current plan</span>
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#6E4D58]">Free plan</p>
            <h3 class="mt-2 text-lg font-semibold">Core free experience</h3>
            <ul class="mt-4 space-y-2 text-sm text-[#4D2F39]">
              <li class="flex items-center gap-2">
                <Tags class="size-4 text-[#B4234A]" />Up to 5 active activity interests
              </li>
              <li class="flex items-center gap-2">
                <HeartHandshake class="size-4 text-[#B4234A]" />Up to 3 active matches
              </li>
            </ul>
          </div>
          <button type="button"
            class="rounded-lg border bg-[#FCE3E8] p-5 text-left shadow-[0_10px_24px_rgba(180,35,74,0.08)] transition hover:border-[#B4234A] hover:bg-[#F7D4DC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B4234A] focus-visible:ring-offset-2"
            :class="showPaidPlans ? 'border-[#B4234A] ring-2 ring-[#F7B7C4]' : 'border-[#E6A8B8]'"
            :aria-expanded="showPaidPlans" aria-controls="paid-plan-options"
            @click="showPaidPlans = !showPaidPlans">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#8F1839]">All paid plans</p>
            <h3 class="mt-2 text-lg font-semibold">More room to discover and plan</h3>
            <div class="mt-4 space-y-2 text-sm text-[#4D2F39]">
              <p class="flex items-center gap-2">
                <Tags class="size-4 text-[#B4234A]" />Up to 10 active activity interests
              </p>
              <p class="flex items-center gap-2">
                <HeartHandshake class="size-4 text-[#B4234A]" />Up to 5 active matches
              </p>
            </div>
            <span class="mt-5 flex items-center justify-between text-sm font-semibold text-[#8F1839]">
              {{ showPaidPlans ? 'Hide pricing options' : 'View pricing options' }}
              <ChevronDown class="size-5 transition-transform" :class="showPaidPlans && 'rotate-180'" aria-hidden="true" />
            </span>
          </button>
        </section>

        <!-- Plans -->
        <div v-show="showPaidPlans" id="paid-plan-options"
          class="mx-auto grid w-full max-w-3xl gap-3 pt-4 sm:grid-cols-3">
          <p class="text-sm text-[#6E4D58] sm:col-span-3">
            Choose a plan
          </p>

          <button class="block w-full rounded-lg bg-[#FCE3E8] px-3 py-3 font-medium text-[#2A1520] transition shadow-sm"
            :class="isSubscribed
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-[#F7D4DC] active:scale-[0.98]'" :disabled="isSubscribed || Boolean(upgradingPlan)"
            @click="upgrade('monthly')">
            <span v-if="isCurrentPlan('monthly')"
              class="mb-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#8F1839]">Current plan</span>
            <span class="block">{{ upgradingPlan === 'monthly' ? 'Opening secure checkout…' : `Monthly plan ·
              £${monthlyPrice}` }}</span>
            <span class="mt-0.5 block text-xs text-[#6E4D58]">Flexible month-to-month billing</span>
          </button>

          <button class="block w-full rounded-lg bg-[#F3E8DA] px-3 py-3 font-medium text-[#2A1520] transition shadow-sm"
            :class="isSubscribed
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-[#E8D8C4] active:scale-[0.98]'" :disabled="isSubscribed || Boolean(upgradingPlan)"
            @click="upgrade('quarterly')">
            <span v-if="isCurrentPlan('quarterly')"
              class="mb-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#8F1839]">Current plan</span>
            <span class="block">{{ upgradingPlan === 'quarterly' ? 'Opening secure checkout…' : `Three-month plan ·
              £${quarterlyPrice}` }}</span>
            <span class="mt-0.5 block text-xs text-[#6E4D58]">≈ £{{ quarterlyMonthlyEquivalent }}/mo · Save £{{
              quarterlySavings }}</span>
          </button>

          <button
            class="block w-full rounded-lg bg-[#B4234A] px-3 py-3 font-medium text-white transition shadow-[0_12px_26px_rgba(180,35,74,0.18)]"
            :class="isSubscribed
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-[#8F1839] active:scale-[0.98]'" :disabled="isSubscribed || Boolean(upgradingPlan)"
            @click="upgrade('yearly')">
            <span v-if="isCurrentPlan('yearly')"
              class="mb-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-[#8F1839]">Current plan</span>
            <span class="block">{{ upgradingPlan === 'yearly' ? 'Opening secure checkout…' : `Yearly plan ·
              £${yearlyPrice}` }}</span>
            <span class="mt-0.5 block text-xs text-white/80">≈ £{{ yearlyMonthlyEquivalent }}/mo · Save £{{
              yearlySavings }}</span>
          </button>

        </div>
        <p v-if="upgradeError" class="mx-auto max-w-md rounded-lg bg-[#FCE3E8] p-3 text-sm font-semibold text-[#8F1839]"
          role="alert">{{ upgradeError }}</p>

        <!-- Subscribed -->
        <p v-if="isSubscribed" class="text-sm text-[#6E4D58]">
          You’re already subscribed.
          <NuxtLink to="/account/v2" class="text-[#B4234A] hover:underline">
            Manage your plan
          </NuxtLink>
        </p>

        <!-- Continue without upgrading -->
        <p v-if="!isSubscribed" class="text-sm text-[#6E4D58]">
          <NuxtLink to="/matches" class="hover:text-[#B4234A] hover:underline">
            Continue without upgrading
          </NuxtLink>
        </p>

        <p class="text-sm text-[#6E4D58]">
          <NuxtLink to="/refund-policy" class="hover:text-[#B4234A] hover:underline">
            View refund policy
          </NuxtLink>
        </p>

        <p class="pt-4 text-xs text-[#7C5963]">
          You can cancel your plan at any time.
        </p>

      </div>
    </div>
  </main>
</template>
