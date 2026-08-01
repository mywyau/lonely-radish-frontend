<script setup lang="ts">
import { Search, Trash2, UserRound } from '@lucide/vue'

definePageMeta({ title: 'Member administration · Lonely Radish', middleware: 'admin' })

type AdminUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  displayName?: string | null
  slug?: string | null
  role: string
  accountType: string
  accountStatus: string
  createdAt: string
  deletionJobId?: number | null
  deletionJobStatus?: string | null
  deletionLastError?: string | null
  deletionRequestSource?: string | null
  deletionRequestedAt?: string | null
}

const users = ref<AdminUser[]>([])
const searchInput = ref('')
const loading = ref(true)
const loadingMore = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const deletionPanels = reactive<Record<string, boolean>>({})
const deletionConfirmations = reactive<Record<string, string>>({})
const deletionReasons = reactive<Record<string, string>>({})
const deletingUserId = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
let requestNumber = 0

function memberName(user: AdminUser) {
  return user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
}

function formattedDate(value?: string | null) {
  return value ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : ''
}

async function loadUsers(append = false) {
  const thisRequest = ++requestNumber
  if (append) loadingMore.value = true
  else loading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{ users: AdminUser[]; nextCursor: string | null; hasMore: boolean }>('/api/admin/users', {
      query: {
        ...(searchInput.value.trim() ? { q: searchInput.value.trim() } : {}),
        ...(append && nextCursor.value ? { cursor: nextCursor.value } : {}),
      },
    })
    if (thisRequest !== requestNumber) return
    users.value = append ? [...users.value, ...result.users] : result.users
    nextCursor.value = result.nextCursor
    hasMore.value = result.hasMore
  } catch (error: any) {
    if (thisRequest === requestNumber) errorMessage.value = error?.data?.statusMessage || 'Members could not be loaded.'
  } finally {
    if (thisRequest === requestNumber) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

function scheduleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    nextCursor.value = null
    void loadUsers()
  }, 300)
}

