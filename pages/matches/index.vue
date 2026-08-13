<script setup lang="ts">
import { BadgePercent, Bell, CalendarCheck, CalendarDays, CheckCheck, ChevronDown, ChevronRight, Clock3, HeartHandshake, History, MapPin, ShieldCheck, Sparkles, X } from '@lucide/vue'
import { trackProductEvent } from '~/utils/productAnalytics'

definePageMeta({ title: 'Matches & Plans · Lonely Radish', middleware: 'logged-in' })

type MatchCard = {
  id: string; name: string; slug: string; place?: string; photoUrl?: string; stage: 'queued' | 'fresh' | 'planning' | 'confirmed'
  proposalId?: string; proposalStatus?: string; activity?: string; venue?: string; confirmedTime?: string
  offerClaimId?: string; attachedOfferId?: string; attachedOfferTitle?: string
  matchedAt: string; isInviter?: boolean; needsResponse?: boolean; dateHasPassed?: boolean
  attendanceConfirmed?: boolean; otherAttendanceConfirmed?: boolean
  isReschedule?: boolean; currentConfirmedTime?: string
  hasFollowedUp?: boolean; bothFollowedUp?: boolean; followUpResult?: 'mutual' | 'closed' | null
  yourMove?: boolean
}
type MatchNotification = { id: string; kind: string; actorName?: string; proposalId?: string; createdAt: string }

const loading = ref(true)
const errorMessage = ref('')
const updatesError = ref('')
const matches = ref<MatchCard[]>([])
const totalMatches = ref(0)
const activeMatchLimit = ref(5)
const activeMatchCount = ref(0)
const acceptedInterestNeedsActionCount = ref(0)
const interestReceivedCount = ref(0)
const notifications = ref<MatchNotification[]>([])
const { adjustMatchCount, setUnreadNotificationCount, adjustUnreadNotificationCount } = useMeStateV2()
const showAllMatchUpdates = ref(false)
const markingAllUpdatesSeen = ref(false)
const pendingReject = ref<MatchCard | null>(null)
const rejecting = ref(false)
const rejectError = ref('')
const previewRejected = ref(false)
const attendanceUpdating = ref<string | null>(null)
const activatingMatch = ref<string | null>(null)
const activationError = reactive<Record<string, string>>({})
const route = useRoute()
const previewMatch: MatchCard = {
  id: 'preview-post-date', name: 'Nina', slug: 'nina', place: 'Hackney',
  photoUrl: '/images/nina-profile-triptych.png', stage: 'confirmed',
  proposalId: 'preview-nina', proposalStatus: 'accepted', activity: 'Gallery walk',
  venue: 'Barbican Centre', confirmedTime: '2026-07-19T14:00:00.000Z',
  matchedAt: '2026-07-18T12:00:00.000Z', dateHasPassed: true, hasFollowedUp: false,
}

type JourneySection = 'respond' | 'make-plan' | 'follow-up' | 'upcoming' | 'in-progress' | 'waiting'

const sectionDefinitions: Array<{ key: JourneySection; title: string; description: string; icon: any; tone: string }> = [
  { key: 'respond', title: 'Reply to a plan', description: 'Someone has suggested a date and is waiting for your answer.', icon: HeartHandshake, tone: 'bg-[#FFF1C7]' },
  { key: 'make-plan', title: 'Make a plan', description: 'You both want to meet. Choose something you would enjoy doing together.', icon: Sparkles, tone: 'bg-[#FCE3E8]' },
  { key: 'follow-up', title: 'After your date', description: 'Complete your private check-in or see what happens next.', icon: HeartHandshake, tone: 'bg-[#F3E8DA]' },
  { key: 'upcoming', title: 'Upcoming dates', description: 'Everything you have both agreed, in one place.', icon: CalendarCheck, tone: 'bg-[#EAF2DE]' },
  { key: 'in-progress', title: 'Plans in progress', description: 'Continue a draft or check a suggestion you have already sent.', icon: Clock3, tone: 'bg-[#F3E8DA]' },
  { key: 'waiting', title: 'Waiting to start', description: 'You chose each other. This connection can start when you both have room.', icon: Clock3, tone: 'bg-[#FFF1C7]' },
] as const

