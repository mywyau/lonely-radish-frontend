<script setup lang="ts">
import { Bell, CalendarCheck, CalendarDays, ChevronRight, Clock3, Eye, EyeOff, HeartHandshake, MapPin, Sparkles, UsersRound, X } from '@lucide/vue'

definePageMeta({ title: 'Matches & Plans · Lonely Radish', middleware: 'logged-in' })

type MatchCard = {
  id: string; name: string; slug: string; place?: string; photoUrl?: string; stage: 'fresh' | 'planning' | 'confirmed'
  proposalId?: string; proposalStatus?: string; activity?: string; venue?: string; confirmedTime?: string
  matchedAt: string; isInviter?: boolean; needsResponse?: boolean; dateHasPassed?: boolean
  hasFollowedUp?: boolean; bothFollowedUp?: boolean; followUpResult?: 'mutual' | 'closed' | null
}
type MatchNotification = { id: string; kind: 'match_ended' | 'date_follow_up_closed' | 'date_follow_up_changed'; actorName?: string; proposalId?: string; createdAt: string }

const loading = ref(true)
const errorMessage = ref('')
const matches = ref<MatchCard[]>([])
const totalMatches = ref(0)
const interestReceivedCount = ref(0)
const notifications = ref<MatchNotification[]>([])
const pendingReject = ref<MatchCard | null>(null)
const rejecting = ref(false)
const rejectError = ref('')
const previewRejected = ref(false)
const showSummaryCounts = ref(true)
const previewMatch: MatchCard = {
  id: 'preview-post-date', name: 'Nina', slug: 'nina', place: 'Hackney',
  photoUrl: '/images/nina-profile-triptych.png', stage: 'confirmed',
  proposalId: 'preview-nina', proposalStatus: 'accepted', activity: 'Gallery walk',
  venue: 'Barbican Centre', confirmedTime: '2026-07-19T14:00:00.000Z',
  matchedAt: '2026-07-18T12:00:00.000Z', dateHasPassed: true, hasFollowedUp: false,
}

const sectionDefinitions = [
  { key: 'fresh', title: 'New matches', description: 'You both want to meet. Choose a date idea and start making a plan.', icon: HeartHandshake, tone: 'bg-[#FCE3E8]' },
  { key: 'planning', title: 'Planning', description: 'A proposal is in progress and needs a response or another detail.', icon: Clock3, tone: 'bg-[#F3E8DA]' },
  { key: 'confirmed', title: 'Confirmed dates', description: 'The activity, time, and public venue have been agreed.', icon: CalendarCheck, tone: 'bg-[#EAF2DE]' },
] as const

const sections = computed(() => sectionDefinitions.map(section => ({ ...section,
  items: matches.value.filter(match => match.stage === section.key),
})))
const counts = computed(() => ({ fresh: matches.value.filter(match => match.stage === 'fresh').length,
  planning: matches.value.filter(match => match.stage === 'planning').length,
  confirmed: matches.value.filter(match => match.stage === 'confirmed').length }))
const additionalMatches = computed(() => Math.max(0, totalMatches.value - matches.value.length))

function actionLabel(match: MatchCard) {
  if (match.stage === 'fresh') return 'Start planning'
  if (match.stage === 'confirmed' && match.dateHasPassed) return match.hasFollowedUp ? 'View date follow-up' : 'Would you meet again?'
  if (match.stage === 'confirmed') return 'Edit date details'
  return match.needsResponse ? 'Review proposal' : 'Continue planning'
}
function statusLabel(match: MatchCard) {
  if (match.stage === 'fresh') return 'Ready to plan'
  if (match.stage === 'planning') return match.needsResponse ? 'Your response needed' : 'Waiting for a response'
  return match.confirmedTime ? new Date(match.confirmedTime).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }) : 'Date confirmed'
}
function planUrl(match: MatchCard) {
  if (match.stage === 'confirmed' && match.dateHasPassed && match.proposalId) return `/dates/${match.proposalId}/follow-up`
  const query = match.stage === 'confirmed' && match.proposalId ? `?proposal=${match.proposalId}&mode=edit` : ''
  return `/plans/${match.slug}${query}`
}

function toggleSummaryCounts() {
  showSummaryCounts.value = !showSummaryCounts.value
  window.localStorage.setItem('lonely-radish-show-match-counts', String(showSummaryCounts.value))
}

