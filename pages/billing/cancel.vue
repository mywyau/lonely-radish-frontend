<script setup lang="ts">

definePageMeta({ layout: 'default' })

import { Info } from '@lucide/vue';
import { useUpgrade } from '@/composables/useUpgrade';
import { hasPaidAccess } from '~/utils/paidAccess';

const { authReady, entitlement } = useMeStateV2();

const monthlyPrice = 4.99
const yearlyPrice = 49.99
const yearlySavings = (monthlyPrice * 12 - yearlyPrice).toFixed(2)
const yearlyMonthlyEquivalent = (yearlyPrice / 12).toFixed(2)

function upgrade(billing: 'monthly' | 'yearly') {
  useUpgrade(billing)
}

const isSubscribed = computed(() =>
  authReady.value && hasPaidAccess(entitlement.value!)
)

</script>

<template>
  <main class="min-h-[70vh] px-4 pt-6 pb-6">
    <div class="max-w-md mx-auto">
      <div class="p-10 text-center space-y-6">
        <div class="max-w-md w-full text-center space-y-6">

          <div class="flex justify-center">
            <div class="flex h-16 w-16 items-center justify-center rounded-full bg-[#F6E1E1] text-[#7A6FCB]">
              <Info class="h-8 w-8" aria-hidden="true" />
            </div>
          </div>

          <h1 class="text-2xl font-semibold">
            Payment cancelled
          </h1>

          <p class="text-gray-600">
            No worries! Your payment was cancelled and no charges were made.
          </p>

          <p class="text-sm text-gray-500">
            If you’d like to try again, please choose a plan below.
          </p>

          <div class="space-y-3 pt-4">
            <p class="text-sm text-gray-500">
              Choose a plan
            </p>

            <!-- Monthly (Pastel themed) -->
            <button class="block w-full rounded-xl py-3 font-medium transition shadow-sm"
              style="background-color:#A8CAE0;" :class="isSubscribed
                ? 'opacity-60 cursor-not-allowed'
                : 'hover:brightness-110 active:scale-[0.98]'" :disabled="isSubscribed" @click="upgrade('monthly')">
              <span class="block">Monthly plan · £{{ monthlyPrice }}</span>
              <span class="block text-xs text-gray-700 mt-0.5">Flexible month-to-month billing</span>
            </button>

            <!-- Yearly (KEEP BLACK) -->
            <button class="block w-full rounded-xl text-black px-3 py-3 font-medium transition shadow-md" :class="isSubscribed
              ? 'opacity-60 cursor-not-allowed'
              : 'hover:bg-gray-800 active:scale-[0.98]'" :disabled="isSubscribed" @click="upgrade('yearly')"
              style="background-color:rgba(244,205,39,0.35);">
              <span class="block">Yearly plan · £{{ yearlyPrice }}</span>
              <span class="block text-xs text-gray-700 mt-0.5">≈ £{{ yearlyMonthlyEquivalent }}/mo · Get 2 months free</span>
            </button>
          </div>

          <NuxtLink to="/coming-soon" class="block pt-4 text-sm text-gray-500 hover:underline">
            Continue without upgrading
          </NuxtLink>

          <p class="text-sm text-gray-400 pt-4">
            You can safely close this page.
          </p>

        </div>
      </div>
    </div>
  </main>
</template>
