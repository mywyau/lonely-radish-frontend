<script setup lang="ts">

definePageMeta({ layout: 'default' })

import { Info } from '@lucide/vue';
import { useUpgrade } from '@/composables/useUpgrade';
import { hasPaidAccess } from '~/utils/paidAccess';

const { authReady, entitlement } = useMeStateV2();

const monthlyPrice = 7.99
const quarterlyPrice = 19.99
const yearlyPrice = 55.99
const quarterlySavings = (monthlyPrice * 3 - quarterlyPrice).toFixed(2)
const quarterlyMonthlyEquivalent = (quarterlyPrice / 3).toFixed(2)
const yearlySavings = (monthlyPrice * 12 - yearlyPrice).toFixed(2)
const yearlyMonthlyEquivalent = (yearlyPrice / 12).toFixed(2)

function upgrade(billing: 'monthly' | 'quarterly' | 'yearly') {
  useUpgrade(billing)
}

const isSubscribed = computed(() =>
  authReady.value && hasPaidAccess(entitlement.value!)
)

</script>

<template>
  <main class="min-h-[70vh] bg-[#FBF7F1] px-4 pb-8 pt-6 text-[#2A1520]">
    <div class="mx-auto max-w-md">
      <div class="space-y-6 rounded-lg p-8 text-center sm:p-10">
        <div class="w-full max-w-md space-y-6 text-center">

          <div class="flex justify-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-[#FCE3E8] text-[#B4234A]">
              <Info class="h-8 w-8" aria-hidden="true" />
            </div>
          </div>

          <h1 class="text-2xl font-semibold">
            Payment cancelled
          </h1>

          <p class="text-[#6E4D58]">
            No worries! Your payment was cancelled and no charges were made.
          </p>

          <p class="text-sm text-[#6E4D58]">
            If you’d like to try again, please choose a plan below.
          </p>

          <div class="space-y-3 pt-4">
            <p class="text-sm text-[#6E4D58]">
              Choose a plan
            </p>

            <button class="block w-full rounded-lg bg-[#FCE3E8] px-3 py-3 font-medium transition shadow-sm"
              :class="isSubscribed
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:bg-[#F7D4DC] active:scale-[0.98]'" :disabled="isSubscribed" @click="upgrade('monthly')">
              <span class="block">Monthly plan · £{{ monthlyPrice }}</span>
              <span class="mt-0.5 block text-xs text-[#6E4D58]">Flexible month-to-month billing</span>
            </button>

            <button class="block w-full rounded-lg bg-[#F3E8DA] px-3 py-3 font-medium transition shadow-sm"
              :class="isSubscribed
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:bg-[#E8D8C4] active:scale-[0.98]'" :disabled="isSubscribed" @click="upgrade('quarterly')">
              <span class="block">Three-month plan · £{{ quarterlyPrice }}</span>
              <span class="mt-0.5 block text-xs text-[#6E4D58]">≈ £{{ quarterlyMonthlyEquivalent }}/mo · Save £{{ quarterlySavings }}</span>
            </button>

            <button class="block w-full rounded-lg bg-[#B4234A] px-3 py-3 font-medium text-white transition shadow-[0_12px_26px_rgba(180,35,74,0.18)]" :class="isSubscribed
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-[#8F1839] active:scale-[0.98]'" :disabled="isSubscribed" @click="upgrade('yearly')">
              <span class="block">Yearly plan · £{{ yearlyPrice }}</span>
              <span class="mt-0.5 block text-xs text-white/80">≈ £{{ yearlyMonthlyEquivalent }}/mo · Save £{{ yearlySavings }}</span>
            </button>
          </div>

          <NuxtLink to="/matches" class="block pt-4 text-sm text-[#6E4D58] hover:text-[#B4234A] hover:underline">
            Continue without upgrading
          </NuxtLink>

          <p class="pt-4 text-sm font-bold text-[#7C5963]">
            You can safely close this page.
          </p>

        </div>
      </div>
    </div>
  </main>
</template>
