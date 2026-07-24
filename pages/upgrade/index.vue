<script setup lang="ts">

definePageMeta({ layout: 'default' })

import { CalendarDays, HeartHandshake, MapPin, ShieldCheck, Sparkles, Tags } from '@lucide/vue';
import { markRaw } from 'vue';
import { useUpgrade } from '@/composables/useUpgrade';
import { useMeStateV2 } from '~/composables/useMeStateV2';
import { hasPaidAccess } from '~/utils/paidAccess';

const {
  authReady,
  entitlement,
} = useMeStateV2();

const isSubscribed = computed(() =>
  authReady.value && hasPaidAccess(entitlement.value!)
)

const monthlyPrice = 7.99
const quarterlyPrice = 19.99
const yearlyPrice = 55.99
const quarterlySavings = (monthlyPrice * 3 - quarterlyPrice).toFixed(2)
const quarterlyMonthlyEquivalent = (quarterlyPrice / 3).toFixed(2)
const yearlySavings = (monthlyPrice * 12 - yearlyPrice).toFixed(2)
const yearlyMonthlyEquivalent = (yearlyPrice / 12).toFixed(2)
const upgradingPlan = ref<'monthly' | 'quarterly' | 'yearly' | null>(null)
const upgradeError = ref('')

const benefits = [
  { icon: markRaw(Tags), text: 'Choose up to 10 activity interests instead of 5' },
  { icon: markRaw(HeartHandshake), text: 'Keep up to 5 active matches instead of 3' },
  { icon: markRaw(HeartHandshake), text: 'More thoughtful matches around shared activities' },
  { icon: markRaw(CalendarDays), text: 'Priority availability matching around real plan windows' },
  { icon: markRaw(Sparkles), text: 'Activity planning tools and public-place shortlists' },
  { icon: markRaw(MapPin), text: 'More flexible neighbourhood and distance preferences' },
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

        <!-- Benefits -->
        <div class="mx-auto max-w-xl rounded-lg bg-[#FBF7F1] p-5 md:p-6">
          <ul class="space-y-3 text-left leading-relaxed text-[#4D2F39]">
            <li v-for="benefit in benefits" :key="benefit.text" class="flex items-start gap-3">
              <component :is="benefit.icon" class="mt-0.5 h-4 w-4 shrink-0 text-[#B4234A]" aria-hidden="true" />
              <span>{{ benefit.text }}</span>
            </li>
          </ul>
        </div>

        <!-- Plans -->
        <div class="mx-auto grid w-full max-w-3xl gap-3 pt-4 sm:grid-cols-3">
          <p class="text-sm text-[#6E4D58] sm:col-span-3">
            Choose a plan
          </p>

          <button class="block w-full rounded-lg bg-[#FCE3E8] px-3 py-3 font-medium text-[#2A1520] transition shadow-sm"
            :class="isSubscribed
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-[#F7D4DC] active:scale-[0.98]'" :disabled="isSubscribed || Boolean(upgradingPlan)" @click="upgrade('monthly')">
            <span class="block">{{ upgradingPlan === 'monthly' ? 'Opening secure checkout…' : `Monthly plan · £${monthlyPrice}` }}</span>
            <span class="mt-0.5 block text-xs text-[#6E4D58]">Flexible month-to-month billing</span>
          </button>

          <button class="block w-full rounded-lg bg-[#F3E8DA] px-3 py-3 font-medium text-[#2A1520] transition shadow-sm"
            :class="isSubscribed
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-[#E8D8C4] active:scale-[0.98]'" :disabled="isSubscribed || Boolean(upgradingPlan)" @click="upgrade('quarterly')">
            <span class="block">{{ upgradingPlan === 'quarterly' ? 'Opening secure checkout…' : `Three-month plan · £${quarterlyPrice}` }}</span>
            <span class="mt-0.5 block text-xs text-[#6E4D58]">≈ £{{ quarterlyMonthlyEquivalent }}/mo · Save £{{ quarterlySavings }}</span>
          </button>

          <button class="block w-full rounded-lg bg-[#B4234A] px-3 py-3 font-medium text-white transition shadow-[0_12px_26px_rgba(180,35,74,0.18)]" :class="isSubscribed
            ? 'opacity-60 cursor-not-allowed'
            : 'hover:bg-[#8F1839] active:scale-[0.98]'" :disabled="isSubscribed || Boolean(upgradingPlan)" @click="upgrade('yearly')">
            <span class="block">{{ upgradingPlan === 'yearly' ? 'Opening secure checkout…' : `Yearly plan · £${yearlyPrice}` }}</span>
            <span class="mt-0.5 block text-xs text-white/80">≈ £{{ yearlyMonthlyEquivalent }}/mo · Save £{{ yearlySavings }}</span>
          </button>

        </div>
        <p v-if="upgradeError" class="mx-auto max-w-md rounded-lg bg-[#FCE3E8] p-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ upgradeError }}</p>

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
