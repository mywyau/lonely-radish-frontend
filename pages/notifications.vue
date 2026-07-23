<script setup lang="ts">
import { Bell, CalendarCheck, CheckCheck, ChevronDown, HeartHandshake, Inbox, Trash2 } from '@lucide/vue'

definePageMeta({ title: 'Notifications · Lonely Radish', middleware: 'logged-in' })

type Notice = { id: string; kind: string; actorName?: string; proposalId?: string; message?: string; createdAt: string; readAt?: string }
const notices = ref<Notice[]>([])
const unreadCount = ref(0)
const loading = ref(true)
const errorMessage = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const loadingMore = ref(false)
const emailPreferences = reactive({ interests: true, matches: true, datePlans: true, followUps: true })
const emailPreferencesCollapsed = ref(true)
const savingEmailPreferences = ref(false)
const emailPreferencesSaved = ref(false)

const copy: Record<string, (notice: Notice) => string> = {
  interest_received: n => `${n.actorName || 'Someone new'} showed interest in meeting you.`,
  new_match: n => `You and ${n.actorName || 'someone new'} matched.`,
  proposal_received: n => `${n.actorName || 'Your match'} suggested a date plan.`,
  proposal_updated: n => `${n.actorName || 'Your match'} updated your date plan.`,
  date_confirmed: n => `${n.actorName || 'Your match'} confirmed your date.`,
  proposal_declined: n => `${n.actorName || 'Your match'} declined the proposed date plan.`,
  follow_up_ready: n => `${n.actorName || 'Your date'} completed their post-date check-in.`,
  match_ended: n => `${n.actorName || 'Your match'} ended the match.`,
  match_apology: n => `${n.actorName || 'A past connection'} sent you an apology note: “${n.message || ''}”`,
  date_follow_up_closed: () => 'Your post-date answers were different and the connection closed.',
  date_follow_up_changed: n => `${n.actorName || 'Your date'} changed their answer and would like to meet again.`,
}
function destination(notice: Notice) {
  if (notice.kind === 'match_apology') return '/matches/past'
  if (notice.kind === 'interest_received') return '/interests/received'
  return notice.proposalId && ['follow_up_ready','date_follow_up_closed','date_follow_up_changed'].includes(notice.kind)
    ? `/dates/${notice.proposalId}/follow-up` : '/matches'
}
async function load(loadMore = false) {
  if (loadMore) loadingMore.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{ notifications: Notice[]; unreadCount: number; nextCursor: string | null; hasMore: boolean }>('/api/notifications', {
      query: { includeRead: true, ...(loadMore && nextCursor.value ? { cursor: nextCursor.value } : {}) },
    })
    notices.value = loadMore ? [...notices.value, ...result.notifications] : result.notifications
    unreadCount.value = result.unreadCount; nextCursor.value = result.nextCursor; hasMore.value = result.hasMore
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Notifications could not be loaded.' }
  finally { loading.value = false; loadingMore.value = false }
}
async function markRead(notice: Notice) {
  if (!notice.readAt) await $fetch(`/api/notifications/${notice.id}/read`, { method: 'POST' })
  notice.readAt = new Date().toISOString(); unreadCount.value = Math.max(0, unreadCount.value - 1)
}
async function readAll() {
  await $fetch('/api/notifications/read-all', { method: 'POST' })
  notices.value.forEach(notice => { notice.readAt ||= new Date().toISOString() }); unreadCount.value = 0
}
async function deleteNotice(notice: Notice) {
  if (!window.confirm('Delete this notification permanently?')) return
  try {
    await $fetch(`/api/notifications/${notice.id}`, { method: 'DELETE' })
    notices.value = notices.value.filter(item => item.id !== notice.id)
    if (!notice.readAt) unreadCount.value = Math.max(0, unreadCount.value - 1)
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'The notification could not be deleted.' }
}
async function saveEmailPreferences() {
  savingEmailPreferences.value = true
  emailPreferencesSaved.value = false
  try {
    Object.assign(emailPreferences, await $fetch('/api/email/preferences', { method: 'PUT', body: emailPreferences }))
    emailPreferencesSaved.value = true
  } finally { savingEmailPreferences.value = false }
}
onMounted(async () => {
  await load()
  try { Object.assign(emailPreferences, await $fetch('/api/email/preferences')) } catch { /* In-app notifications remain available. */ }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Updates</p><h1 class="mt-2 text-4xl font-semibold">Notifications</h1><p class="mt-3 text-[#6E4D58]">Matches, date plans, and post-date check-ins in one place.</p></div>
        <button v-if="unreadCount" type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-[#8F1839]" @click="readAll"><CheckCheck class="size-4" />Mark all read</button>
      </div>
      <section class="mt-8 rounded-lg bg-white p-5 shadow-[0_8px_20px_rgba(180,35,74,.06)]">
        <button type="button" class="flex w-full items-start justify-between gap-4 text-left" :aria-expanded="!emailPreferencesCollapsed" aria-controls="email-notification-settings" @click="emailPreferencesCollapsed = !emailPreferencesCollapsed">
          <span><span class="block text-lg font-semibold">Email notifications</span><span class="mt-1 block text-sm text-[#6E4D58]">Choose which important updates can also reach your inbox.</span></span>
          <ChevronDown class="mt-1 size-5 shrink-0 text-[#8F1839] transition-transform" :class="!emailPreferencesCollapsed && 'rotate-180'" aria-hidden="true" />
        </button>
        <form id="email-notification-settings" v-show="!emailPreferencesCollapsed" class="mt-4 grid gap-3 sm:grid-cols-2" @submit.prevent="saveEmailPreferences">
          <label class="flex items-center gap-3 rounded-lg bg-[#FBF7F1] p-3 text-sm font-semibold"><input v-model="emailPreferences.interests" class="size-4 accent-[#B4234A]" type="checkbox">New interests</label>
          <label class="flex items-center gap-3 rounded-lg bg-[#FBF7F1] p-3 text-sm font-semibold"><input v-model="emailPreferences.matches" class="size-4 accent-[#B4234A]" type="checkbox">Matches and connections</label>
          <label class="flex items-center gap-3 rounded-lg bg-[#FBF7F1] p-3 text-sm font-semibold"><input v-model="emailPreferences.datePlans" class="size-4 accent-[#B4234A]" type="checkbox">Date plan updates</label>
          <label class="flex items-center gap-3 rounded-lg bg-[#FBF7F1] p-3 text-sm font-semibold"><input v-model="emailPreferences.followUps" class="size-4 accent-[#B4234A]" type="checkbox">Post-date check-ins</label>
          <div class="flex items-center gap-3 sm:col-span-2"><button type="submit" :disabled="savingEmailPreferences" class="rounded-lg bg-[#4D2F39] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{{ savingEmailPreferences ? 'Saving…' : 'Save email preferences' }}</button><span v-if="emailPreferencesSaved" class="text-sm font-semibold text-[#52713A]" role="status">Saved</span></div>
        </form>
      </section>
      <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading notifications…</div>
      <p v-else-if="errorMessage && !notices.length" class="mt-8 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]">{{ errorMessage }}</p>
      <div v-else-if="notices.length" class="mt-8 grid gap-3">
        <article v-for="notice in notices" :key="notice.id" class="rounded-lg border p-5" :class="notice.readAt ? 'border-transparent bg-white/60' : 'border-[#E6A8B8] bg-white shadow-[0_8px_20px_rgba(180,35,74,.08)]'">
            <div class="flex items-start gap-3"><component :is="notice.kind === 'new_match' ? HeartHandshake : notice.kind === 'date_confirmed' ? CalendarCheck : Bell" class="mt-0.5 size-5 shrink-0 text-[#B4234A]" /><div class="min-w-0 flex-1"><p class="font-semibold">{{ copy[notice.kind]?.(notice) || 'You have a new update.' }}</p><p class="mt-1 text-xs text-[#6E4D58]">{{ new Date(notice.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) }}</p><div class="mt-3 flex flex-wrap gap-3"><NuxtLink :to="destination(notice)" class="text-sm font-semibold text-[#8F1839]" @click="markRead(notice)">View update</NuxtLink><button v-if="!notice.readAt" type="button" class="text-sm text-[#6E4D58]" @click="markRead(notice)">Mark read</button><button type="button" class="inline-flex items-center gap-1 text-sm text-[#8F1839]" @click="deleteNotice(notice)"><Trash2 class="size-3.5" />Delete</button></div></div></div>
        </article>
        <button v-if="hasMore" type="button" :disabled="loadingMore" class="mx-auto mt-3 rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="load(true)">{{ loadingMore ? 'Loading…' : 'Load more notifications' }}</button>
        <p v-if="errorMessage" class="text-center text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      </div>
      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center"><Inbox class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">You’re all caught up.</h2><p class="mt-2 text-sm text-[#6E4D58]">New match and date updates will appear here.</p></div>
    </section>
  </main>
</template>
