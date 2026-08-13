<script setup lang="ts">
import { AlertTriangle, Trash2 } from '@lucide/vue'
import type { AccountDeletionResponse } from '~/types/api/accountDeletion'

definePageMeta({ title: 'Business account · Lonely Radish', middleware: 'business-only' })

const showConfirmation = ref(false)
const confirmation = ref('')
const deleting = ref(false)
const errorMessage = ref('')
const canDelete = computed(() => confirmation.value.trim().toLowerCase() === 'delete')

async function deleteAccount() {
  if (!canDelete.value || deleting.value) return
  deleting.value = true
  errorMessage.value = ''
  try {
    await $fetch<AccountDeletionResponse>('/api/account/v2', {
      method: 'DELETE', body: { confirm: confirmation.value },
    })
    window.location.assign('/api/auth/logout')
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Account deletion could not be started.'
    deleting.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Business settings</p>
      <h1 class="mt-2 text-4xl font-semibold">Account</h1>
      <p class="mt-3 leading-7 text-[#6E4D58]">Manage the account used for your Lonely Radish business.</p>

      <section class="mt-8 rounded-lg border border-[#E8D8C4] bg-white p-6 shadow-[0_10px_24px_rgba(180,35,74,0.06)] sm:p-8">
        <div class="flex items-start gap-3">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#FCE3E8]"><Trash2 class="size-5 text-[#B4234A]" /></span>
          <div>
            <h2 class="text-xl font-semibold">Delete business account</h2>
            <p class="mt-2 text-sm leading-6 text-[#6E4D58]">If you are the only business member, this permanently removes your business, venues, offers, dating profile data and login. Transfer ownership or remove other business members before deleting. Any active subscription will be cancelled when deletion completes.</p>
          </div>
        </div>
        <button type="button" class="mt-6 rounded-lg border border-[#B4234A] px-4 py-2.5 text-sm font-semibold text-[#B4234A] hover:bg-[#FCE3E8]" @click="showConfirmation = true">Delete account</button>
      </section>
    </section>

    <div v-if="showConfirmation" class="fixed inset-0 z-50 flex items-center justify-center bg-[#211A16]/55 p-4" @click.self="showConfirmation = false">
      <section class="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="delete-business-title">
        <AlertTriangle class="size-9 text-[#B4234A]" />
        <h2 id="delete-business-title" class="mt-4 text-2xl font-semibold">Permanently delete this account?</h2>
        <p class="mt-3 text-sm leading-6 text-[#6E4D58]">This cannot be undone. Deletion cannot complete while another business member remains. Type <strong>delete</strong> to confirm.</p>
        <label class="mt-5 block text-sm font-semibold">Confirmation
          <input v-model="confirmation" autocomplete="off" class="mt-2 w-full rounded-lg border border-[#D8C5B2] px-4 py-3 outline-none focus:border-[#B4234A] focus:ring-2 focus:ring-[#FCE3E8]" placeholder="Type delete">
        </label>
        <p v-if="errorMessage" class="mt-4 rounded-lg bg-[#FCE3E8] p-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
        <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" class="rounded-lg px-4 py-2.5 text-sm font-semibold text-[#4D2F39] hover:bg-[#F3E8DA]" :disabled="deleting" @click="showConfirmation = false">Keep account</button>
          <button type="button" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="!canDelete || deleting" @click="deleteAccount">{{ deleting ? 'Starting deletion…' : 'Permanently delete' }}</button>
        </div>
      </section>
    </div>
  </main>
</template>
