<script setup lang="ts">
import { CircleCheck, LoaderCircle } from '@lucide/vue'

definePageMeta({ middleware: 'logged-in', title: 'Payment received · Lonely Radish' })

type BillingState = { hasPaidAccess: boolean; isActivating: boolean; plan: string; subscriptionStatus?: string | null }
const activation = ref<'checking' | 'active' | 'pending' | 'error'>('checking')
const billing = ref<BillingState | null>(null)

async function checkActivation() {
  activation.value = 'checking'
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      billing.value = await $fetch<BillingState>('/api/billing/me')
      if (billing.value.hasPaidAccess) {
        activation.value = 'active'
        await useMeStateV2().resolve({ force: true })
        return
      }
      if (attempt < 7) await new Promise(resolve => window.setTimeout(resolve, 1500))
    }
    activation.value = 'pending'
  } catch {
    activation.value = 'error'
  }
}

onMounted(checkActivation)
</script>

<template>
  <main class="min-h-[70vh] bg-[#FBF7F1] px-5 py-16 text-[#2A1520]">
    <section class="mx-auto max-w-2xl rounded-lg bg-white p-6 text-center shadow-[0_12px_30px_rgba(180,35,74,0.08)] sm:p-8">
      <div class="mx-auto flex size-16 items-center justify-center rounded-full" :class="activation === 'active' ? 'bg-[#EAF2DE]' : 'bg-[#F3E8DA]'">
        <CircleCheck v-if="activation === 'active'" class="size-9 text-[#52713A]" aria-hidden="true" />
        <LoaderCircle v-else class="size-8 animate-spin text-[#B4234A]" aria-hidden="true" />
      </div>
      <h1 class="mt-6 text-3xl font-semibold">{{ activation === 'active' ? 'Your paid plan is active' : 'Payment received' }}</h1>
      <p v-if="activation === 'checking'" class="mt-3 text-[#6E4D58]">We’re securely confirming your subscription. This normally takes only a few seconds.</p>
      <p v-else-if="activation === 'active'" class="mt-3 text-[#6E4D58]">Stripe confirmed your subscription and your Lonely Radish account has been updated.</p>
      <p v-else-if="activation === 'pending'" class="mt-3 text-[#6E4D58]">Your payment was received, but account activation is still processing. You can safely leave this page and check again shortly.</p>
      <p v-else class="mt-3 text-[#6E4D58]">We couldn’t check your plan just now. Your payment is not affected; try checking again.</p>
      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button v-if="activation !== 'active'" type="button" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white" @click="checkActivation">Check again</button>
        <NuxtLink :to="activation === 'active' ? '/account/v2' : '/matches'" class="rounded-lg bg-[#2A1520] px-5 py-3 text-sm font-semibold text-white">{{ activation === 'active' ? 'View my plan' : 'Continue to matches' }}</NuxtLink>
      </div>
    </section>
  </main>
</template>
