<script setup lang="ts">
import { CalendarDays, Check, MapPin, MessageCircle, Plus, ShieldCheck, Sparkles, X } from '@lucide/vue'

definePageMeta({ middleware: 'logged-in' })

const route = useRoute()
const databasePerson = ref<{ name: string } | null>(null)
const databaseActivities = ref<string[]>([])
const matchAvailability = ref<Array<{ label: string }>>([])
const proposalId = ref<string | null>(null)
const proposalStatus = ref<string | null>(null)
const canRespond = ref(false)
const names: Record<string, string> = { maya: 'Maya', nina: 'Nina', alex: 'Alex' }
const activityLabels: Record<string, string> = { 'gallery-wander': 'Gallery wander', 'indie-film': 'Indie film', 'climbing-taster': 'Climbing taster' }
const interestsByPerson: Record<string, string[]> = {
  maya: ['Gallery walks', 'Sunday markets', 'Live music', 'Bookshops', 'Riverside walks'],
  nina: ['Indie films', 'City walks', 'Casual food spots', 'Comedy nights', 'Markets'],
  alex: ['Climbing', 'Book markets', 'Riverside walks', 'Board games', 'Cooking classes'],
}
const personName = computed(() => databasePerson.value?.name || names[String(route.params.slug)] || 'Your match')
const activities = computed(() => databaseActivities.value.length ? databaseActivities.value : (interestsByPerson[String(route.params.slug)] || ['Gallery walks', 'Markets', 'Riverside walks']))
const initialActivity = computed(() => activityLabels[String(route.query.activity)] || activities.value[0] || '')
const activity = ref(initialActivity.value)
const inviteMessage = ref('')
const inviteMessageLimit = 240
const selectedTimes = ref<string[]>([])
const venue = ref('')
const suggestedVenue = ref('')
const suggestedTime = ref('')
const suggestingChanges = ref(false)
const confirmed = ref(false)
const sending = ref(false)
const sendError = ref('')
const logistics = ref<string[]>([])
const defaultQuickMessages = ['That works for me', 'Could we meet earlier?', 'I’d prefer somewhere busier', 'I need to reschedule']
const quickMessages = ref([...defaultQuickMessages])
const newQuickMessage = ref('')
const quickMessageError = ref('')
const quickMessageLimit = 80
const quickMessageStorageKey = 'lonely-radish-planning-quick-messages'
function futureTime(days: number, hour: number, minute = 0) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return { label: date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }), value: date.toISOString() }
}
const times = ref<Array<{ label: string; value: string; id?: string }>>([futureTime(2, 18, 30), futureTime(4, 14), futureTime(5, 15, 30)])
function toggleTime(time: string) { const index = selectedTimes.value.indexOf(time); index >= 0 ? selectedTimes.value.splice(index, 1) : selectedTimes.value.length < 3 && selectedTimes.value.push(time) }
function sendQuickMessage(message: string) { if (!logistics.value.includes(message)) logistics.value.push(message) }
function saveQuickMessages() { localStorage.setItem(quickMessageStorageKey, JSON.stringify(quickMessages.value)) }
function addQuickMessage() {
  const message = newQuickMessage.value.trim().replace(/\s+/g, ' ')
  quickMessageError.value = ''
  if (!message) return
  if (message.length > quickMessageLimit) { quickMessageError.value = `Keep presets to ${quickMessageLimit} characters or less.`; return }
  if (quickMessages.value.some(item => item.toLowerCase() === message.toLowerCase())) { quickMessageError.value = 'That preset already exists.'; return }
  if (quickMessages.value.length >= 8) { quickMessageError.value = 'You can keep up to 8 presets.'; return }
  quickMessages.value.push(message)
  newQuickMessage.value = ''
  saveQuickMessages()
}
function removeQuickMessage(message: string) {
  quickMessages.value = quickMessages.value.filter(item => item !== message)
  saveQuickMessages()
}
function removeLogisticsMessage(message: string) { logistics.value = logistics.value.filter(item => item !== message) }
function timeLabel(value: string) { return times.value.find(time => time.value === value)?.label || value }
async function sendProposal() {
  sending.value = true
  sendError.value = ''
  try {
    const endpoint = proposalId.value ? `/api/proposals/${proposalId.value}` : '/api/proposals'
    const body = { profileSlug: String(route.params.slug), activity: activity.value,
      inviteNote: inviteMessage.value, venue: venue.value, times: selectedTimes.value }
    const response = await $fetch<{ id: string }>(endpoint, { method: proposalId.value ? 'PUT' : 'POST', body })
    proposalId.value = response.id
    proposalStatus.value = 'pending'
    canRespond.value = false
    confirmed.value = true
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status
    if (status === 404 && ['maya', 'nina', 'alex'].includes(String(route.params.slug))) confirmed.value = true
    else sendError.value = 'We could not send this proposal. Please review the details and try again.'
  } finally { sending.value = false }
}
async function respond(status: 'accepted' | 'declined', timeId?: string) {
  if (!proposalId.value) return
  sending.value = true; sendError.value = ''
  try {
    await $fetch(`/api/proposals/${proposalId.value}/respond`, { method: 'POST', body: { status, timeId } })
    proposalStatus.value = status
    canRespond.value = false
    if (status === 'accepted') confirmed.value = true
    else await navigateTo('/matches')
  } catch (error: any) { sendError.value = error?.data?.statusMessage || 'We could not save your response.' }
  finally { sending.value = false }
}
async function suggestChanges() {
  if (!proposalId.value || !suggestedVenue.value.trim() || !suggestedTime.value) return
  suggestingChanges.value = true; sendError.value = ''
  try {
    const proposedTime = new Date(suggestedTime.value)
    if (Number.isNaN(proposedTime.getTime()) || proposedTime <= new Date()) { sendError.value = 'Choose a future date and time.'; return }
    const response = await $fetch<any>(`/api/proposals/${proposalId.value}`, { method: 'PUT', body: {
      activity: activity.value, inviteNote: inviteMessage.value, venue: suggestedVenue.value.trim(), times: [proposedTime.toISOString()],
    } })
    venue.value = response.venue
    times.value = response.times.map((value: string) => ({ value, label: new Date(value).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) }))
    selectedTimes.value = response.times
    proposalStatus.value = 'pending'; canRespond.value = false; confirmed.value = true
  } catch (error: any) { sendError.value = error?.data?.statusMessage || 'Your suggested changes could not be sent.' }
  finally { suggestingChanges.value = false }
}
onMounted(async () => {
  try {
    const savedMessages = JSON.parse(localStorage.getItem(quickMessageStorageKey) || 'null')
    if (Array.isArray(savedMessages) && savedMessages.every(message => typeof message === 'string')) quickMessages.value = savedMessages.slice(0, 8)
  } catch { /* Keep the default presets if stored preferences are invalid. */ }
  try {
    const response = await $fetch<any>(`/api/planning/${String(route.params.slug)}`)
    databasePerson.value = response.person
    databaseActivities.value = response.activities
    matchAvailability.value = response.availability || []
    if (response.proposal) {
      proposalId.value = response.proposal.id
      proposalStatus.value = response.proposal.status
      canRespond.value = response.proposal.status === 'pending' && response.proposal.inviteeId === response.viewerId
      activity.value = response.proposal.activity
      inviteMessage.value = response.proposal.inviteNote || ''
      venue.value = response.proposal.venue
      suggestedVenue.value = response.proposal.venue
      times.value = response.proposal.times.map((time: any) => ({ value: new Date(time.proposedAt).toISOString(), id: time.id,
        label: new Date(time.proposedAt).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) }))
      selectedTimes.value = times.value.map(time => time.value)
    } else if (!databaseActivities.value.includes(activity.value)) activity.value = databaseActivities.value[0] || ''
  } catch { /* Keep fictional prototype matches available. */ }
})
useHead(() => ({ title: `Plan a Date with ${personName.value} · Lonely Radish` }))
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-8 text-[#2A1520] sm:px-8 sm:py-10">
    <section class="mx-auto max-w-4xl">
      <div class="rounded-lg bg-[#2A1520] p-6 text-white sm:p-8"><p class="text-xs font-extrabold uppercase tracking-widest text-[#F7B7C4]">Planning room</p><h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Plan a date with {{ personName }}</h1><p class="mt-3 text-sm leading-6 text-white/75">Agree the essentials here. Save the real conversation for when you meet.</p></div>

      <div class="mt-5 grid gap-5">
        <section v-if="matchAvailability.length" class="rounded-lg bg-[#F3E8DA] p-5 sm:p-6"><div class="flex items-center gap-2"><CalendarDays class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">When {{ personName }} is usually free</h2></div><p class="mt-2 text-sm text-[#6E4D58]">Use their shared schedule as a guide when choosing times.</p><div class="mt-4 flex flex-wrap gap-2"><span v-for="window in matchAvailability" :key="window.label" class="rounded-full bg-white px-3 py-2 text-sm font-semibold text-[#4D2F39]">{{ window.label }}</span></div></section>
        <section v-if="canRespond" class="rounded-lg bg-[#EAF2DE] p-5 sm:p-6"><h2 class="text-xl font-semibold">{{ personName }} suggested this date</h2><p class="mt-2 text-sm text-[#4D2F39]">The activity is already chosen. Accept a proposed time, or send back a simple time or venue change.</p><dl class="mt-5 grid gap-3 rounded-lg bg-white/75 p-4 text-sm"><div><dt class="text-[#6E4D58]">Activity</dt><dd class="font-semibold">{{ activity }}</dd></div><div v-if="inviteMessage"><dt class="text-[#6E4D58]">Their note</dt><dd class="whitespace-pre-wrap">{{ inviteMessage }}</dd></div><div><dt class="text-[#6E4D58]">Venue</dt><dd class="font-semibold">{{ venue }}</dd></div></dl><h3 class="mt-5 font-semibold">Accept one of their times</h3><div class="mt-3 grid gap-2 sm:grid-cols-3"><button v-for="time in times" :key="time.value" type="button" class="choice bg-white" :disabled="sending || suggestingChanges" @click="respond('accepted', time.id)">Confirm {{ time.label }}</button></div><form class="mt-6 border-t border-[#C9D8B5] pt-5" @submit.prevent="suggestChanges"><h3 class="font-semibold">Suggest a small change</h3><div class="mt-3 grid gap-3 sm:grid-cols-2"><label class="text-sm font-semibold">New date and time<input v-model="suggestedTime" type="datetime-local" class="field" required></label><label class="text-sm font-semibold">Public venue<input v-model="suggestedVenue" type="text" maxlength="200" class="field" required placeholder="Venue name and area"></label></div><button type="submit" class="mt-4 rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40" :disabled="!suggestedTime || !suggestedVenue.trim() || suggestingChanges">{{ suggestingChanges ? 'Sending changes…' : 'Send suggested changes' }}</button></form><button type="button" class="mt-5 text-sm font-semibold text-[#8F1839]" :disabled="sending || suggestingChanges" @click="respond('declined')">Decline this proposal</button><p v-if="sendError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ sendError }}</p></section>
        <section v-if="!canRespond" class="plan-card"><div class="flex items-center gap-2"><Sparkles class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">1. Choose from {{ personName }}’s interests</h2></div><p class="mt-2 text-sm text-[#6E4D58]">Pick something they have already said they would enjoy.</p><div class="mt-4 grid gap-2 sm:grid-cols-2"><button v-for="option in activities" :key="option" type="button" class="choice" :class="activity === option && 'choice-selected'" @click="activity = option">{{ option }}</button></div></section>
        <section v-if="!canRespond" class="plan-card"><div class="flex items-center gap-2"><MessageCircle class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">2. Add a short invite note</h2></div><p class="mt-2 text-sm text-[#6E4D58]">A little context is enough — there will be time to talk when you meet.</p><textarea v-model="inviteMessage" :maxlength="inviteMessageLimit" rows="4" class="mt-4 w-full resize-none rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] px-4 py-3 text-sm outline-none transition focus:border-[#B4234A] focus:ring-2 focus:ring-[#F7B7C4]" :placeholder="`For example: I’d love to try this with you — the weekend afternoon could work well for me.`"></textarea><p class="mt-2 text-right text-xs text-[#6E4D58]">{{ inviteMessage.length }}/{{ inviteMessageLimit }}</p></section>
        <section v-if="!canRespond" class="plan-card"><div class="flex items-center gap-2"><CalendarDays class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">3. Suggest up to three times</h2></div><div class="mt-4 grid gap-2 sm:grid-cols-3"><button v-for="time in times" :key="time.value" type="button" class="choice" :class="selectedTimes.includes(time.value) && 'choice-selected'" @click="toggleTime(time.value)">{{ time.label }}</button></div></section>
        <section v-if="!canRespond" class="plan-card"><div class="flex items-center gap-2"><MapPin class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">4. Enter a public venue</h2></div><label class="mt-4 block text-sm font-semibold">Venue name and area<input v-model="venue" type="text" maxlength="200" class="field" placeholder="For example, Barbican Centre, EC2Y" autocomplete="off"></label><p class="mt-4 flex gap-2 text-xs leading-5 text-[#6E4D58]"><ShieldCheck class="mt-0.5 size-3.5 shrink-0" />Choose a recognisable public place. Location services are not used.</p></section>

        <template v-if="!canRespond">
        <section class="plan-card"><div class="flex items-center gap-2"><MessageCircle class="size-5 text-[#B4234A]" /><h2 class="text-xl font-semibold">Keep logistics simple</h2></div><p class="mt-2 text-sm text-[#6E4D58]">Use a quick note only when it helps organise the date. Add or remove presets to make this list yours.</p><div v-if="quickMessages.length" class="mt-4 flex flex-wrap gap-2"><div v-for="message in quickMessages" :key="message" class="inline-flex overflow-hidden rounded-full bg-[#F3E8DA] text-sm font-semibold text-[#4D2F39]"><button type="button" class="px-3 py-2" @click="sendQuickMessage(message)">{{ message }}</button><button type="button" class="border-l border-[#D8C8B6] px-2.5 transition hover:bg-[#FCE3E8]" :aria-label="`Remove preset: ${message}`" @click="removeQuickMessage(message)"><X class="size-3.5" /></button></div></div><p v-else class="mt-4 text-sm text-[#6E4D58]">You have no saved presets yet.</p><form class="mt-4 flex flex-col gap-2 sm:flex-row" @submit.prevent="addQuickMessage"><label class="sr-only" for="new-quick-message">New logistics preset</label><input id="new-quick-message" v-model="newQuickMessage" :maxlength="quickMessageLimit" class="min-w-0 flex-1 rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] px-4 py-2.5 text-sm outline-none focus:border-[#B4234A]" placeholder="Add your own quick message"><button type="submit" class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4D2F39] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40" :disabled="!newQuickMessage.trim() || quickMessages.length >= 8"><Plus class="size-4" />Add preset</button></form><p v-if="quickMessageError" class="mt-2 text-sm font-semibold text-[#8F1839]" role="alert">{{ quickMessageError }}</p><div v-if="logistics.length" class="mt-4 space-y-2"><div v-for="message in logistics" :key="message" class="ml-auto flex max-w-sm items-start gap-2 rounded-lg bg-[#FCE3E8] px-4 py-3 text-sm"><p class="min-w-0 flex-1">{{ message }}</p><button type="button" class="shrink-0 text-[#8F1839]" :aria-label="`Remove note: ${message}`" @click="removeLogisticsMessage(message)"><X class="size-4" /></button></div></div></section>
        <section class="rounded-lg bg-[#EAF2DE] p-5 sm:p-6"><h2 class="text-xl font-semibold">Your proposed date</h2><dl class="mt-4 grid gap-3 text-sm"><div><dt class="text-[#6E4D58]">Idea</dt><dd class="font-semibold">{{ activity || 'Choose an idea' }}</dd></div><div v-if="inviteMessage"><dt class="text-[#6E4D58]">Invite note</dt><dd class="whitespace-pre-wrap font-semibold">{{ inviteMessage }}</dd></div><div><dt class="text-[#6E4D58]">Times</dt><dd class="font-semibold">{{ selectedTimes.map(timeLabel).join(' · ') || 'Choose at least one time' }}</dd></div><div><dt class="text-[#6E4D58]">Venue</dt><dd class="font-semibold">{{ venue || 'Choose a venue' }}</dd></div></dl><button type="button" class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-40 sm:w-auto" :disabled="!activity || !selectedTimes.length || !venue || sending || confirmed || canRespond" @click="sendProposal"><Check class="size-4" />{{ confirmed ? (proposalStatus === 'accepted' ? 'Date confirmed' : 'Proposal sent') : sending ? 'Sending…' : proposalId ? 'Save date changes' : `Send proposal to ${personName}` }}</button><p v-if="proposalStatus === 'accepted'" class="mt-3 text-xs text-[#4D2F39]">Changing confirmed details will ask {{ personName }} to approve the updated plan.</p><p v-if="sendError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ sendError }}</p></section>

        </template>
      </div>
    </section>
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
