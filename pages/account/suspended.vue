<script setup lang="ts">
import { Clock3, LogOut, ShieldAlert } from '@lucide/vue'
import { logout } from '@/composables/useAuth'

definePageMeta({ title: 'Account suspended · Lonely Radish' })

const status = ref<{ status: string; suspendedUntil?: string | null } | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const temporary = computed(() => Boolean(status.value?.suspendedUntil))
const suspensionEnd = computed(() => status.value?.suspendedUntil
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(status.value.suspendedUntil))
  : '')

onMounted(async () => {
  try {
    status.value = await $fetch('/api/account/moderation-status')
    if (status.value.status !== 'suspended') await navigateTo('/account/v2')
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Your account status could not be loaded.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="min-h-[70vh] bg-[#FBF7F1] px-5 py-16 text-[#2A1520]">
    <section class="mx-auto max-w-xl rounded-lg bg-white p-7 shadow-[0_12px_28px_rgba(180,35,74,0.08)]">
      <ShieldAlert class="size-9 text-[#B4234A]" aria-hidden="true" />
      <h1 class="mt-5 text-3xl font-semibold">Your account is suspended</h1>
      <div v-if="loading" class="mt-5 text-[#6E4D58]">Checking your account status…</div>
      <p v-else-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      <template v-else>
        <p class="mt-4 leading-7 text-[#6E4D58]">
          Your profile is hidden and you cannot use matching or date-planning features while this suspension is active.
        </p>
        <p v-if="temporary" class="mt-5 flex items-start gap-2 rounded-lg bg-[#F3E8DA] p-4 text-sm font-semibold">
          <Clock3 class="mt-0.5 size-5 shrink-0 text-[#8F1839]" />
          This suspension is scheduled to end on {{ suspensionEnd }}.
        </p>
        <p v-else class="mt-5 rounded-lg bg-[#F3E8DA] p-4 text-sm font-semibold">
          This suspension has no scheduled end date.
        </p>
        <p class="mt-5 text-sm leading-6 text-[#6E4D58]">
          If you believe this decision is incorrect, contact support and include the email address associated with your account. Reporter identities remain private.
        </p>
      </template>
      <div class="mt-7 flex flex-wrap gap-3">
        <NuxtLink to="/contact" class="rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Contact support</NuxtLink>
        <button type="button" class="inline-flex items-center gap-2 rounded-lg bg-[#F3E8DA] px-5 py-3 text-sm font-semibold text-[#4D2F39]" @click="logout()"><LogOut class="size-4" />Log out</button>
      </div>
    </section>
  </main>
</template>