function journeySection(match: MatchCard): JourneySection {
  if (match.stage === 'queued') return 'waiting'
  if (match.stage === 'fresh') return 'make-plan'
  if (match.stage === 'planning') return match.needsResponse ? 'respond' : 'in-progress'
  return match.dateHasPassed ? 'follow-up' : 'upcoming'
}

const sections = computed(() => sectionDefinitions.map(section => ({ ...section,
  items: matches.value.filter(match => journeySection(match) === section.key),
})).filter(section => section.items.length))
const additionalMatches = computed(() => Math.max(0, totalMatches.value - matches.value.length))
const connectionListFull = computed(() => activeMatchCount.value >= activeMatchLimit.value)
const visibleNotifications = computed(() => showAllMatchUpdates.value ? notifications.value : notifications.value.slice(0, 4))
const hiddenNotificationCount = computed(() => Math.max(0, notifications.value.length - visibleNotifications.value.length))
const notificationGroups = computed(() => {
  const groups: Array<{ label: string; notifications: MatchNotification[] }> = []
  for (const notification of visibleNotifications.value) {
    const label = notificationDayLabel(notification.createdAt)
    const current = groups.at(-1)
    if (current?.label === label) current.notifications.push(notification)
    else groups.push({ label, notifications: [notification] })
  }
  return groups
})

