<script setup lang="ts">
import { CalendarDays, Check, ChevronDown, Copy, ExternalLink, MapPin, MessageCircle, RefreshCw, ShieldCheck, Sparkles, XCircle } from '@lucide/vue'
import { trackProductEvent } from '~/utils/productAnalytics'
import { isUkPostcode, normalizeUkPostcode } from '~/utils/ukPostcode'

definePageMeta({ middleware: 'logged-in' })

const route = useRoute()
const databasePerson = ref<{ name: string } | null>(null)
const databaseActivities = ref<string[]>([])
const planningLoaded = ref(false)
const planningError = ref('')
const allowDemoPlan = ref(false)
type AvailabilityWindow = { label: string; weekday?: number | null; startTime?: string | null; endTime?: string | null }
type TimeOption = { label: string; value: string; id?: string }
const matchAvailability = ref<AvailabilityWindow[]>([])
const availabilityTimezone = ref('Europe/London')
const viewerAvailability = ref<AvailabilityWindow[]>([])
const viewerTimezone = ref('Europe/London')
const sharedSuggestedTimes = ref<TimeOption[]>([])
const proposalId = ref<string | null>(null)
const proposalStatus = ref<string | null>(null)
type ConfirmedPlan = { id: string; activity: string; venue: string; venueAddress?: string | null; venuePostcode?: string | null; meetingPoint?: string | null; venueDetails?: string | null; confirmedTime?: string | null }
const currentConfirmed = ref<ConfirmedPlan | null>(null)
const canRespond = ref(false)
const reproposing = ref(false)
const proposalSnapshot = ref<{ activity: string; inviteMessage: string; venue: string; venueAddress: string; venuePostcode: string; venueDetails: string; publicVenueConfirmed: boolean; times: Array<{ label: string; value: string; id?: string }>; selectedTimes: string[] } | null>(null)
const names: Record<string, string> = { maya: 'Maya', nina: 'Nina', alex: 'Alex' }
const activityLabels: Record<string, string> = { 'gallery-wander': 'Gallery wander', 'indie-film': 'Indie film', 'climbing-taster': 'Climbing taster' }
const interestsByPerson: Record<string, string[]> = {
  maya: ['Gallery walks', 'Sunday markets', 'Live music', 'Bookshops', 'Riverside walks'],
  nina: ['Indie films', 'City walks', 'Casual food spots', 'Comedy nights', 'Markets'],
  alex: ['Climbing', 'Book markets', 'Riverside walks', 'Board games', 'Cooking classes'],
}
const personName = computed(() => databasePerson.value?.name
  || (allowDemoPlan.value ? names[String(route.params.slug)] : null) || 'Your match')
const activities = computed(() => databaseActivities.value.length ? databaseActivities.value
  : allowDemoPlan.value ? (interestsByPerson[String(route.params.slug)] || []) : [])
const initialActivity = computed(() => activityLabels[String(route.query.activity)] || activities.value[0] || '')
const activity = ref(initialActivity.value)
const customActivity = ref('')
const activityLimit = 100
const inviteMessage = ref('')
const inviteMessageLimit = 240
const venueLimit = 200
const venueAddressLimit = 300
const venuePostcodeLimit = 12
const venueDetailsLimit = 300
const selectedTimes = ref<string[]>([])
const venue = ref('')
const venueAddress = ref('')
const venuePostcode = ref('')
const venueDetails = ref('')
const publicVenueConfirmed = ref(false)
const suggestedVenue = ref('')
const suggestedVenueAddress = ref('')
const suggestedVenuePostcode = ref('')
const suggestedVenueDetails = ref('')
const suggestedPublicVenueConfirmed = ref(false)
const suggestedTime = ref('')
const suggestedMessage = ref('')
const customTime = ref('')
const earliestCustomTime = ref('')
const customTimeError = ref('')
const chosenCustomTimeLabel = ref('')
const suggestingChanges = ref(false)
const smallChangeOpen = ref(false)
const confirmed = ref(false)
const sending = ref(false)
const sendError = ref('')
const planAction = ref<'reschedule' | 'cancel' | null>(null)
const showCancelConfirmation = ref(false)
const copyStatus = ref('')
const structuredAvailability = computed(() => matchAvailability.value.filter(window =>
  Number.isInteger(window.weekday) && /^\d{2}:\d{2}/.test(window.startTime || '') && /^\d{2}:\d{2}/.test(window.endTime || '')))
const structuredViewerAvailability = computed(() => viewerAvailability.value.filter(window =>
  Number.isInteger(window.weekday) && /^\d{2}:\d{2}/.test(window.startTime || '') && /^\d{2}:\d{2}/.test(window.endTime || '')))
const bothSchedulesConfigured = computed(() => Boolean(structuredAvailability.value.length
  && structuredViewerAvailability.value.length))
function minutes(time: string) {
  const [hour, minute] = time.slice(0, 5).split(':').map(Number)
  return hour * 60 + minute
}
function fitsAvailability(date: Date, windows: AvailabilityWindow[], timeZone: string) {
  if (!windows.length) return true
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
      timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).map(part => [part.type, part.value]))
    const weekday = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(parts.weekday)
    const selectedMinutes = Number(parts.hour) * 60 + Number(parts.minute)
    return windows.some(window => window.weekday === weekday
      && selectedMinutes >= minutes(window.startTime!) && selectedMinutes + 60 <= minutes(window.endTime!))
  } catch { return false }
}
function fitsSharedAvailability(date: Date) {
  return fitsAvailability(date, structuredAvailability.value, availabilityTimezone.value)
    && fitsAvailability(date, structuredViewerAvailability.value, viewerTimezone.value)
}
const times = ref<TimeOption[]>([])
const isReplacement = computed(() => Boolean(currentConfirmed.value && proposalId.value !== currentConfirmed.value.id))
const isNewProposal = computed(() => isReplacement.value || reproposing.value)
const canEditProposal = computed(() => !proposalId.value || proposalStatus.value === 'draft' || reproposing.value)
const confirmedTimeLabel = computed(() => currentConfirmed.value?.confirmedTime
  ? new Date(currentConfirmed.value.confirmedTime).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
    })
  : 'Time unavailable')
