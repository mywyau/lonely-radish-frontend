<script setup lang="ts">
import { HeartHandshake, MapPin, UserRound } from '@lucide/vue'
import { trackProductEvent } from '~/utils/productAnalytics'

definePageMeta({ title: 'Received interests · Lonely Radish', middleware: 'logged-in' })
type ReceivedInterest = { id: string; slug: string; name: string; age: number; place: string; createdAt: string; activityTags: string[]; matchStatus: string | null; reconnectRequest: boolean; reconnectNote?: string | null; photoUrl?: string }
type ClosedInterest = { id: string; slug: string; name: string; createdAt: string; resolvedAt: string; resolution: 'expired' | 'withdrawn'; reconnectRequest: boolean; photoUrl?: string }
type UndoableDecline = { person: ReceivedInterest; undoUntil: string; restoring: boolean }
const interests = ref<ReceivedInterest[]>([])
const closedInterests = ref<ClosedInterest[]>([])
const loading = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
const successShowsMatches = ref(false)
const pending = ref<ReceivedInterest | null>(null)
const accepting = ref(false)
const declining = ref<string | null>(null)
const activeMatchCount = ref(0)
const activeMatchLimit = ref(5)
const pendingInterestCount = ref(0)
const interestLimit = ref(5)
const hasMore = ref(false)
const yourMoveMatch = ref<{ id: string; name: string } | null>(null)
const undoableDeclines = ref<UndoableDecline[]>([])
const { adjustMatchCount } = useMeStateV2()
const atMatchLimit = computed(() => activeMatchCount.value >= activeMatchLimit.value)

function closedInterestStatus(interest: ClosedInterest) {
  if (interest.reconnectRequest) {
    return interest.resolution === 'expired'
      ? 'Reconnect request expired'
      : `${interest.name} took back their reconnect request`
  }
  return interest.resolution === 'expired' ? 'Closed after 14 days' : `${interest.name} took this back`
}

async function loadReceivedInterests() {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{ interests: ReceivedInterest[]; closedInterests: ClosedInterest[]; pendingInterestCount: number; interestLimit: number; hasMore: boolean; activeMatchCount: number; activeMatchLimit: number; yourMoveMatch: { id: string; name: string } | null }>('/api/interests/received')
    interests.value = result.interests
    closedInterests.value = result.closedInterests
    pendingInterestCount.value = result.pendingInterestCount
    interestLimit.value = result.interestLimit
    hasMore.value = result.hasMore
    activeMatchCount.value = result.activeMatchCount
    activeMatchLimit.value = result.activeMatchLimit
    yourMoveMatch.value = result.yourMoveMatch
  }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Received interests could not be loaded.' }
  finally { loading.value = false }
}
onMounted(async () => {
  await loadReceivedInterests()
})
async function acceptInterest() {
  if (!pending.value) return
  const reconnecting = pending.value.reconnectRequest
  accepting.value = true; errorMessage.value = ''
  try {
    const result = await $fetch<{ name: string; matchId: string; queued: boolean }>(`/api/interests/${pending.value.id}/accept`, {
      method: 'POST',
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    })
    interests.value = interests.value.filter(item => item.id !== pending.value?.id)
    pendingInterestCount.value = Math.max(0, pendingInterestCount.value - 1)
    hasMore.value = pendingInterestCount.value > interests.value.length
    successMessage.value = result.queued
      ? `You ${reconnecting ? 'reconnected' : 'matched'} with ${result.name}. Planning can begin when you both have space.`
      : `You ${reconnecting ? 'reconnected' : 'matched'} with ${result.name}. Start planning before accepting another interest.`
    successShowsMatches.value = true
    adjustMatchCount(1)
    if (!result.queued) {
      activeMatchCount.value += 1
      yourMoveMatch.value = { id: result.matchId, name: result.name }
    }
    trackProductEvent('Interest Accepted', { queued: result.queued })
    pending.value = null
    await loadReceivedInterests()
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'This match could not be created.' }
  finally { accepting.value = false }
}
async function declineInterest(person: ReceivedInterest) {
  if (declining.value || !window.confirm(`Decide not to match with ${person.name}? You will not be able to return to this interest.`)) return
  declining.value = person.id
  errorMessage.value = ''
  try {
    const result = await $fetch<{ undoUntil: string }>(`/api/interests/${person.id}`, { method: 'DELETE' })
    interests.value = interests.value.filter(item => item.id !== person.id)
    pendingInterestCount.value = Math.max(0, pendingInterestCount.value - 1)
    hasMore.value = pendingInterestCount.value > interests.value.length
    undoableDeclines.value.push({ person, undoUntil: result.undoUntil, restoring: false })
    successMessage.value = `You chose not to match with ${person.name}. That space is now available for someone new.`
    successShowsMatches.value = false
    await loadReceivedInterests()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'This interest could not be removed.'
  } finally { declining.value = null }
}