async function loadMatches() {
  if (import.meta.dev) previewRejected.value = Boolean(window.localStorage.getItem('lonely-radish-preview-rejected-match'))
  const result = await $fetch<{ matches: MatchCard[]; totalMatches: number; interestReceivedCount: number }>('/api/matches')
  matches.value = result.matches
  totalMatches.value = result.totalMatches
  interestReceivedCount.value = result.interestReceivedCount
  if (import.meta.dev && !previewRejected.value) {
    matches.value = [previewMatch, ...matches.value.filter(match => match.id !== previewMatch.id)].slice(0, 5)
    totalMatches.value += 1
  }
}
async function loadNotifications() {
  notifications.value = (await $fetch<{ notifications: MatchNotification[] }>('/api/notifications')).notifications
}
async function dismissNotification(id: string) {
  await $fetch(`/api/notifications/${id}/read`, { method: 'POST' })
  notifications.value = notifications.value.filter(notification => notification.id !== id)
}
async function rejectMatch() {
  if (!pendingReject.value) return
  rejecting.value = true; rejectError.value = ''
  try {
    if (pendingReject.value.id === previewMatch.id) {
      previewRejected.value = true
      window.localStorage.setItem('lonely-radish-preview-rejected-match', JSON.stringify({ endedAt: new Date().toISOString() }))
    }
    else await $fetch(`/api/matches/${pendingReject.value.id}`, { method: 'DELETE' })
    pendingReject.value = null
    await loadMatches()
  } catch (error: any) { rejectError.value = error?.data?.statusMessage || 'This match could not be removed.' }
  finally { rejecting.value = false }
}

