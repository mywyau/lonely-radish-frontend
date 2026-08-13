<script setup lang="ts">
import { Check, HeartHandshake, MapPin, Send, Undo2 } from '@lucide/vue'

definePageMeta({ title: 'Sent interests · Lonely Radish', middleware: 'logged-in' })
type InterestResolution = 'accepted' | 'passed' | 'expired' | 'withdrawn' | null
type SentInterest = { id: string; slug: string; name: string; place?: string; sentOn: string; createdAt: string; expiresAt: string; resolvedAt?: string | null; resolution: InterestResolution; matched: boolean; queued?: boolean; ended: boolean; matchStatus?: string; photoUrl?: string }
type UndoableWithdrawal = { interest: SentInterest; undoUntil: string; restoring: boolean }
const interests = ref<SentInterest[]>([])
const loading = ref(true)
const errorMessage = ref('')
const withdrawing = ref<string | null>(null)
const undoableWithdrawals = ref<UndoableWithdrawal[]>([])
const { todaysInterests, dailyInterestLimit, loadInterest } = useDailyInterest()
async function loadSentInterests() {
  loading.value = true
  errorMessage.value = ''
  const dailyRequest = loadInterest()
  try { interests.value = (await $fetch<{ interests: SentInterest[] }>('/api/interests/sent')).interests }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Sent interests could not be loaded.' }
  finally { await dailyRequest; loading.value = false }
}
onMounted(async () => {
  await loadSentInterests()
})
function interestStatus(interest: SentInterest) {
  if (interest.matched) return 'You matched'
  if (interest.queued) return 'Waiting for space to open'
  if (interest.ended) return 'Your connection ended'
  if (interest.resolution === 'expired') return 'No response after 14 days'
  if (interest.resolution === 'withdrawn') return 'You took this back'
  if (interest.resolution === 'passed') return 'They didn’t take this further'
  if (interest.resolution === 'accepted') return 'They chose you too'
  return `Waiting for ${interest.name}`
}
function canWithdraw(interest: SentInterest) {
  return !interest.resolution && !interest.matched && !interest.queued && !interest.ended
}
async function withdrawInterest(interest: SentInterest) {
  if (withdrawing.value || !window.confirm(`Take back your interest in ${interest.name}? They will no longer be able to accept it. You’ll have 30 seconds to undo.`)) return
  withdrawing.value = interest.id
  errorMessage.value = ''
  try {
    const result = await $fetch<{ withdrawn: true; resolvedAt: string; undoUntil: string }>(`/api/interests/${interest.id}/withdraw`, { method: 'POST' })
    interest.resolution = 'withdrawn'
    interest.resolvedAt = result.resolvedAt
    undoableWithdrawals.value.push({ interest, undoUntil: result.undoUntil, restoring: false })
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'We could not take back this interest.'
  } finally { withdrawing.value = null }
}

async function undoWithdrawal(action: UndoableWithdrawal) {
  if (action.restoring) return
  action.restoring = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/interests/${action.interest.id}/undo`, { method: 'POST' })
    action.interest.resolution = null
    action.interest.resolvedAt = null
    undoableWithdrawals.value = undoableWithdrawals.value.filter(item => item !== action)
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'This interest could not be restored.'
    if (error?.statusCode === 409 || error?.response?.status === 409 || error?.data?.statusCode === 409) {
      undoableWithdrawals.value = undoableWithdrawals.value.filter(item => item !== action)
    } else action.restoring = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">People you chose</p>
      <h1 class="mt-2 text-4xl font-semibold">Your sent interests</h1>
      <p class="mt-3 max-w-2xl leading-6 text-[#6E4D58]">See who you’re waiting to hear from and what happened to earlier choices. If someone does not respond within 14 days, the interest closes quietly.</p>
      <DailyInterestCounter class="mt-6" :count="todaysInterests.length" :limit="dailyInterestLimit" />
      <div v-if="undoableWithdrawals.length" class="mt-4 grid gap-2">
        <UndoActionNotice v-for="action in undoableWithdrawals" :key="action.interest.id" :message="`You took back your interest in ${action.interest.name}.`" :expires-at="action.undoUntil" :busy="action.restoring" @undo="undoWithdrawal(action)" />
      </div>
      <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading sent interests…</div>
      <div v-else-if="errorMessage" class="mt-8 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert"><p>{{ errorMessage }}</p><button type="button" class="mt-3 rounded-lg bg-white px-4 py-2" @click="loadSentInterests">Try again</button></div>
      <div v-else-if="interests.length" class="mt-8 grid gap-3">
        <article v-for="interest in interests" :key="interest.id" class="flex flex-col gap-4 rounded-lg bg-white p-5 shadow-[0_8px_20px_rgba(180,35,74,.07)] sm:flex-row sm:items-center">
          <img v-if="interest.photoUrl" :src="interest.photoUrl" :alt="`${interest.name}'s profile photo`" class="size-14 rounded-full object-cover">
          <div v-else class="flex size-14 items-center justify-center rounded-full bg-[#FCE3E8] text-lg font-semibold text-[#B4234A]">{{ interest.name.charAt(0) }}</div>
          <div class="min-w-0 flex-1"><h2 class="text-lg font-semibold">{{ interest.name }}</h2><p v-if="interest.place" class="mt-1 flex items-center gap-1 text-xs text-[#6E4D58]"><MapPin class="size-3.5" />{{ interest.place }}</p><p class="mt-1 text-xs text-[#6E4D58]">Sent {{ new Date(interest.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p><p v-if="canWithdraw(interest)" class="mt-1 text-xs text-[#6E4D58]">Closes {{ new Date(interest.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) }}</p></div>
          <div class="flex flex-wrap items-center gap-2"><span class="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold" :class="interest.matched ? 'bg-[#EAF2DE] text-[#4D2F39]' : interest.queued ? 'bg-[#FFF1C7] text-[#694C00]' : interest.resolution === 'expired' || interest.resolution === 'withdrawn' || interest.resolution === 'passed' || interest.ended ? 'bg-[#FCE3E8] text-[#8F1839]' : 'bg-[#F3E8DA] text-[#6E4D58]' "><Check v-if="interest.matched" class="size-3.5" /><Send v-else class="size-3.5" />{{ interestStatus(interest) }}</span><button v-if="canWithdraw(interest)" type="button" class="inline-flex items-center gap-1 rounded-lg border border-[#B4234A]/30 px-4 py-2.5 text-sm font-semibold text-[#8F1839] disabled:opacity-50" :disabled="withdrawing === interest.id" @click="withdrawInterest(interest)"><Undo2 class="size-4" />{{ withdrawing === interest.id ? 'Taking back…' : 'Take back' }}</button><NuxtLink v-if="interest.matched || interest.queued || interest.ended" :to="interest.matched || interest.queued ? '/matches' : '/matches/past'" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white">{{ interest.ended ? 'View past connection' : 'View match' }}</NuxtLink><NuxtLink v-else-if="canWithdraw(interest)" :to="`/profiles/${interest.slug}`" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white">View profile</NuxtLink></div>
        </article>
      </div>
      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center"><HeartHandshake class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">You haven’t chosen anyone yet</h2><NuxtLink to="/activities" class="mt-5 inline-flex rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Find someone by activity</NuxtLink></div>
    </section>
  </main>
</template>