const customActivitySelected = computed(() => Boolean(activity.value) && !activities.value.includes(activity.value))
const proposalLocationComplete = computed(() => Boolean(venue.value.trim() && venueAddress.value.trim()
  && isUkPostcode(venuePostcode.value) && publicVenueConfirmed.value))
const suggestedLocationComplete = computed(() => Boolean(suggestedVenue.value.trim() && suggestedVenueAddress.value.trim()
  && isUkPostcode(suggestedVenuePostcode.value) && suggestedPublicVenueConfirmed.value))
function chooseListedActivity(option: string) {
  activity.value = option
  customActivity.value = ''
  sendError.value = ''
}
function updateCustomActivity() {
  activity.value = customActivity.value.trim().replace(/\s+/g, ' ')
  sendError.value = ''
}
function normalizeProposalPostcode() {
  venuePostcode.value = normalizeUkPostcode(venuePostcode.value)
}
function normalizeSuggestedPostcode() {
  suggestedVenuePostcode.value = normalizeUkPostcode(suggestedVenuePostcode.value)
}
function meetingAddress(name: string, address?: string | null, postcode?: string | null) {
  return [name, address, postcode].filter(Boolean).join(', ')
}
function mapSearchUrl(name: string, address?: string | null, postcode?: string | null) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingAddress(name, address, postcode))}`
}
async function copyMeetingAddress(name: string, address?: string | null, postcode?: string | null) {
  try {
    await navigator.clipboard.writeText(meetingAddress(name, address, postcode))
    copyStatus.value = 'Address copied'
  } catch {
    copyStatus.value = 'Could not copy the address'
  }
}
function resetCustomTimeSelection() {
  customTimeError.value = ''
  chosenCustomTimeLabel.value = ''
  times.value = []
  selectedTimes.value = []
}
function chooseCustomTime() {
  customTimeError.value = ''
  chosenCustomTimeLabel.value = ''
  const [datePart, timePart] = customTime.value.split('T')
  const [year, month, day] = (datePart || '').split('-').map(Number)
  const [hour, minute] = (timePart || '').split(':').map(Number)
  const date = new Date(year, month - 1, day, hour, minute, 0, 0)
  if (Number.isNaN(date.getTime()) || date <= new Date()) {
    customTimeError.value = 'Choose a complete date and time in the future.'
    return
  }
  if (!fitsSharedAvailability(date)) {
    customTimeError.value = 'Choose a time that fits both of your usual schedules, with at least an hour free.'
    return
  }
  const value = date.toISOString()
  const label = date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  times.value = [{ value, label }]
  selectedTimes.value = [value]
  chosenCustomTimeLabel.value = label
  sendError.value = ''
}
function chooseSuggestedTime(option: TimeOption) {
  times.value = [{ ...option }]
  selectedTimes.value = [option.value]
  customTime.value = ''
  customTimeError.value = ''
  chosenCustomTimeLabel.value = option.label
  sendError.value = ''
}
function beginReproposal() {
  proposalSnapshot.value = { activity: activity.value, inviteMessage: inviteMessage.value, venue: venue.value,
    venueAddress: venueAddress.value, venuePostcode: venuePostcode.value, venueDetails: venueDetails.value,
    publicVenueConfirmed: publicVenueConfirmed.value,
    times: times.value.map(time => ({ ...time })), selectedTimes: [...selectedTimes.value] }
  reproposing.value = true
  activity.value = activities.value[0] || ''
  customActivity.value = ''
  inviteMessage.value = ''
  venue.value = ''
  venueAddress.value = ''
  venuePostcode.value = ''
  venueDetails.value = ''
  publicVenueConfirmed.value = false
  times.value = []
  selectedTimes.value = []
  customTime.value = ''
  customTimeError.value = ''
  chosenCustomTimeLabel.value = ''
}
function cancelReproposal() {
  if (proposalSnapshot.value) {
    activity.value = proposalSnapshot.value.activity
    customActivity.value = activities.value.includes(activity.value) ? '' : activity.value
    inviteMessage.value = proposalSnapshot.value.inviteMessage
    venue.value = proposalSnapshot.value.venue
    venueAddress.value = proposalSnapshot.value.venueAddress
    venuePostcode.value = proposalSnapshot.value.venuePostcode
    venueDetails.value = proposalSnapshot.value.venueDetails
    publicVenueConfirmed.value = proposalSnapshot.value.publicVenueConfirmed
    times.value = proposalSnapshot.value.times
    selectedTimes.value = proposalSnapshot.value.selectedTimes
    chosenCustomTimeLabel.value = proposalSnapshot.value.times[0]?.label || ''
  }
  customTime.value = ''
  customTimeError.value = ''
  proposalSnapshot.value = null
  reproposing.value = false
}
function timeLabel(value: string) { return times.value.find(time => time.value === value)?.label || value }
async function saveProposalDraft() {
  sending.value = true
  sendError.value = ''
  try {
    const endpoint = proposalId.value ? `/api/proposals/${proposalId.value}` : '/api/proposals'
    const body = { profileSlug: String(route.params.slug), activity: activity.value,
      inviteNote: inviteMessage.value, venue: venue.value, venueAddress: venueAddress.value,
      venuePostcode: normalizeUkPostcode(venuePostcode.value), meetingPoint: venueDetails.value,
      publicVenueConfirmed: publicVenueConfirmed.value,
      times: selectedTimes.value, fullReproposal: isNewProposal.value }
    const response = await $fetch<{ id: string; status: string }>(endpoint, { method: proposalId.value ? 'PUT' : 'POST', body })
    proposalId.value = response.id
    proposalStatus.value = response.status
    canRespond.value = false
    if (reproposing.value) { reproposing.value = false; proposalSnapshot.value = null; confirmed.value = true }
    return true
  } catch (error: any) {
    const status = (error as { response?: { status?: number } }).response?.status
    if (import.meta.dev && allowDemoPlan.value && status === 404) { proposalStatus.value = 'draft'; return true }
    else sendError.value = error?.data?.statusMessage || 'We could not send this proposal. Please review the details and try again.'
    return false
  } finally { sending.value = false }
}
async function confirmAndSend() {
  const wasReproposal = isNewProposal.value
  const saved = await saveProposalDraft()
  if (!saved || !proposalId.value) return
  if (proposalStatus.value !== 'draft') {
    if (proposalStatus.value === 'pending') await navigateTo('/matches')
    return
  }
  sending.value = true
  sendError.value = ''
  try {
    const response = await $fetch<{ status: string }>(`/api/proposals/${proposalId.value}/send`, { method: 'POST' })
    proposalStatus.value = response.status
    confirmed.value = true
    trackProductEvent('Date Proposal Sent', { reproposal: wasReproposal })
    await navigateTo('/matches')
  } catch (error: any) {
    sendError.value = error?.data?.statusMessage || 'The draft was saved, but could not be sent.'
  } finally { sending.value = false }
}
async function respond(status: 'accepted' | 'declined', timeId?: string) {
  if (!proposalId.value) return
  sending.value = true; sendError.value = ''
  try {
    await $fetch(`/api/proposals/${proposalId.value}/respond`, { method: 'POST', body: { status, timeId } })
    proposalStatus.value = status
    canRespond.value = false
    if (status === 'accepted') {
      confirmed.value = true
      trackProductEvent('Date Confirmed')
      await loadPlanning()
    }
    else await navigateTo('/matches')
  } catch (error: any) { sendError.value = error?.data?.statusMessage || 'We could not save your response.' }
  finally { sending.value = false }
}
async function requestReschedule() {
  if (!currentConfirmed.value?.id || planAction.value) return
  planAction.value = 'reschedule'
  sendError.value = ''
  try {
    await $fetch(`/api/proposals/${currentConfirmed.value.id}/attendance`, {
      method: 'POST', body: { action: 'reschedule' },
    })
    trackProductEvent('Date Reschedule Started')
    await loadPlanning()
  } catch (error: any) {
    sendError.value = error?.data?.statusMessage || 'A new date proposal could not be started.'
  } finally {
    planAction.value = null
  }
}
async function cancelConfirmedDate() {
  if (!currentConfirmed.value?.id || planAction.value) return
  planAction.value = 'cancel'
  sendError.value = ''
  try {
    await $fetch(`/api/proposals/${currentConfirmed.value.id}/attendance`, {
      method: 'POST', body: { action: 'cancel' },
    })
    trackProductEvent('Date Cancelled')
    showCancelConfirmation.value = false
    await navigateTo('/matches?date=cancelled')
  } catch (error: any) {
    sendError.value = error?.data?.statusMessage || 'The date could not be cancelled.'
  } finally {
    planAction.value = null
  }
}
async function discardRescheduleDraft() {
  if (!proposalId.value || !isReplacement.value || proposalStatus.value !== 'draft' || planAction.value) return
  if (!window.confirm(`Discard this reschedule draft? Your existing date with ${personName.value} will stay confirmed.`)) return
  planAction.value = 'reschedule'
  sendError.value = ''
  try {
    await $fetch(`/api/proposals/${proposalId.value}/discard`, { method: 'POST' })
    await loadPlanning()
  } catch (error: any) {
    sendError.value = error?.data?.statusMessage || 'The reschedule draft could not be discarded.'
  } finally {
    planAction.value = null
  }
}
async function suggestChanges() {
  if (!proposalId.value || !suggestedLocationComplete.value || !suggestedTime.value) return
  suggestingChanges.value = true; sendError.value = ''
  try {
    const proposedTime = new Date(suggestedTime.value)
    if (Number.isNaN(proposedTime.getTime()) || proposedTime <= new Date()) { sendError.value = 'Choose a future date and time.'; return }
    if (!fitsSharedAvailability(proposedTime)) {
      sendError.value = 'Choose a time that fits both of your usual schedules, with at least an hour free.'
      return
    }
    const response = await $fetch<any>(`/api/proposals/${proposalId.value}`, { method: 'PUT', body: {
      activity: activity.value, inviteNote: suggestedMessage.value, venue: suggestedVenue.value.trim(),
      venueAddress: suggestedVenueAddress.value.trim(),
      venuePostcode: normalizeUkPostcode(suggestedVenuePostcode.value),
      meetingPoint: suggestedVenueDetails.value.trim(),
      publicVenueConfirmed: suggestedPublicVenueConfirmed.value, times: [proposedTime.toISOString()],
    } })
    inviteMessage.value = response.inviteNote || ''
    venue.value = response.venue
    venueAddress.value = response.venueAddress
    venuePostcode.value = response.venuePostcode
    venueDetails.value = response.venueDetails || ''
    publicVenueConfirmed.value = true
    times.value = response.times.map((value: string) => ({ value, label: new Date(value).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) }))
    selectedTimes.value = response.times
    proposalStatus.value = 'pending'; canRespond.value = false; confirmed.value = true
    trackProductEvent('Date Changes Suggested')
  } catch (error: any) { sendError.value = error?.data?.statusMessage || 'Your suggested changes could not be sent.' }
  finally { suggestingChanges.value = false }
}
async function loadPlanning() {
  planningLoaded.value = false
  planningError.value = ''
  allowDemoPlan.value = false
  databasePerson.value = null
  databaseActivities.value = []
  currentConfirmed.value = null
  matchAvailability.value = []
  viewerAvailability.value = []
  sharedSuggestedTimes.value = []
  customTime.value = ''
  customTimeError.value = ''
  chosenCustomTimeLabel.value = ''
  const minimum = new Date(Date.now() + 15 * 60 * 1000)
  const pad = (value: number) => String(value).padStart(2, '0')
  earliestCustomTime.value = `${minimum.getFullYear()}-${pad(minimum.getMonth() + 1)}-${pad(minimum.getDate())}T${pad(minimum.getHours())}:${pad(minimum.getMinutes())}`
  try {
    const response = await $fetch<any>(`/api/planning/${String(route.params.slug)}`)
    databasePerson.value = response.person
    databaseActivities.value = response.activities
    matchAvailability.value = response.availability || []
    availabilityTimezone.value = response.availabilityTimezone || 'Europe/London'
    viewerAvailability.value = response.viewerAvailability || []
    viewerTimezone.value = response.viewerTimezone || 'Europe/London'
    sharedSuggestedTimes.value = (response.suggestedTimes || []).map((value: string) => ({ value,
      label: new Date(value).toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
      }),
    }))
    currentConfirmed.value = response.currentConfirmed || null
    if (response.proposal && route.query.new !== '1') {
      proposalId.value = response.proposal.id
      proposalStatus.value = response.proposal.status
      confirmed.value = ['pending','accepted'].includes(response.proposal.status)
      canRespond.value = response.proposal.status === 'pending' && response.proposal.inviteeId === response.viewerId
      activity.value = response.proposal.activity
      customActivity.value = activities.value.includes(activity.value) ? '' : activity.value
      inviteMessage.value = response.proposal.inviteNote || ''
      venue.value = response.proposal.venue
      venueAddress.value = response.proposal.venueAddress || ''
      venuePostcode.value = response.proposal.venuePostcode || ''
      venueDetails.value = response.proposal.venueDetails || ''
      publicVenueConfirmed.value = Boolean(response.proposal.publicVenueConfirmed)
      suggestedVenue.value = response.proposal.venue
      suggestedVenueAddress.value = response.proposal.venueAddress || ''
      suggestedVenuePostcode.value = response.proposal.venuePostcode || ''
      suggestedVenueDetails.value = response.proposal.venueDetails || ''
      suggestedPublicVenueConfirmed.value = false
      times.value = response.proposal.times.map((time: any) => ({ value: new Date(time.proposedAt).toISOString(), id: time.id,
        label: new Date(time.proposedAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) }))
      selectedTimes.value = times.value.map(time => time.value)
    } else {
      times.value = []
      selectedTimes.value = []
      venueAddress.value = ''
      venuePostcode.value = ''
      venueDetails.value = ''
      publicVenueConfirmed.value = false
      if (!databaseActivities.value.includes(activity.value)) activity.value = databaseActivities.value[0] || ''
      customActivity.value = ''
    }
  } catch (error: any) {
    const status = error?.statusCode || error?.response?.status || error?.data?.statusCode
    allowDemoPlan.value = import.meta.dev && status === 404 && Boolean(names[String(route.params.slug)])
    if (!allowDemoPlan.value) planningError.value = error?.data?.statusMessage || 'This planning room could not be loaded.'
  } finally {
    planningLoaded.value = true
  }
}
onMounted(async () => {
  await loadPlanning()
})
useHead(() => ({ title: `Plan a Date with ${personName.value} · Lonely Radish` }))
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-8 text-[#2A1520] sm:px-8 sm:py-10">
    <section class="mx-auto max-w-4xl">
      <div v-if="!planningLoaded" class="rounded-lg bg-white p-8 text-center text-sm text-[#6E4D58]" role="status">Loading your planning room…</div>
      <section v-else-if="planningError" class="rounded-lg bg-[#FCE3E8] p-6 text-center text-sm font-semibold text-[#8F1839]" role="alert">
        <p>{{ planningError }}</p><button type="button" class="mt-4 rounded-lg bg-white px-4 py-2" @click="loadPlanning">Try again</button>
      </section>
      <template v-else>
      <div class="rounded-lg bg-[#2A1520] p-6 text-white sm:p-8"><p class="text-xs font-extrabold uppercase tracking-widest text-[#F7B7C4]">Planning room</p><h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Plan a date with {{ personName }}</h1><p class="mt-3 text-sm leading-6 text-white/75">Agree the essentials here. Save the real conversation for when you meet.</p></div>

      <div class="mt-5 grid gap-5">
        <section v-if="matchAvailability.length" class="rounded-lg bg-[#F3E8DA] p-5 sm:p-6"><div class="flex items-center gap-2"><CalendarDays class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">When {{ personName }} is usually free</h2></div><p class="mt-2 text-sm text-[#6E4D58]">Suggested and custom times must fit their shared schedule, with at least an hour available.</p><div class="mt-4 flex flex-wrap gap-2"><span v-for="window in matchAvailability" :key="window.label" class="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#4D2F39]">{{ window.label }}</span></div></section>
        <section v-if="currentConfirmed" class="rounded-lg border border-[#B8CCA0] bg-[#EAF2DE] p-5 sm:p-6">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-extrabold uppercase tracking-widest text-[#52713A]">{{ isReplacement ? 'Current date — still confirmed' : 'Confirmed date' }}</p>
              <h2 class="mt-1 text-xl font-semibold">{{ currentConfirmed.activity }}</h2>
            </div>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#52713A]"><Check class="size-3.5" />Confirmed</span>
          </div>
          <dl class="mt-4 grid gap-3 rounded-lg bg-white/70 p-4 text-sm sm:grid-cols-2">
            <div><dt class="text-[#6E4D58]">Date and time</dt><dd class="font-semibold">{{ confirmedTimeLabel }}</dd></div>
            <div>
              <dt class="text-[#6E4D58]">Public venue</dt>
              <dd class="font-semibold">{{ currentConfirmed.venue }}</dd>
              <dd v-if="currentConfirmed.venueAddress" class="mt-1 text-[#4D2F39]">{{ currentConfirmed.venueAddress }}</dd>
              <dd v-if="currentConfirmed.venuePostcode" class="font-semibold text-[#4D2F39]">{{ currentConfirmed.venuePostcode }}</dd>
              <dd v-if="currentConfirmed.meetingPoint || currentConfirmed.venueDetails" class="mt-2 whitespace-pre-wrap text-[#4D2F39]"><span class="font-semibold">Meet:</span> {{ currentConfirmed.meetingPoint || currentConfirmed.venueDetails }}</dd>
              <div v-if="currentConfirmed.venueAddress || currentConfirmed.venuePostcode" class="mt-3 flex flex-wrap gap-3 text-xs font-semibold">
                <a :href="mapSearchUrl(currentConfirmed.venue, currentConfirmed.venueAddress, currentConfirmed.venuePostcode)" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[#8F1839] hover:underline"><ExternalLink class="size-3.5" />View on map</a>
                <button type="button" class="inline-flex items-center gap-1 text-[#8F1839] hover:underline" @click="copyMeetingAddress(currentConfirmed.venue, currentConfirmed.venueAddress, currentConfirmed.venuePostcode)"><Copy class="size-3.5" />Copy address</button>
              </div>
            </div>
          </dl>
          <p v-if="copyStatus" class="mt-3 text-xs font-semibold text-[#52713A]" role="status">{{ copyStatus }}</p>
          <p v-if="isReplacement" class="mt-4 text-sm leading-6 text-[#4D2F39]">This remains the agreed plan until {{ personName }} accepts the new proposal. Sending or declining a replacement does not silently change it.</p>
          <div class="mt-5 flex flex-col gap-2 sm:flex-row">
            <button v-if="proposalStatus === 'accepted'" type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4D2F39] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40" :disabled="Boolean(planAction)" @click="requestReschedule"><RefreshCw class="size-4" />{{ planAction === 'reschedule' ? 'Starting…' : 'Propose a different date' }}</button>
            <button v-if="isReplacement && proposalStatus === 'draft'" type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-white/70 px-4 py-3 text-sm font-semibold text-[#4D2F39] disabled:opacity-40" :disabled="Boolean(planAction)" @click="discardRescheduleDraft">Keep current date and discard draft</button>
            <button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg border border-[#B4234A]/35 bg-white/70 px-4 py-3 text-sm font-semibold text-[#8F1839] disabled:opacity-40" :disabled="Boolean(planAction)" @click="showCancelConfirmation = true"><XCircle class="size-4" />Cancel this date</button>
          </div>
          <p v-if="proposalStatus === 'accepted'" class="mt-3 text-xs leading-5 text-[#6E4D58]">Need to change the details? Propose a replacement so both people can clearly agree the new plan.</p>
        </section>
        <section v-if="proposalStatus === 'pending' && !canRespond"
          class="overflow-hidden rounded-lg border border-[#E6CF88] bg-gradient-to-br from-[#FFFDF5] to-[#FFF1C7] shadow-[0_16px_36px_rgba(105,76,0,0.10)]"
          aria-labelledby="sent-proposal-title">
          <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#E6CF88]/70 px-5 py-5 sm:px-6">
            <div class="flex min-w-0 items-start gap-3">
              <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#B4234A] text-white shadow-sm">
                <Check class="size-5" aria-hidden="true" />
              </span>
              <div>
                <p class="text-xs font-extrabold uppercase tracking-widest text-[#8F1839]">{{ isReplacement ? 'Reschedule proposed' : 'Proposal sent' }}</p>
                <h2 id="sent-proposal-title" class="mt-1 text-xl font-semibold">Waiting for {{ personName }}’s response</h2>
                <p class="mt-1 text-sm leading-6 text-[#694C00]">{{ isReplacement ? 'Your original date remains confirmed while they review this one.' : 'Here is exactly what you sent them.' }}</p>
              </div>
            </div>
            <span class="inline-flex items-center gap-2 rounded-full border border-[#E6CF88] bg-white/80 px-3 py-1.5 text-xs font-bold text-[#694C00]">
              <span class="size-2 rounded-full bg-[#D49A00]" aria-hidden="true"></span>Awaiting reply
            </span>
          </div>

          <div class="p-5 sm:p-6">
            <p class="text-xs font-extrabold uppercase tracking-widest text-[#6E4D58]">Your proposed date</p>
            <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div class="rounded-lg border border-white/90 bg-white/75 p-4 shadow-sm">
                <dt class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6E4D58]"><Sparkles class="size-4 text-[#B4234A]" aria-hidden="true" />Activity</dt>
                <dd class="mt-2 text-base font-semibold text-[#2A1520]">{{ activity }}</dd>
              </div>
              <div class="rounded-lg border border-white/90 bg-white/75 p-4 shadow-sm">
                <dt class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6E4D58]"><CalendarDays class="size-4 text-[#B4234A]" aria-hidden="true" />Date and time</dt>
                <dd class="mt-2 text-base font-semibold text-[#2A1520]">{{ times[0]?.label || 'Time unavailable' }}</dd>
              </div>
              <div class="rounded-lg border border-white/90 bg-white/75 p-4 shadow-sm sm:col-span-2">
                <dt class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6E4D58]"><MapPin class="size-4 text-[#B4234A]" aria-hidden="true" />Meeting place</dt>
                <dd class="mt-2 text-base font-semibold text-[#2A1520]">{{ venue }}</dd>
                <dd v-if="venueAddress" class="mt-1 text-[#4D2F39]">{{ venueAddress }}</dd>
                <dd v-if="venuePostcode" class="font-semibold text-[#4D2F39]">{{ venuePostcode }}</dd>
                <dd v-if="venueDetails" class="mt-2 whitespace-pre-wrap text-[#4D2F39]"><span class="font-semibold">Meet:</span> {{ venueDetails }}</dd>
                <div v-if="venueAddress || venuePostcode" class="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                  <a :href="mapSearchUrl(venue, venueAddress, venuePostcode)" target="_blank" rel="noopener noreferrer"
                    class="inline-flex items-center gap-1.5 rounded-full bg-[#FCE3E8] px-3 py-2 text-[#8F1839] transition hover:brightness-95"><ExternalLink class="size-3.5" />View on map</a>
                  <button type="button"
                    class="inline-flex items-center gap-1.5 rounded-full bg-[#F3E8DA] px-3 py-2 text-[#8F1839] transition hover:brightness-95"
                    @click="copyMeetingAddress(venue, venueAddress, venuePostcode)"><Copy class="size-3.5" />Copy address</button>
                </div>
              </div>
              <div v-if="inviteMessage" class="rounded-lg border border-white/90 bg-white/75 p-4 shadow-sm sm:col-span-2">
                <dt class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#6E4D58]"><MessageCircle class="size-4 text-[#B4234A]" aria-hidden="true" />Your note</dt>
                <dd class="mt-2 whitespace-pre-wrap leading-6 text-[#4D2F39]">“{{ inviteMessage }}”</dd>
              </div>
            </dl>
            <p v-if="copyStatus" class="mt-3 text-xs font-semibold text-[#694C00]" role="status">{{ copyStatus }}</p>
          </div>
        </section>
        <section v-if="canRespond && !reproposing" class="rounded-lg bg-[#EAF2DE] p-5 sm:p-6">
          <h2 class="text-xl font-semibold">{{ isReplacement ? `${personName} proposed a different date` : `${personName} suggested this date` }}</h2>
          <p class="mt-2 text-sm text-[#4D2F39]">Have a look at the details. You can say yes, decline, or suggest a change.</p>
          <dl class="mt-5 grid gap-3 rounded-lg bg-white/75 p-4 text-sm">
            <div><dt class="text-[#6E4D58]">Activity</dt><dd class="font-semibold">{{ activity }}</dd></div>
            <div v-if="inviteMessage"><dt class="text-[#6E4D58]">Their note</dt><dd class="whitespace-pre-wrap">{{ inviteMessage }}</dd></div>
            <div><dt class="text-[#6E4D58]">Proposed time</dt><dd class="font-semibold">{{ times[0]?.label || 'Time unavailable' }}</dd></div>
            <div>
              <dt class="text-[#6E4D58]">Venue</dt><dd class="font-semibold">{{ venue }}</dd><dd v-if="venueAddress" class="mt-1">{{ venueAddress }}</dd><dd v-if="venuePostcode" class="font-semibold">{{ venuePostcode }}</dd><dd v-if="venueDetails" class="mt-2 whitespace-pre-wrap text-[#4D2F39]"><span class="font-semibold">Meet:</span> {{ venueDetails }}</dd>
              <div v-if="venueAddress || venuePostcode" class="mt-3 flex flex-wrap gap-3 text-xs font-semibold"><a :href="mapSearchUrl(venue, venueAddress, venuePostcode)" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-[#8F1839] hover:underline"><ExternalLink class="size-3.5" />View on map</a><button type="button" class="inline-flex items-center gap-1 text-[#8F1839] hover:underline" @click="copyMeetingAddress(venue, venueAddress, venuePostcode)"><Copy class="size-3.5" />Copy address</button></div>
            </div>
          </dl>
          <p v-if="copyStatus" class="mt-3 text-xs font-semibold text-[#52713A]" role="status">{{ copyStatus }}</p>
          <div class="mt-5 grid gap-2 sm:grid-cols-3">
            <button type="button" class="rounded-lg bg-[#B4234A] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40" :disabled="sending || suggestingChanges || !times[0]?.id" @click="respond('accepted', times[0]?.id)">{{ sending ? 'Accepting…' : 'Accept proposal' }}</button>
            <button type="button" class="rounded-lg border border-[#B4234A]/40 bg-white/75 px-4 py-3 text-sm font-semibold text-[#8F1839] disabled:opacity-40" :disabled="sending || suggestingChanges" @click="respond('declined')">Decline</button>
            <button type="button" class="rounded-lg bg-[#4D2F39] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40" :disabled="sending || suggestingChanges" @click="beginReproposal">Suggest a different plan</button>
          </div>
          <div class="mt-6 border-t border-[#C9D8B5] pt-5">
            <button type="button" class="group flex w-full items-center justify-between gap-3 text-left font-semibold text-[#4D2F39]" :aria-expanded="smallChangeOpen" aria-controls="small-change-form" @click="smallChangeOpen = !smallChangeOpen"><span class="underline-offset-4 group-hover:underline">Suggest a small change</span><ChevronDown class="size-5 shrink-0 transition-transform" :class="smallChangeOpen && 'rotate-180'" aria-hidden="true" /></button>
            <form v-show="smallChangeOpen" id="small-change-form" class="mt-3" @submit.prevent="suggestChanges">
              <div class="grid gap-3 sm:grid-cols-2"><label class="text-sm font-semibold">New date and time<input v-model="suggestedTime" type="datetime-local" :min="earliestCustomTime" class="field" required></label><label class="text-sm font-semibold">Public venue name<input v-model="suggestedVenue" type="text" :maxlength="venueLimit" class="field" required placeholder="For example, Barbican Centre"><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ suggestedVenue.length }}/{{ venueLimit }}</span></label></div>
              <div class="mt-3 grid gap-3 sm:grid-cols-[1fr_10rem]">
                <label class="text-sm font-semibold">Public address<input v-model="suggestedVenueAddress" type="text" :maxlength="venueAddressLimit" class="field" required placeholder="For example, Silk Street, London"><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ suggestedVenueAddress.length }}/{{ venueAddressLimit }}</span></label>
                <label class="text-sm font-semibold">UK postcode<input v-model="suggestedVenuePostcode" type="text" :maxlength="venuePostcodeLimit" class="field uppercase" required placeholder="EC2Y 8DS" autocomplete="postal-code" @blur="normalizeSuggestedPostcode"><span v-if="suggestedVenuePostcode && !isUkPostcode(suggestedVenuePostcode)" class="mt-1 block text-xs font-normal text-[#8F1839]">Enter a valid UK postcode.</span></label>
              </div>
              <label class="mt-3 block text-sm font-semibold">Exact meeting point <span class="font-normal text-[#6E4D58]">(optional)</span><textarea v-model="suggestedVenueDetails" :maxlength="venueDetailsLimit" rows="2" class="field resize-none" placeholder="For example, beside the box office at the Silk Street entrance"></textarea><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ suggestedVenueDetails.length }}/{{ venueDetailsLimit }}</span></label>
              <label class="mt-3 flex items-start gap-3 rounded-lg bg-white/75 p-3 text-sm font-semibold"><input v-model="suggestedPublicVenueConfirmed" type="checkbox" class="mt-1 size-4 accent-[#B4234A]"><span>I confirm this is a public meeting place, not a private home address.</span></label>
              <label class="mt-3 block text-sm font-semibold">Short reply <span class="font-normal text-[#6E4D58]">(optional)</span><textarea v-model="suggestedMessage" :maxlength="inviteMessageLimit" rows="2" class="field resize-none" placeholder="For example: A little later would work better for me."></textarea><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ suggestedMessage.length }}/{{ inviteMessageLimit }}</span></label>
              <button type="submit" class="mt-4 rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40" :disabled="!suggestedTime || !suggestedLocationComplete || suggestingChanges">{{ suggestingChanges ? 'Sending changes…' : 'Send suggested changes' }}</button>
            </form>
          </div>
          <p v-if="sendError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ sendError }}</p>
        </section>
        <section v-if="canEditProposal" class="plan-card">
          <div class="flex items-center gap-2"><Sparkles class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">1. Choose an activity</h2></div>
          <p class="mt-2 text-sm text-[#6E4D58]">Choose one of {{ personName }}’s interests, or suggest another activity you think you would both enjoy.</p>
          <div v-if="activities.length" class="mt-4 grid gap-2 sm:grid-cols-2">
            <button v-for="option in activities" :key="option" type="button" class="choice" :class="activity === option && 'choice-selected'" @click="chooseListedActivity(option)">{{ option }}</button>
          </div>
          <div class="mt-5 border-t border-[#E8D8C4] pt-5">
            <label for="custom-activity" class="text-sm font-semibold">Suggest a different activity</label>
            <p class="mt-1 text-xs leading-5 text-[#6E4D58]">Enter a short, specific idea. {{ personName }} will be able to review it before accepting the plan.</p>
            <input id="custom-activity" v-model="customActivity" type="text" :maxlength="activityLimit" class="field" placeholder="For example, pottery painting or a food market" autocomplete="off" @input="updateCustomActivity">
            <div class="mt-1 flex items-center justify-between gap-3">
              <p v-if="customActivitySelected" class="text-xs font-semibold text-[#52713A]" role="status">Custom activity selected: {{ activity }}</p>
              <span v-else class="text-xs text-[#6E4D58]">Typing here selects your custom idea.</span>
              <span class="shrink-0 text-xs text-[#6E4D58]">{{ customActivity.length }}/{{ activityLimit }}</span>
            </div>
          </div>
        </section>
        <section v-if="canEditProposal" class="plan-card"><div class="flex items-center gap-2"><MessageCircle class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">2. Add a note</h2></div><p class="mt-2 text-sm text-[#6E4D58]">Keep it simple. You’ll have plenty to talk about when you meet.</p><textarea v-model="inviteMessage" :maxlength="inviteMessageLimit" rows="4" class="mt-4 w-full resize-none rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] px-4 py-3 text-sm outline-none transition focus:border-[#B4234A] focus:ring-2 focus:ring-[#F7B7C4]" :placeholder="`For example: I’d love to try this with you. A weekend afternoon could work well for me.`"></textarea><p class="mt-2 text-right text-xs text-[#6E4D58]">{{ inviteMessage.length }}/{{ inviteMessageLimit }}</p></section>
        <section v-if="canEditProposal" class="plan-card">
          <div class="flex items-center gap-2"><CalendarDays class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">3. Suggest a date and time</h2></div>
          <p class="mt-2 text-sm text-[#6E4D58]">Choose a time that works for both of you, or pick another time below.</p>
          <div v-if="sharedSuggestedTimes.length" class="mt-4 rounded-lg bg-[#EAF2DE] p-4">
            <p class="text-sm font-semibold text-[#4D2F39]">Times that fit both schedules</p>
            <p class="mt-1 text-xs leading-5 text-[#6E4D58]">These suggestions use your shared availability without adding either full schedule to the proposal.</p>
            <div class="mt-3 grid gap-2 sm:grid-cols-3">
              <button v-for="option in sharedSuggestedTimes" :key="option.value" type="button"
                class="rounded-lg border bg-white px-3 py-3 text-left text-sm font-semibold transition"
                :class="selectedTimes[0] === option.value ? 'border-[#B4234A] ring-2 ring-[#F7B7C4]' : 'border-[#C9D8B5] hover:border-[#B4234A]'"
                @click="chooseSuggestedTime(option)">{{ option.label }}</button>
            </div>
          </div>
          <p v-else-if="bothSchedulesConfigured" class="mt-4 rounded-lg bg-[#FFF1C7] p-3 text-sm text-[#694C00]">There are no shared one-hour windows in the next two weeks. You can choose a later time that fits both schedules.</p>
          <div class="mt-5 border-t border-[#E8D8C4] pt-5">
            <label class="text-sm font-semibold">Choose another date and time<input v-model="customTime" type="datetime-local" :min="earliestCustomTime" class="field" @input="resetCustomTimeSelection"></label>
            <p class="mt-2 text-xs text-[#6E4D58]">{{ structuredAvailability.length || structuredViewerAvailability.length ? 'The time must leave at least one hour within each configured schedule.' : 'Select both a date and a time, then apply it to the proposal.' }}</p>
            <p v-if="customTimeError" class="mt-2 text-sm font-semibold text-[#8F1839]" role="alert">{{ customTimeError }}</p>
            <p v-if="chosenCustomTimeLabel" class="mt-2 text-sm font-semibold text-[#52713A]" role="status">Selected: {{ chosenCustomTimeLabel }}</p>
            <button type="button" class="mt-3 rounded-lg bg-[#4D2F39] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40" :disabled="!customTime" @click="chooseCustomTime">Use this time</button>
          </div>
        </section>
        <section v-if="canEditProposal" class="plan-card">
          <div class="flex items-center gap-2"><MapPin class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">4. Choose where to meet</h2></div>
          <p class="mt-2 text-sm leading-6 text-[#6E4D58]">Choose somewhere public and add enough detail that you’ll both arrive at the same spot.</p>
          <label class="mt-4 block text-sm font-semibold">Venue name<input v-model="venue" type="text" :maxlength="venueLimit" class="field" placeholder="For example, Barbican Centre" autocomplete="organization"><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ venue.length }}/{{ venueLimit }}</span></label>
          <div class="mt-4 grid gap-3 sm:grid-cols-[1fr_10rem]">
            <label class="text-sm font-semibold">Public address<input v-model="venueAddress" type="text" :maxlength="venueAddressLimit" class="field" placeholder="For example, Silk Street, London" autocomplete="street-address"><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ venueAddress.length }}/{{ venueAddressLimit }}</span></label>
            <label class="text-sm font-semibold">UK postcode<input v-model="venuePostcode" type="text" :maxlength="venuePostcodeLimit" class="field uppercase" placeholder="EC2Y 8DS" autocomplete="postal-code" @blur="normalizeProposalPostcode"><span v-if="venuePostcode && !isUkPostcode(venuePostcode)" class="mt-1 block text-xs font-normal text-[#8F1839]">Enter a valid UK postcode.</span></label>
          </div>
          <label class="mt-4 block text-sm font-semibold">Exact meeting point <span class="font-normal text-[#6E4D58]">(optional)</span><textarea v-model="venueDetails" :maxlength="venueDetailsLimit" rows="3" class="field resize-none" placeholder="For example, beside the box office at the Silk Street entrance"></textarea><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ venueDetails.length }}/{{ venueDetailsLimit }}</span></label>
          <label class="mt-4 flex items-start gap-3 rounded-lg bg-[#F3E8DA] p-4 text-sm font-semibold"><input v-model="publicVenueConfirmed" type="checkbox" class="mt-1 size-4 accent-[#B4234A]"><span>I confirm this is a public meeting place, not a private home address.</span></label>
          <p class="mt-4 flex gap-2 text-xs leading-5 text-[#6E4D58]"><ShieldCheck class="mt-0.5 size-3.5 shrink-0" />Do not include a flat number, private home, phone number or personal contact details. Parks, stations and markets are fine when the postcode and meeting point are clear.</p>
        </section>

        <template v-if="canEditProposal">
        <section class="rounded-lg bg-[#EAF2DE] p-5 sm:p-6">
          <div class="flex flex-wrap items-center justify-between gap-2"><div><p class="text-xs font-extrabold uppercase tracking-widest text-[#6E4D58]">Proposal preview</p><h2 class="mt-1 text-xl font-semibold">{{ isNewProposal ? 'Your new proposal' : 'Your proposed date' }}</h2></div><span v-if="proposalStatus === 'draft'" class="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#8F1839]">Private draft</span></div>
          <p class="mt-2 text-xs text-[#4D2F39]">This is how the key details will appear to {{ personName }}.</p>
          <dl class="mt-4 grid gap-3 text-sm">
            <div><dt class="text-[#6E4D58]">Idea</dt><dd class="font-semibold">{{ activity || 'Choose an idea' }}</dd></div>
            <div v-if="inviteMessage"><dt class="text-[#6E4D58]">Invite note</dt><dd class="whitespace-pre-wrap font-semibold">{{ inviteMessage }}</dd></div>
            <div><dt class="text-[#6E4D58]">Time</dt><dd class="font-semibold">{{ selectedTimes.map(timeLabel).join(' · ') || 'Choose a time' }}</dd></div>
            <div><dt class="text-[#6E4D58]">Venue</dt><dd class="font-semibold">{{ venue || 'Choose a venue' }}</dd><dd v-if="venueAddress" class="mt-1">{{ venueAddress }}</dd><dd v-if="venuePostcode" class="font-semibold">{{ normalizeUkPostcode(venuePostcode) }}</dd><dd v-if="venueDetails" class="mt-2 whitespace-pre-wrap text-[#4D2F39]"><span class="font-semibold">Meet:</span> {{ venueDetails }}</dd><a v-if="venueAddress && isUkPostcode(venuePostcode)" :href="mapSearchUrl(venue, venueAddress, venuePostcode)" target="_blank" rel="noopener noreferrer" class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#8F1839] hover:underline"><ExternalLink class="size-3.5" />Check map location</a></div>
          </dl>
          <p v-if="proposalStatus === 'draft'" class="mt-4 text-xs leading-5 text-[#4D2F39]">{{ personName }} cannot see this proposal until you confirm and send it.</p>
          <div class="mt-5 flex flex-col gap-2 sm:flex-row">
            <button v-if="proposalStatus !== 'accepted' && !reproposing" type="button" class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#8F1839] disabled:opacity-40 sm:w-auto" :disabled="!activity || selectedTimes.length !== 1 || !proposalLocationComplete || sending || (canRespond && !reproposing)" @click="saveProposalDraft">{{ sending ? 'Saving…' : proposalId ? 'Save as draft' : 'Save draft' }}</button>
            <button type="button" class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto" :disabled="!activity || selectedTimes.length !== 1 || !proposalLocationComplete || sending || (canRespond && !reproposing)" @click="confirmAndSend"><Check class="size-4" />{{ sending ? 'Sending…' : isNewProposal ? `Send new proposal to ${personName}` : proposalStatus === 'accepted' ? 'Send date changes' : `Confirm and send to ${personName}` }}</button>
            <button v-if="reproposing" type="button" class="px-4 py-3 text-sm font-semibold text-[#8F1839]" :disabled="sending" @click="cancelReproposal">Cancel</button>
          </div>
          <p v-if="proposalStatus === 'accepted'" class="mt-3 text-xs text-[#4D2F39]">Changing confirmed details will ask {{ personName }} to approve the updated plan.</p>
          <p v-else-if="proposalStatus === 'pending' && !reproposing" class="mt-3 text-xs text-[#4D2F39]">This proposal has been sent. Saving edits will return it to a private draft until you confirm and send again.</p>
          <p v-if="sendError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ sendError }}</p>
        </section>

        </template>
      </div>
      </template>
    </section>
    <div v-if="showCancelConfirmation && currentConfirmed" class="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1520]/55 p-5" role="presentation" @click.self="showCancelConfirmation = false">
      <section role="alertdialog" aria-modal="true" aria-labelledby="cancel-date-title" class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 id="cancel-date-title" class="text-2xl font-semibold">Cancel your date with {{ personName }}?</h2>
        <p class="mt-3 text-sm leading-6 text-[#6E4D58]">The confirmed date will be cancelled and {{ personName }} will be notified immediately. You will remain matched and can make another plan later.</p>
        <p class="mt-3 rounded-lg bg-[#FFF1C7] p-3 text-xs font-semibold text-[#694C00]">This is different from proposing another time. If you still want to meet, choose “Keep date” and use the reschedule option instead.</p>
        <p v-if="sendError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ sendError }}</p>
        <div class="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <button type="button" class="rounded-lg bg-[#B4234A] px-4 py-3 text-sm font-semibold text-white disabled:opacity-40" :disabled="Boolean(planAction)" @click="cancelConfirmedDate">{{ planAction === 'cancel' ? 'Cancelling…' : 'Yes, cancel date' }}</button>
          <button type="button" class="rounded-lg bg-[#F3E8DA] px-4 py-3 text-sm font-semibold text-[#4D2F39]" :disabled="Boolean(planAction)" @click="showCancelConfirmation = false">Keep date</button>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.plan-card { border-radius: .5rem; background: white; padding: 1.25rem; box-shadow: 0 10px 24px rgba(180,35,74,.08); }
.choice { border-radius: .5rem; background: #FBF7F1; padding: .8rem 1rem; text-align: left; font-size: .875rem; font-weight: 600; }
.choice-selected { background: #B4234A; color: white; }
.field { margin-top: .4rem; width: 100%; border-radius: .5rem; border: 1px solid #E8D8C4; background: white; padding: .7rem .85rem; font-size: .875rem; outline: none; }
.field:focus { border-color: #B4234A; box-shadow: 0 0 0 3px rgba(180,35,74,.12); }
@media (min-width: 640px) { .plan-card { padding: 1.5rem; } }
</style>