onMounted(async () => {
  showSummaryCounts.value = window.localStorage.getItem('lonely-radish-show-match-counts') !== 'false'
  try {
    await Promise.all([loadMatches(), loadNotifications()])
  }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your matches could not be loaded.' }
  finally { loading.value = false }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Matches & plans</p>
      <h1 class="mt-2 text-4xl font-semibold sm:text-5xl">Turn mutual interest into a real date.</h1>
      <p class="mt-4 max-w-2xl leading-7 text-[#6E4D58]">Every match has a clear next step: choose what to do, agree a time and public venue, then meet.</p>
      <NuxtLink to="/matches/past" class="mt-4 inline-flex text-sm font-semibold text-[#8F1839] hover:underline">View past connections →</NuxtLink>

      <div class="mt-6 flex justify-end"><button type="button" class="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8F1839] hover:underline" :aria-pressed="!showSummaryCounts" @click="toggleSummaryCounts"><EyeOff v-if="showSummaryCounts" class="size-4" aria-hidden="true" /><Eye v-else class="size-4" aria-hidden="true" />{{ showSummaryCounts ? 'Hide counts' : 'Show counts' }}</button></div>
      <div v-if="showSummaryCounts" class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-4">
        <NuxtLink to="/interests/received" class="summary-card summary-interested col-span-2 sm:col-span-1"><HeartHandshake class="summary-icon" /><strong>{{ interestReceivedCount }}</strong><span>People interested in you</span></NuxtLink>
        <div class="summary-card summary-total"><UsersRound class="summary-icon" /><strong>{{ totalMatches }}</strong><span>Total matches</span></div>
        <div class="summary-card summary-new"><Sparkles class="summary-icon" /><strong>{{ counts.fresh }}</strong><span>New</span></div>
        <div class="summary-card summary-planning"><Clock3 class="summary-icon" /><strong>{{ counts.planning }}</strong><span>Planning</span></div>
        <div class="summary-card summary-confirmed"><CalendarCheck class="summary-icon" /><strong>{{ counts.confirmed }}</strong><span>Confirmed</span></div>
      </div>
      <p v-if="showSummaryCounts" class="mt-3 text-center text-xs text-[#6E4D58]">You can have up to 5 active matches across matching, planning, and confirmed dates.</p>

      <div v-if="notifications.length" class="mt-6 grid gap-2">
        <div v-for="notification in notifications" :key="notification.id" class="flex items-start gap-3 rounded-lg bg-white p-4 text-sm shadow-[0_8px_20px_rgba(180,35,74,0.07)]">
          <Bell class="mt-0.5 size-4 shrink-0 text-[#B4234A]" />
          <p class="min-w-0 flex-1 text-[#4D2F39]">{{ notification.kind === 'date_follow_up_closed' ? 'A post-date check-in is complete. The connection has now closed.' : notification.kind === 'date_follow_up_changed' ? `${notification.actorName || 'Your date'} changed their answer and would like to meet again.` : `${notification.actorName || 'Someone'} ended your match.` }}</p>
          <NuxtLink v-if="notification.proposalId && notification.kind !== 'match_ended'" :to="`/dates/${notification.proposalId}/follow-up`" class="shrink-0 font-semibold text-[#8F1839]">Review</NuxtLink>
          <button type="button" class="shrink-0 text-[#6E4D58]" aria-label="Dismiss notification" @click="dismissNotification(notification.id)"><X class="size-4" /></button>
        </div>
      </div>

      <p v-if="additionalMatches" class="mt-6 rounded-lg bg-[#FFF1C7] px-4 py-3 text-sm font-semibold text-[#694C00]">You have {{ additionalMatches }} more {{ additionalMatches === 1 ? 'match' : 'matches' }} waiting. Finish planning or remove a match to see who is next.</p>

      <div v-if="loading" class="mt-9 rounded-lg bg-white p-8 text-center text-sm text-[#6E4D58]">Loading your matches and plans…</div>
      <p v-else-if="errorMessage" class="mt-9 rounded-lg bg-[#FCE3E8] p-5 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>

      <div v-else class="mt-9 grid gap-8">
        <section v-for="section in sections" :key="section.title">
          <div class="flex items-center gap-2"><component :is="section.icon" class="size-5 text-[#B4234A]" /><h2 class="text-2xl font-semibold">{{ section.title }}</h2><span class="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#8F1839]">{{ section.items.length }}</span></div>
          <p class="mt-1 text-sm leading-6 text-[#6E4D58]">{{ section.description }}</p>
          <div v-if="section.items.length" class="mt-4 grid gap-3">
            <article v-for="match in section.items" :key="match.id" class="rounded-lg p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]" :class="section.tone">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 gap-4">
                  <img v-if="match.photoUrl" :src="match.photoUrl" :alt="`${match.name}'s primary profile photo`" class="size-14 shrink-0 rounded-full object-cover">
                  <div v-else class="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/75 text-lg font-semibold text-[#B4234A]">{{ match.name.charAt(0) }}</div>
                  <div class="min-w-0"><h3 class="text-lg font-semibold">{{ match.name }}</h3><p v-if="match.activity" class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#8F1839]"><Sparkles class="size-3.5" />{{ match.activity }}</p><p v-if="match.venue || match.place" class="mt-1 flex items-center gap-1 truncate text-xs text-[#6E4D58]"><MapPin class="size-3.5 shrink-0" />{{ match.venue || match.place }}</p></div>
                </div>
                <span class="inline-flex w-fit items-center gap-1 rounded-full bg-white/70 px-3 py-2 text-xs font-semibold"><component :is="section.icon" class="size-3.5" />{{ statusLabel(match) }}</span>
              </div>
              <div class="mt-5 flex flex-col gap-2 min-[380px]:flex-row">
                <NuxtLink :to="planUrl(match)" class="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8F1839]">{{ actionLabel(match) }}<ChevronRight class="size-4 transition group-hover:translate-x-1" /></NuxtLink>
                <NuxtLink :to="`/profiles/${match.slug}`" class="inline-flex items-center justify-center rounded-lg bg-white/75 px-4 py-2.5 text-sm font-semibold text-[#8F1839] transition hover:bg-white">View {{ match.name }}’s profile</NuxtLink>
                <button type="button" class="inline-flex items-center justify-center rounded-lg border border-[#B4234A]/30 px-4 py-2.5 text-sm font-semibold text-[#8F1839] transition hover:bg-white/70" @click="pendingReject = match; rejectError = ''">Remove match</button>
              </div>
            </article>
          </div>
          <div v-else class="mt-4 rounded-lg border border-dashed border-[#D8C8B6] bg-white/55 px-5 py-6 text-sm text-[#6E4D58]">No {{ section.title.toLowerCase() }} right now.</div>
        </section>
      </div>

      <NuxtLink to="/activities" class="mt-9 inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white"><CalendarDays class="size-4" />Discover another date idea</NuxtLink>
    </section>

    <div v-if="pendingReject" class="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1520]/55 p-5" role="presentation" @click.self="pendingReject = null">
      <section role="alertdialog" aria-modal="true" aria-labelledby="reject-title" class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 id="reject-title" class="text-2xl font-semibold">Remove your match with {{ pendingReject.name }}?</h2>
        <p class="mt-3 text-sm leading-6 text-[#6E4D58]">This cannot be undone. {{ pendingReject.name }} will be notified that the match ended, and any plans will no longer appear in your match list.</p>
        <p v-if="rejectError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ rejectError }}</p>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold" :disabled="rejecting" @click="pendingReject = null">Keep match</button>
          <button type="button" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="rejecting" @click="rejectMatch">{{ rejecting ? 'Removing…' : 'Yes, remove match' }}</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.summary-card { display: flex; min-width: 0; flex-direction: column; align-items: center; border-radius: .5rem; background: white; padding: 1rem .5rem; box-shadow: 0 8px 20px rgba(180,35,74,.07); }
.summary-icon { width: 1.1rem; height: 1.1rem; color: #8F1839; margin-bottom: .2rem; }
.summary-card strong { color: #B4234A; font-size: 1.5rem; }
.summary-card span { color: #6E4D58; font-size: .75rem; font-weight: 650; }
.summary-interested { background: #FCE3E8; }
.summary-total { background: #F3E8DA; }
.summary-new { background: #FFF1C7; }
.summary-planning { background: #E8E4F4; }
.summary-confirmed { background: #EAF2DE; }
</style>