async function permanentlyDeleteMember(user: AdminUser) {
  const confirmation = deletionConfirmations[user.id]?.trim() || ''
  const reason = deletionReasons[user.id]?.trim() || ''
  if (confirmation.toLowerCase() !== user.email.toLowerCase()) {
    errorMessage.value = 'Enter the member’s complete email address to confirm deletion.'
    return
  }
  if (reason.length < 10) {
    errorMessage.value = 'Add a deletion reason of at least 10 characters.'
    return
  }
  deletingUserId.value = user.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await $fetch<{ jobId: number; status: string }>(`/api/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE', body: { confirmEmail: confirmation, reason },
    })
    user.accountStatus = 'deleting'
    user.deletionJobId = result.jobId
    user.deletionJobStatus = result.status
    user.deletionLastError = null
    deletionPanels[user.id] = false
    delete deletionConfirmations[user.id]
    delete deletionReasons[user.id]
    successMessage.value = 'Permanent account deletion has been queued and audited.'
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Permanent account deletion could not be queued.'
  } finally {
    deletingUserId.value = ''
  }
}

watch(searchInput, scheduleSearch)
onMounted(() => loadUsers())
onBeforeUnmount(() => { if (searchTimer) clearTimeout(searchTimer) })
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-4 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Administration</p>
      <h1 class="mt-2 text-4xl font-semibold">Members</h1>
      <p class="mt-3 max-w-3xl leading-7 text-[#6E4D58]">Find a member, review their current account state, and queue permanent deletion when there is a documented reason.</p>

      <label class="relative mt-7 block rounded-lg bg-white p-4 shadow-[0_10px_24px_rgba(180,35,74,0.07)]"><span class="text-sm font-semibold">Search members</span><span class="relative mt-2 block"><Search class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6E4D58]" /><input v-model="searchInput" class="w-full rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] py-3 pl-10 pr-3 text-sm outline-none focus:border-[#B4234A]" placeholder="Email, name or profile name" /></span></label>

      <p v-if="successMessage" class="mt-5 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#52713A]" role="status">{{ successMessage }}</p>
      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      <div v-if="loading && !users.length" class="mt-6 rounded-lg bg-white p-8 text-[#6E4D58]">Loading members…</div>

      <div v-else-if="users.length" class="mt-6 grid gap-4">
        <article v-for="user in users" :key="user.id" class="rounded-lg bg-white p-5 shadow-[0_8px_20px_rgba(180,35,74,0.06)]">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="flex min-w-0 items-start gap-3"><div class="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#FCE3E8]"><UserRound class="size-5 text-[#8F1839]" /></div><div class="min-w-0"><h2 class="font-semibold">{{ memberName(user) }}</h2><p class="mt-1 break-all text-sm text-[#6E4D58]">{{ user.email }}</p><p class="mt-1 text-xs text-[#6E4D58]">{{ user.role }} · {{ user.accountType }} · {{ user.accountStatus }} · joined {{ formattedDate(user.createdAt) }}</p></div></div>
            <button v-if="user.role === 'member' && user.accountStatus !== 'deleting'" type="button" class="inline-flex items-center gap-2 rounded-lg border border-[#B4234A] px-4 py-2.5 text-sm font-semibold text-[#8F1839]" @click="deletionPanels[user.id] = true"><Trash2 class="size-4" />Permanently delete</button>
            <button v-else-if="user.role === 'member' && user.deletionJobStatus === 'failed'" type="button" class="inline-flex items-center gap-2 rounded-lg border border-[#B4234A] px-4 py-2.5 text-sm font-semibold text-[#8F1839]" @click="deletionPanels[user.id] = true"><Trash2 class="size-4" />Retry failed deletion</button>
          </div>

          <div v-if="user.deletionJobStatus" class="mt-4 rounded-lg bg-[#FBF7F1] p-3 text-sm"><span class="font-semibold">Latest deletion job:</span> {{ user.deletionJobStatus }}<span v-if="user.deletionRequestedAt"> · {{ formattedDate(user.deletionRequestedAt) }}</span><p v-if="user.deletionLastError" class="mt-1 break-words text-xs text-[#8F1839]">{{ user.deletionLastError }}</p></div>

          <div v-if="deletionPanels[user.id]" class="mt-4 rounded-lg bg-[#FCE3E8] p-4">
            <p class="text-sm font-semibold text-[#8F1839]">This is irreversible. Confirm the exact account and record the reason.</p>
            <div class="mt-3 grid gap-3 md:grid-cols-2"><label class="text-sm font-semibold">Deletion reason<textarea v-model="deletionReasons[user.id]" maxlength="1000" rows="3" class="mt-1 w-full rounded-lg border border-[#E8D8C4] bg-white p-3 text-sm" placeholder="At least 10 characters; retained in the audit." /></label><label class="text-sm font-semibold">Type {{ user.email }} to confirm<input v-model="deletionConfirmations[user.id]" class="mt-1 w-full rounded-lg border border-[#E8D8C4] bg-white p-3 text-sm" autocomplete="off" /></label></div>
            <div class="mt-3 flex justify-end gap-2"><button type="button" class="rounded-lg bg-white px-4 py-2.5 text-sm font-semibold" @click="deletionPanels[user.id] = false">Cancel</button><button type="button" :disabled="deletingUserId === user.id" class="inline-flex items-center gap-2 rounded-lg bg-[#8F1839] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" @click="permanentlyDeleteMember(user)"><Trash2 class="size-4" />{{ deletingUserId === user.id ? 'Queuing deletion…' : 'Confirm permanent deletion' }}</button></div>
          </div>
        </article>
      </div>
      <div v-else-if="!loading" class="mt-6 rounded-lg bg-white p-8 text-center text-[#6E4D58]">No members matched that search.</div>
      <div v-if="hasMore" class="mt-6 text-center"><button type="button" :disabled="loadingMore" class="rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="loadUsers(true)">{{ loadingMore ? 'Loading…' : 'Load more members' }}</button></div>
    </section>
  </main>
</template>