function actionLabel(match: MatchCard) {
  if (match.stage === 'queued') return 'See if you can start'
  if (match.proposalStatus === 'cancelled') return 'Plan another date'
  if (match.stage === 'fresh') return 'Start planning'
  if (match.stage === 'confirmed' && match.dateHasPassed) {
    if (match.followUpResult === 'mutual') return 'Plan another date'
    return match.hasFollowedUp ? 'View date follow-up' : 'Would you meet again?'
  }
  if (match.stage === 'confirmed') return 'View date plan'
  if (match.isReschedule && match.needsResponse) return 'Review new date'
  if (match.isReschedule) return 'View reschedule'
  return match.needsResponse ? 'Review proposal' : 'Edit proposal'
}
function statusLabel(match: MatchCard) {
  if (match.stage === 'queued') return 'Ready when there’s room'
  if (match.yourMove) return 'Choose what happens next'
  if (match.proposalStatus === 'cancelled') return 'Date cancelled — ready to plan again'
  if (match.stage === 'fresh') return 'Ready to plan'
  if (match.stage === 'planning') {
    if (match.isReschedule && match.proposalStatus === 'draft') return 'Reschedule draft — current date stays confirmed'
    if (match.isReschedule) return match.needsResponse
      ? 'New date proposed — your response needed'
      : 'Reschedule sent — current date stays confirmed'
    if (match.proposalStatus === 'draft') return 'Draft — only you can see this'
    return match.needsResponse ? 'Your response needed' : 'Waiting for a response'
  }
  return match.confirmedTime ? new Date(match.confirmedTime).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }) : 'Date confirmed'
}
function statusBadgeClass(match: MatchCard) {
  return match.yourMove
    ? 'bg-[#FFF1C7] text-[#694C00] ring-1 ring-inset ring-[#D7A928]/45'
    : 'bg-white/70'
}
async function activateQueuedMatch(match: MatchCard) {
  if (activatingMatch.value) return
  activatingMatch.value = match.id
  activationError[match.id] = ''
  try {
    await $fetch(`/api/matches/${match.id}/activate`, { method: 'POST' })
    trackProductEvent('Waiting Connection Started')
    match.stage = 'fresh'
    activeMatchCount.value += 1
    if (match.yourMove) acceptedInterestNeedsActionCount.value += 1
  } catch (error: any) {
    activationError[match.id] = error?.data?.statusMessage || 'This match could not be activated yet.'
  } finally { activatingMatch.value = null }
}
function notificationCopy(notification: MatchNotification) {
  const actor = notification.actorName || 'Your date'
  const copy: Record<string, string> = {
    interest_received: `${notification.actorName || 'Someone new'} showed interest in meeting you.`,
    new_match: `You and ${notification.actorName || 'someone new'} matched. You can start planning when you’re ready.`,
    proposal_received: `${actor} sent you a date plan to review.`,
    proposal_updated: `${actor} changed the details of your date plan.`,
    date_confirmed: `Your date with ${actor} is confirmed.`,
    proposal_declined: `${actor} declined the proposed date plan.`,
    follow_up_ready: `${actor} completed their private post-date check-in.`,
    date_follow_up_closed: 'A post-date check-in is complete. The connection has now closed.',
    date_follow_up_changed: `${actor} changed their answer and would like to meet again.`,
    match_ended: `${notification.actorName || 'Someone'} ended your match.`,
    date_reminder_24h: 'Your confirmed date is about 24 hours away. Are you still going?',
    date_reminder_2h: 'Your confirmed date starts in about 2 hours.',
    date_attendance_confirmed: `${actor} confirmed they are still going.`,
    date_reschedule_requested: `${actor} needs to reschedule your date.`,
    date_cancelled: `${actor} cancelled your date. You remain matched.`,
    match_apology: `${actor} sent you an apology through Past connections.`,
    match_contact: `${actor} sent you a private message through Past connections. No response is required.`,
    match_queued: `You matched with ${actor}. Planning can begin when you both have an available match space.`,
    date_outcome_needed: 'Your private attendance check is ready after your date.',
    no_show_reported: 'A date was reported as a no-show. Please review it within 48 hours.',
    no_show_disputed: 'Your no-show report was disputed and will not trigger an automatic restriction.',
    no_show_warning: 'A no-show was confirmed. Please cancel or reschedule plans you cannot attend.',
    discovery_restricted: 'New discovery has been temporarily paused after repeated confirmed no-shows.',
    moderation_warning: 'Your account received a community standards warning.',
    account_suspended: 'Your account was suspended. Review your account for more information.',
    account_restored: 'Your account access has been restored.',
  }
  return copy[notification.kind] || 'There is a new update to one of your matches or date plans.'
}
function notificationCategory(kind: string) {
  if (kind === 'interest_received') return 'New interest'
  if (['new_match','match_queued'].includes(kind)) return 'Match'
  if (['proposal_received','proposal_updated','proposal_declined','date_confirmed'].includes(kind)) return 'Date plan'
  if (['date_reminder_24h','date_reminder_2h','date_attendance_confirmed','date_reschedule_requested','date_cancelled'].includes(kind)) return 'Date reminder'
  if (['follow_up_ready','date_follow_up_closed','date_follow_up_changed','date_outcome_needed'].includes(kind)) return 'Follow-up'
  if (['match_ended','match_apology','match_contact'].includes(kind)) return 'Connection'
  if (['no_show_reported','no_show_disputed','no_show_warning','discovery_restricted','moderation_warning','account_suspended','account_restored'].includes(kind)) return 'Safety'
  return 'Update'
}
function notificationIcon(kind: string) {
  if (['new_match','match_queued','interest_received','match_apology','match_contact'].includes(kind)) return HeartHandshake
  if (['date_confirmed','date_attendance_confirmed'].includes(kind)) return CalendarCheck
  if (['date_reminder_24h','date_reminder_2h','proposal_received','proposal_updated','proposal_declined','date_reschedule_requested','date_cancelled'].includes(kind)) return CalendarDays
  if (['no_show_reported','no_show_disputed','no_show_warning','discovery_restricted','moderation_warning','account_suspended','account_restored'].includes(kind)) return ShieldCheck
  return Bell
}
function notificationTone(kind: string) {
  if (['date_confirmed','date_attendance_confirmed','account_restored'].includes(kind)) return 'update-icon-success'
  if (['date_reminder_2h','date_reschedule_requested','date_cancelled','match_ended','no_show_reported','moderation_warning','account_suspended'].includes(kind)) return 'update-icon-alert'
  if (['proposal_received','proposal_updated','proposal_declined','date_reminder_24h'].includes(kind)) return 'update-icon-plan'
  return 'update-icon-match'
}
function notificationDayLabel(createdAt: string) {
  const date = new Date(createdAt)
  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const daysAgo = Math.round((startToday.getTime() - startDate.getTime()) / 86_400_000)
  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' })
}
function notificationTime(createdAt: string) {
  return new Date(createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function notificationUrl(notification: MatchNotification) {
  if (notification.kind === 'interest_received') return '/interests/received'
  if (notification.kind === 'account_suspended') return '/account/suspended'
  if (['moderation_warning','account_restored'].includes(notification.kind)) return '/account/v2'
  if (['match_apology','match_contact'].includes(notification.kind)) return '/matches/past'
  return notification.proposalId && ['follow_up_ready','date_follow_up_closed','date_follow_up_changed','date_outcome_needed','no_show_reported','no_show_disputed','no_show_warning','discovery_restricted'].includes(notification.kind)
    ? `/dates/${notification.proposalId}/follow-up` : '/matches'
}
function planUrl(match: MatchCard) {
  if (match.stage === 'confirmed' && match.dateHasPassed && match.followUpResult === 'mutual') return `/plans/${match.slug}?new=1`
  if (match.stage === 'confirmed' && match.dateHasPassed && match.proposalId) return `/dates/${match.proposalId}/follow-up`
  return `/plans/${match.slug}`
}

async function confirmAttendance(match: MatchCard) {
  if (!match.proposalId || attendanceUpdating.value) return
  attendanceUpdating.value = `${match.id}:confirm`
  errorMessage.value = ''
  try {
    await $fetch(`/api/proposals/${match.proposalId}/attendance`, { method: 'POST', body: { action: 'confirm' } })
    await loadMatches()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Your date response could not be saved.'
  } finally { attendanceUpdating.value = null }
}

async function loadMatches() {
  if (import.meta.dev) previewRejected.value = Boolean(window.localStorage.getItem('lonely-radish-preview-rejected-match'))
  const result = await $fetch<{ matches: MatchCard[]; totalMatches: number; activeMatchCount: number; manualMatchCount: number; manualMatchLimit: number; interestReceivedCount: number; activeMatchLimit: number; notifications: MatchNotification[]; unreadNotificationCount: number }>('/api/matches?includeNotifications=true')
  matches.value = result.matches
  totalMatches.value = result.totalMatches
  activeMatchCount.value = result.activeMatchCount
  acceptedInterestNeedsActionCount.value = result.manualMatchCount
  interestReceivedCount.value = result.interestReceivedCount
  activeMatchLimit.value = result.activeMatchLimit
  notifications.value = result.notifications
  setUnreadNotificationCount(result.unreadNotificationCount)
  if (import.meta.dev && !previewRejected.value) {
    matches.value = [previewMatch, ...matches.value.filter(match => match.id !== previewMatch.id)].slice(0, activeMatchLimit.value)
    totalMatches.value += 1
  }
  trackProductEvent('Connections Dashboard Viewed', {
    receivedInterests: interestReceivedCount.value,
    needsReply: matches.value.filter(match => journeySection(match) === 'respond').length,
    needsPlan: matches.value.filter(match => journeySection(match) === 'make-plan').length,
    upcomingDates: matches.value.filter(match => journeySection(match) === 'upcoming').length,
    waiting: matches.value.filter(match => journeySection(match) === 'waiting').length,
  })
}
async function dismissNotification(id: string) {
  await $fetch(`/api/notifications/${id}/read`, { method: 'POST' })
  notifications.value = notifications.value.filter(notification => notification.id !== id)
  adjustUnreadNotificationCount(-1)
}
async function markAllUpdatesSeen() {
  if (markingAllUpdatesSeen.value) return
  markingAllUpdatesSeen.value = true
  try {
    await $fetch('/api/notifications/read-all', { method: 'POST' })
    notifications.value = []
    setUnreadNotificationCount(0)
    showAllMatchUpdates.value = false
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'Your updates could not be marked as seen.'
  } finally { markingAllUpdatesSeen.value = false }
}
async function rejectMatch() {
  if (!pendingReject.value) return
  const connection = pendingReject.value
  rejecting.value = true; rejectError.value = ''
  try {
    if (connection.id === previewMatch.id) {
      previewRejected.value = true
      window.localStorage.setItem('lonely-radish-preview-rejected-match', JSON.stringify({ endedAt: new Date().toISOString() }))
    }
    else {
      await $fetch(`/api/matches/${connection.id}`, { method: 'DELETE' })
      trackProductEvent('Connection Closed', { stage: connection.stage })
      adjustMatchCount(-1)
    }
    pendingReject.value = null
    await loadMatches()
  } catch (error: any) { rejectError.value = error?.data?.statusMessage || 'This connection could not be closed.' }
  finally { rejecting.value = false }
}

async function loadDashboard() {
  loading.value = true
  errorMessage.value = ''
  updatesError.value = ''
  const matchResult = await Promise.resolve(loadMatches()).then(
    () => ({ status: 'fulfilled' as const }),
    (reason: unknown) => ({ status: 'rejected' as const, reason }),
  )
  if (matchResult.status === 'rejected') {
    const error: any = matchResult.reason
    errorMessage.value = error?.data?.statusMessage || 'Your matches could not be loaded.'
  }
  if (matchResult.status === 'rejected') updatesError.value = 'Match updates could not be loaded.'
  loading.value = false
}

onMounted(async () => {
  await loadDashboard()
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Your connections</p>
      <h1 class="mt-2 text-4xl font-semibold sm:text-5xl">What would you like to do next?</h1>
      <p class="mt-4 max-w-2xl leading-7 text-[#6E4D58]">Reply to someone, make a plan or check the details of a date that’s coming up.</p>
      <NuxtLink to="/matches/past" class="mt-4 inline-flex text-sm font-semibold text-[#8F1839] hover:underline">View past connections →</NuxtLink>

      <section v-if="interestReceivedCount" class="mt-7 flex flex-col gap-4 rounded-lg bg-[#FCE3E8] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 class="font-semibold">{{ interestReceivedCount === 1 ? 'Someone would like to meet you' : `${interestReceivedCount} people would like to meet you` }}</h2><p class="mt-1 text-sm leading-6 text-[#6E4D58]">Have a look when you feel ready. You do not need to decide immediately.</p></div>
        <NuxtLink to="/interests/received" class="shrink-0 rounded-lg bg-[#B4234A] px-4 py-2.5 text-center text-sm font-semibold text-white">View interests</NuxtLink>
      </section>
      <p v-if="acceptedInterestNeedsActionCount" class="mt-4 rounded-lg bg-[#FFF1C7] p-4 text-sm leading-6 text-[#694C00]" role="status"><strong>One new connection needs your attention.</strong> Make a plan with them or close the connection before accepting another interest.</p>
      <p v-if="connectionListFull" class="mt-4 rounded-lg border border-[#E8D8C4] bg-white/75 p-4 text-sm leading-6 text-[#6E4D58]" role="status">You currently have {{ activeMatchLimit }} active connections. Any waiting connection can start after an active one closes.</p>

      <p v-if="additionalMatches" class="mt-6 rounded-lg bg-[#FFF1C7] px-4 py-3 text-sm font-semibold text-[#694C00]">You have {{ additionalMatches }} more {{ additionalMatches === 1 ? 'connection' : 'connections' }} not shown here. Close or complete an active connection to bring the next one into view.</p>

      <div v-if="loading" class="mt-9 rounded-lg bg-white p-8 text-center text-sm text-[#6E4D58]">Loading your matches and plans…</div>
      <section v-else-if="errorMessage" class="mt-9 rounded-lg bg-[#FCE3E8] p-5 text-sm font-semibold text-[#8F1839]" role="alert">
        <p>{{ errorMessage }}</p>
        <button type="button" class="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#8F1839]" @click="loadDashboard">Try again</button>
      </section>

      <div v-else class="mt-9 grid gap-8">
        <p v-if="route.query.date === 'cancelled'" class="rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#52713A]" role="status">The date was cancelled and your match was notified. You remain matched and can make another plan whenever you are ready.</p>
        <div v-if="updatesError" class="rounded-lg bg-[#FFF1C7] p-4 text-sm font-semibold text-[#694C00]" role="alert">
          {{ updatesError }} <button type="button" class="underline" @click="loadDashboard">Try again</button>
        </div>
        <section v-for="section in sections" :key="section.title">
          <div class="flex items-center gap-2"><component :is="section.icon" class="size-5 text-[#B4234A]" /><h2 class="text-2xl font-semibold">{{ section.title }}</h2></div>
          <p class="mt-1 text-sm leading-6 text-[#6E4D58]">{{ section.description }}</p>
          <div v-if="section.items.length" class="mt-4 grid gap-3">
            <article v-for="match in section.items" :key="match.id" class="rounded-lg p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]" :class="section.tone">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 gap-4">
                  <img v-if="match.photoUrl" :src="match.photoUrl" :alt="`${match.name}'s primary profile photo`" class="size-14 shrink-0 rounded-full object-cover">
                  <div v-else class="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/75 text-lg font-semibold text-[#B4234A]">{{ match.name.charAt(0) }}</div>
                  <div class="min-w-0"><h3 class="text-lg font-semibold">{{ match.name }}</h3><p v-if="match.activity" class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#8F1839]"><Sparkles class="size-3.5" />{{ match.activity }}</p><p v-if="match.venue || match.place" class="mt-1 flex items-center gap-1 truncate text-xs text-[#6E4D58]"><MapPin class="size-3.5 shrink-0" />{{ match.venue || match.place }}</p></div>
                </div>
                <span class="inline-flex w-fit items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold" :class="statusBadgeClass(match)"><component :is="section.icon" class="size-3.5" />{{ statusLabel(match) }}</span>
              </div>
              <div class="mt-5 flex flex-col gap-2 min-[380px]:flex-row">
                <button v-if="match.stage === 'queued'" type="button" class="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8F1839] disabled:opacity-50" :disabled="activatingMatch === match.id" @click="activateQueuedMatch(match)">{{ activatingMatch === match.id ? 'Checking space…' : actionLabel(match) }}<ChevronRight class="size-4 transition group-hover:translate-x-1" /></button>
                <NuxtLink v-else :to="planUrl(match)" class="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8F1839]">{{ actionLabel(match) }}<ChevronRight class="size-4 transition group-hover:translate-x-1" /></NuxtLink>
                <NuxtLink :to="`/profiles/${match.slug}`" class="inline-flex items-center justify-center rounded-lg bg-white/75 px-4 py-2.5 text-sm font-semibold text-[#8F1839] transition hover:bg-white">View {{ match.name }}’s profile</NuxtLink>
                <button type="button" class="inline-flex items-center justify-center rounded-lg border border-[#B4234A]/30 px-4 py-2.5 text-sm font-semibold text-[#8F1839] transition hover:bg-white/70" @click="pendingReject = match; rejectError = ''">Close connection</button>
              </div>
              <p v-if="activationError[match.id]" class="mt-3 text-xs font-semibold text-[#8F1839]" role="alert">{{ activationError[match.id] }}</p>
              <div v-if="match.stage === 'confirmed' && !match.dateHasPassed" class="mt-4 rounded-lg bg-white/65 p-4">
                <div class="flex flex-wrap items-center justify-between gap-2"><div><h4 class="text-sm font-semibold">Still going?</h4><p class="mt-1 text-xs text-[#6E4D58]">{{ match.attendanceConfirmed ? 'You confirmed you’re going.' : 'Let your date know, or change the plan early.' }}</p></div><span v-if="match.otherAttendanceConfirmed" class="rounded-full bg-[#EAF2DE] px-3 py-1 text-xs font-semibold text-[#52713A]">{{ match.name }} confirmed</span></div>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button type="button" class="rounded-lg bg-[#52713A] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" :disabled="match.attendanceConfirmed || Boolean(attendanceUpdating)" @click="confirmAttendance(match)">{{ attendanceUpdating === `${match.id}:confirm` ? 'Confirming…' : match.attendanceConfirmed ? 'Going confirmed' : 'Confirm I’m going' }}</button>
                  <NuxtLink :to="`/plans/${match.slug}`" class="rounded-lg bg-[#F3E8DA] px-3 py-2 text-xs font-semibold text-[#4D2F39]">Reschedule or cancel</NuxtLink>
                </div>
              </div>
              <div v-if="match.stage === 'confirmed' && !match.dateHasPassed && match.proposalId" class="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/65 p-4">
                <div class="flex items-start gap-2">
                  <BadgePercent class="mt-0.5 size-4 shrink-0 text-[#B4234A]" />
                  <div>
                    <h4 class="text-sm font-semibold">{{ match.attachedOfferTitle || 'Add an offer to this date' }}</h4>
                    <p class="mt-1 text-xs text-[#6E4D58]">{{ match.attachedOfferTitle ? 'This offer is attached for you to use at the venue.' : 'Browse date-friendly venue offers and attach one to this plan.' }}</p>
                  </div>
                </div>
                <NuxtLink :to="`/offers?proposal=${match.proposalId}`" class="rounded-lg bg-[#FCE3E8] px-3 py-2 text-xs font-semibold text-[#8F1839]">{{ match.attachedOfferTitle ? 'View attached offer' : 'Attach an offer' }}</NuxtLink>
              </div>
            </article>
          </div>
        </section>
        <section v-if="!sections.length" class="rounded-lg bg-white p-8 text-center">
          <HeartHandshake class="mx-auto size-8 text-[#B4234A]" />
          <h2 class="mt-3 text-xl font-semibold">No active connections yet</h2>
          <p class="mt-2 text-sm leading-6 text-[#6E4D58]">Browse date ideas and choose someone you would genuinely like to meet.</p>
        </section>
      </div>

      <section v-if="notifications.length" class="updates-panel mt-10" aria-labelledby="match-updates-title">
        <div class="flex flex-col gap-4 border-b border-[#E8D8C4] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div class="flex items-start gap-3">
            <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#FCE3E8] text-[#B4234A]"><Bell class="size-4.5" aria-hidden="true" /></span>
            <div>
              <div class="flex flex-wrap items-center gap-2"><h2 id="match-updates-title" class="font-semibold">Earlier updates</h2><span class="rounded-full bg-[#B4234A] px-2 py-0.5 text-[10px] font-extrabold text-white">{{ notifications.length }}</span></div>
              <p class="mt-1 text-xs text-[#6E4D58]">A history of recent changes to your connections and plans.</p>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3 text-xs font-semibold">
            <button type="button" class="inline-flex items-center gap-1.5 text-[#6E4D58] hover:text-[#8F1839]" :disabled="markingAllUpdatesSeen" @click="markAllUpdatesSeen"><CheckCheck class="size-4" />{{ markingAllUpdatesSeen ? 'Marking…' : 'Mark all seen' }}</button>
            <NuxtLink to="/notifications" class="inline-flex items-center gap-1.5 text-[#8F1839] hover:underline"><History class="size-4" />Full history</NuxtLink>
          </div>
        </div>

        <div class="px-4 py-2 sm:px-5">
          <section v-for="group in notificationGroups" :key="group.label" class="update-group">
            <h3 class="update-day">{{ group.label }}</h3>
            <ol class="update-timeline">
              <li v-for="notification in group.notifications" :key="notification.id" class="update-item">
                <span class="update-icon" :class="notificationTone(notification.kind)"><component :is="notificationIcon(notification.kind)" class="size-4" aria-hidden="true" /></span>
                <div class="min-w-0 flex-1 pb-4">
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0"><p class="text-[10px] font-extrabold uppercase tracking-wider text-[#8F1839]">{{ notificationCategory(notification.kind) }}</p><p class="mt-1 text-sm leading-6 text-[#4D2F39]">{{ notificationCopy(notification) }}</p></div>
                    <time :datetime="notification.createdAt" class="shrink-0 text-[11px] font-semibold text-[#8A6A74]">{{ notificationTime(notification.createdAt) }}</time>
                  </div>
                  <div class="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <NuxtLink v-if="notification.kind !== 'match_ended'" :to="notificationUrl(notification)" class="font-bold text-[#8F1839]" @click="dismissNotification(notification.id)">Review update</NuxtLink>
                    <button type="button" class="inline-flex items-center gap-1 text-[#6E4D58] hover:text-[#8F1839]" :aria-label="`Mark ${notificationCategory(notification.kind).toLowerCase()} update as seen`" @click="dismissNotification(notification.id)"><X class="size-3.5" />Mark seen</button>
                  </div>
                </div>
              </li>
            </ol>
          </section>
        </div>
        <button v-if="hiddenNotificationCount" type="button" class="flex w-full items-center justify-center gap-1.5 border-t border-[#E8D8C4] px-4 py-3 text-xs font-bold text-[#8F1839]" @click="showAllMatchUpdates = true">Show {{ hiddenNotificationCount }} older {{ hiddenNotificationCount === 1 ? 'update' : 'updates' }} <ChevronDown class="size-4" /></button>
        <button v-else-if="showAllMatchUpdates && notifications.length > 4" type="button" class="flex w-full items-center justify-center gap-1.5 border-t border-[#E8D8C4] px-4 py-3 text-xs font-bold text-[#8F1839]" @click="showAllMatchUpdates = false">Show recent only <ChevronDown class="size-4 rotate-180" /></button>
      </section>

      <NuxtLink to="/activities" class="mt-9 inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white"><CalendarDays class="size-4" />Browse date ideas</NuxtLink>
    </section>

    <div v-if="pendingReject" class="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1520]/55 p-5" role="presentation" @click.self="pendingReject = null">
      <section role="alertdialog" aria-modal="true" aria-labelledby="reject-title" class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 id="reject-title" class="text-2xl font-semibold">Close your connection with {{ pendingReject.name }}?</h2>
        <p class="mt-3 text-sm leading-6 text-[#6E4D58]">This cannot be undone. {{ pendingReject.name }} will be told that the connection ended, and any plans will no longer appear here.</p>
        <p v-if="rejectError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ rejectError }}</p>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" class="rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold" :disabled="rejecting" @click="pendingReject = null">Keep connection</button>
          <button type="button" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="rejecting" @click="rejectMatch">{{ rejecting ? 'Closing…' : 'Yes, close connection' }}</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.updates-panel { overflow: hidden; border: 1px solid rgba(180,35,74,.12); border-radius: .75rem; background: rgba(255,255,255,.78); box-shadow: 0 10px 26px rgba(180,35,74,.07); }
.update-group + .update-group { border-top: 1px solid #E8D8C4; }
.update-day { padding: .8rem 0 .45rem; color: #6E4D58; font-size: .68rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.update-timeline { position: relative; }
.update-timeline::before { position: absolute; bottom: 1.4rem; left: 1rem; top: 1.2rem; width: 1px; background: #E4D4C3; content: ''; }
.update-item { position: relative; display: flex; gap: .8rem; }
.update-icon { z-index: 1; display: inline-flex; height: 2rem; width: 2rem; flex-shrink: 0; align-items: center; justify-content: center; border: 3px solid rgba(255,255,255,.95); border-radius: 999px; }
.update-icon-match { background: #FCE3E8; color: #B4234A; }
.update-icon-plan { background: #FFF1C7; color: #806000; }
.update-icon-success { background: #EAF2DE; color: #52713A; }
.update-icon-alert { background: #F3E8DA; color: #8F1839; }
</style>
