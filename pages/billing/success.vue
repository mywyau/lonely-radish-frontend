<script setup lang="ts">
import { CircleCheck, Hourglass, TriangleAlert } from '@lucide/vue'
definePageMeta({
  layout: "default",
})

type BillingMeResponse = {
  plan: string
  subscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  canceledAt: string | null
  hasPaidAccess: boolean
  isActivating: boolean
  latestStripeEvent: {
    status: string
    eventType: string
    receivedAt: string
    processedAt: string | null
  } | null
}

const status = ref<"loading" | "active" | "delayed" | "error">("loading")
const errorMessage = ref("")
const billing = ref<BillingMeResponse | null>(null)

let intervalId: ReturnType<typeof setInterval> | null = null
let delayedTimer: ReturnType<typeof setTimeout> | null = null

async function checkBillingStatus() {

  const { getAccessToken } = await useAuth()

  const token = await getAccessToken();

  try {
    const data = await $fetch<BillingMeResponse>("/api/billing/me", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    billing.value = data

    if (data.hasPaidAccess) {
      status.value = "active"

      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }

      if (delayedTimer) {
        clearTimeout(delayedTimer)
        delayedTimer = null
      }

      return
    }

    if (data.isActivating) {
      if (status.value !== "delayed") {
        status.value = "loading"
      }
      return
    }

    // not active and not activating = stop polling and show fallback
    status.value = "error"
    errorMessage.value = "No active subscription was found for this account."

    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }

    if (delayedTimer) {
      clearTimeout(delayedTimer)
      delayedTimer = null
    }
  } catch (error: any) {
    console.error("Failed to load billing status", error)
    status.value = "error"
    errorMessage.value = "We couldn't confirm your subscription just yet."
  }
}

onMounted(async () => {
  await checkBillingStatus()

  if (status.value === "active" || status.value === "error") {
    return
  }

  delayedTimer = setTimeout(() => {
    if (status.value === "loading") {
      status.value = "delayed"
    }
  }, 8000)

  intervalId = setInterval(async () => {
    if (status.value === "active" || status.value === "error") {
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
      }
      return
    }

    await checkBillingStatus()
  }, 1500)
})

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }

  if (delayedTimer) {
    clearTimeout(delayedTimer)
  }
})
</script>

<template>
  <main class="min-h-[70vh] flex items-center justify-center px-4">

    <div class="max-w-md w-full text-center space-y-6">

      <template v-if="status === 'loading'">

        <h1 class="text-2xl font-semibold">
          Activating your subscription
        </h1>

        <p class="text-gray-600">
          Your payment was received. We're confirming your subscription now.
        </p>

        <div class="flex justify-center pt-2">
          <div class="h-8 w-8 rounded-full border-4 border-gray-200 border-t-gray-500 animate-spin" />
        </div>

        <p class="text-xs text-gray-400 pt-4">
          This usually only takes a few seconds.
        </p>
      </template>

      <template v-else-if="status === 'delayed'">
        <div class="flex justify-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-[#F6E1E1] text-amber-600">
            <Hourglass class="h-8 w-8" aria-hidden="true" />
          </div>
        </div>

        <h1 class="text-2xl font-semibold">
          Still confirming your subscription
        </h1>

        <p class="text-gray-600">
          Your payment was received. Activation is taking a little longer than usual.
        </p>

        <div class="space-y-3 pt-4">
          <button type="button"
            class="block w-full rounded-lg text-black py-3 font-medium hover:brightness-110 transition"
            style="background-color:#D6A3D1;" @click="checkBillingStatus">
            Check again
          </button>

          <NuxtLink to="/account/v2" class="block text-sm text-gray-500 hover:underline">
            Go to account
          </NuxtLink>
        </div>

        <p class="text-xs text-gray-400 pt-4">
          You can stay on this page while we keep checking.
        </p>
      </template>

      <template v-else-if="status === 'active'">
        <div class="flex justify-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CircleCheck class="h-9 w-9" aria-hidden="true" />
          </div>
        </div>

        <h1 class="text-2xl font-semibold">
          Payment successful
        </h1>

        <p class="text-gray-600">
          Thank you! Your subscription is active and your access is ready.
        </p>

        <div class="space-y-3 pt-4">
          <NuxtLink to="/levels"
            class="block w-full rounded-lg text-black py-3 font-medium hover:brightness-110 transition"
            style="background-color:#D6A3D1;">
            Continue learning
          </NuxtLink>

          <NuxtLink to="/account/v2" class="block text-sm text-gray-500 hover:underline">
            View account
          </NuxtLink>
        </div>

        <p class="text-xs text-gray-400 pt-4">
          You can safely close this page.
        </p>

        <p class="text-xs text-gray-400 pt-4">
          Thank you for supporting TaroTea!
        </p>
      </template>

      <template v-else>
        <div class="flex justify-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <TriangleAlert class="h-8 w-8" aria-hidden="true" />
          </div>
        </div>

        <h1 class="text-2xl font-semibold">
          We couldn't confirm your subscription yet
        </h1>

        <p class="text-gray-600">
          {{ errorMessage || "Please check your account in a moment." }}
        </p>

        <div class="space-y-3 pt-4">
          <button type="button"
            class="block w-full rounded-lg text-black py-3 font-medium hover:brightness-110 transition"
            style="background-color:#D6A3D1;" @click="checkBillingStatus">
            Try again
          </button>

          <NuxtLink to="/account/v2" class="block text-sm text-gray-500 hover:underline">
            Go to account
          </NuxtLink>
        </div>
      </template>
    </div>
  </main>
</template>