async function undoDecline(action: UndoableDecline) {
  if (action.restoring) return
  action.restoring = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/interests/${action.person.id}/undo`, { method: 'POST' })
    undoableDeclines.value = undoableDeclines.value.filter(item => item !== action)
    successMessage.value = `${action.person.name} is back in your interests.`
    await loadReceivedInterests()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'This interest could not be restored.'
    if (error?.statusCode === 409 || error?.response?.status === 409 || error?.data?.statusCode === 409) {
      undoableDeclines.value = undoableDeclines.value.filter(item => item !== action)
    } else action.restoring = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8"><section class="mx-auto max-w-3xl">
    <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">People who chose you</p><h1 class="mt-2 text-4xl font-semibold">Who’s interested?</h1><p class="mt-3 max-w-2xl leading-6 text-[#6E4D58]">Take your time. Each person stays here for up to 14 days, unless they take back their interest first.</p>
    <div v-if="pendingInterestCount" class="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E8D8C4] bg-white p-4 text-sm">
      <p><strong>{{ pendingInterestCount }}</strong> {{ pendingInterestCount === 1 ? 'person is' : 'people are' }} waiting for your answer</p>
      <p class="text-xs text-[#6E4D58]">Showing up to {{ interestLimit }} at a time, oldest first.</p>
      <p v-if="hasMore" class="w-full border-t border-[#E8D8C4] pt-3 text-xs leading-5 text-[#6E4D58]">{{ pendingInterestCount - interests.length }} more {{ pendingInterestCount - interests.length === 1 ? 'person is' : 'people are' }} waiting. The next interest appears when you accept or pass on someone.</p>
    </div>
    <p v-if="successMessage" class="mt-5 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#4D2F39]" role="status">{{ successMessage }} <NuxtLink v-if="successShowsMatches" to="/matches" class="text-[#8F1839] underline">View matches</NuxtLink></p>
    <div v-if="undoableDeclines.length" class="mt-4 grid gap-2">
      <UndoActionNotice v-for="action in undoableDeclines" :key="action.person.id" :message="`You chose not to match with ${action.person.name}.`" :expires-at="action.undoUntil" :busy="action.restoring" @undo="undoDecline(action)" />
    </div>
    <p v-if="yourMoveMatch" class="mt-5 rounded-lg bg-[#FFF1C7] p-4 text-sm leading-6 text-[#694C00]" role="status"><strong>Your new connection with {{ yourMoveMatch.name }} needs attention.</strong> Make a plan or close the connection before accepting another interest. You can still view profiles, pass and show interest in other people. <NuxtLink to="/matches" class="font-semibold underline">Go to connection</NuxtLink></p>
    <div v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert"><p>{{ errorMessage }}</p><button v-if="!loading && !interests.length" type="button" class="mt-3 rounded-lg bg-white px-4 py-2" @click="loadReceivedInterests">Try again</button></div>
    <div v-if="loading" class="mt-7 rounded-lg bg-white p-8 text-center text-sm text-[#6E4D58]">Loading received interests…</div>
    <div v-else-if="interests.length" class="mt-7 grid gap-3"><article v-for="person in interests" :key="person.id" class="rounded-lg bg-white p-5 shadow-[0_8px_20px_rgba(180,35,74,.07)]"><div class="flex items-start gap-4"><ProfilePhotoImage v-if="person.photoUrl" :src="person.photoUrl" :alt="`${person.name}'s profile photo`" class="size-16 shrink-0 rounded-full" /><div v-else class="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#FCE3E8] text-xl font-semibold text-[#B4234A]">{{ person.name.charAt(0) }}</div><div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-2"><h2 class="text-xl font-semibold">{{ person.name }}, {{ person.age }}</h2><span v-if="person.reconnectRequest" class="rounded-full bg-[#FFF1C7] px-2.5 py-1 text-xs font-semibold text-[#694C00]">Reconnect request</span></div><p class="mt-1 flex items-center gap-1 text-xs text-[#6E4D58]"><MapPin class="size-3.5" />{{ person.place }}</p><div v-if="person.activityTags.length" class="mt-3 flex flex-wrap gap-1.5"><span v-for="tag in person.activityTags" :key="tag" class="rounded-full bg-[#F3E8DA] px-2.5 py-1 text-xs font-semibold text-[#6E4D58]">{{ tag }}</span></div></div></div><div v-if="person.reconnectRequest" class="mt-4 rounded-lg bg-[#FBF7F1] p-4 text-sm leading-6 text-[#4D2F39]"><p class="font-semibold">{{ person.name }} ended your previous connection and would like to reconnect.</p><blockquote v-if="person.reconnectNote" class="mt-2 border-l-2 border-[#D8C8B6] pl-3 italic">“{{ person.reconnectNote }}”</blockquote></div><div class="mt-5 flex flex-wrap gap-2"><NuxtLink :to="`/profiles/${person.slug}`" class="rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold text-[#8F1839]">View profile</NuxtLink><NuxtLink v-if="person.matchStatus === 'active' || person.matchStatus === 'queued'" to="/matches" class="rounded-lg bg-[#EAF2DE] px-4 py-2.5 text-sm font-semibold text-[#4D2F39]">{{ person.matchStatus === 'queued' ? 'Match waiting' : 'Already matched' }}</NuxtLink><span v-else-if="person.matchStatus" class="rounded-lg bg-[#FCE3E8] px-4 py-2.5 text-sm font-semibold text-[#8F1839]">Connection ended</span><template v-else><button type="button" class="inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" :disabled="Boolean(yourMoveMatch)" :title="yourMoveMatch ? `Take action on your match with ${yourMoveMatch.name} first` : undefined" @click="pending = person"><HeartHandshake class="size-4" />{{ person.reconnectRequest ? 'Accept and reconnect' : 'Accept and match' }}</button><button type="button" class="rounded-lg border border-[#B4234A]/30 px-4 py-2.5 text-sm font-semibold text-[#8F1839] disabled:opacity-50" :disabled="declining === person.id" @click="declineInterest(person)">{{ declining === person.id ? 'Saving…' : person.reconnectRequest ? 'Do not reconnect' : 'Not for me' }}</button></template></div></article></div>
    <div v-else-if="!errorMessage" class="mt-7 rounded-lg bg-white p-8 text-center"><UserRound class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">Nobody here yet</h2><p class="mt-2 text-sm text-[#6E4D58]">When someone shows interest in you, you’ll find them here.</p></div>
    <section v-if="!loading && closedInterests.length" class="mt-10" aria-labelledby="closed-interests-title">
      <h2 id="closed-interests-title" class="text-xl font-semibold">Earlier interest</h2>
      <p class="mt-1 text-sm leading-6 text-[#6E4D58]">These are no longer waiting for an answer, but you can still view the profile or use the safety options.</p>
      <div class="mt-4 grid gap-3">
        <article v-for="interest in closedInterests" :key="interest.id" class="rounded-lg bg-white p-4">
          <div class="flex flex-wrap items-center gap-4">
            <ProfilePhotoImage v-if="interest.photoUrl" :src="interest.photoUrl" :alt="`${interest.name}'s profile photo`" class="size-12 rounded-full" />
            <div v-else class="flex size-12 items-center justify-center rounded-full bg-[#FCE3E8] font-semibold text-[#B4234A]">{{ interest.name.charAt(0) }}</div>
            <div class="min-w-0 flex-1"><h3 class="font-semibold">{{ interest.name }}</h3><p class="mt-1 text-xs text-[#6E4D58]">Sent {{ new Date(interest.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }} · ended {{ new Date(interest.resolvedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p></div>
            <span class="rounded-full bg-[#FCE3E8] px-3 py-2 text-xs font-semibold text-[#8F1839]">{{ closedInterestStatus(interest) }}</span>
          </div>
          <div class="mt-4 border-t border-[#E8D8C4] pt-4">
            <NuxtLink :to="`/profiles/${interest.slug}`" class="text-xs font-semibold text-[#8F1839] hover:underline">View profile</NuxtLink>
            <ProfileSafetyActions :profile-slug="interest.slug" :profile-name="interest.name" :interest-id="interest.id" />
          </div>
        </article>
      </div>
    </section>
  </section>
  <div v-if="pending" class="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1520]/55 p-5" @click.self="pending = null"><section role="alertdialog" aria-modal="true" aria-labelledby="accept-title" class="w-full max-w-md rounded-xl bg-white p-6"><h2 id="accept-title" class="text-2xl font-semibold">{{ pending.reconnectRequest ? `Reconnect with ${pending.name}?` : `Match with ${pending.name}?` }}</h2><p class="mt-3 text-sm leading-6 text-[#6E4D58]">We’ll let you both know. If there’s room in both match lists, you can start making a plan straight away.</p><p v-if="atMatchLimit" class="mt-3 rounded-lg bg-[#FFF1C7] p-3 text-sm font-semibold text-[#694C00]">Your match list is full. This match will wait for you, and you can start planning once there’s room.</p><div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button class="rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold" :disabled="accepting" @click="pending = null">Not now</button><button class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="accepting" @click="acceptInterest">{{ accepting ? (pending.reconnectRequest ? 'Reconnecting…' : 'Matching…') : pending.reconnectRequest ? 'Yes, reconnect' : 'Yes, match with them' }}</button></div></section></div>
  </main>
</template>
