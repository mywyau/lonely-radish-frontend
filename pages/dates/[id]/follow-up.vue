<script setup lang="ts">
import { CalendarCheck, Check, HeartHandshake, MapPin, ShieldCheck } from '@lucide/vue'

definePageMeta({ title: 'After your date · Lonely Radish', middleware: 'logged-in' })

const route = useRoute()
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const date = ref<any>(null)
const meetAgain = ref<boolean | null>(null)
const message = ref('')
const apologyMessage = ref('')
const reconsidering = ref(false)
const noteLimit = 240
const outcome = ref<any>(null)
const dateOutcome = ref<'happened' | 'cancelled' | 'no_show' | null>(null)
const outcomeNote = ref('')
const outcomeSaving = ref(false)
const outcomeError = ref('')
const reportResponseNote = ref('')
type PendingNoChoice = { message: string; expiresAt: string; timer: ReturnType<typeof setTimeout> }
const pendingNoChoice = ref<PendingNoChoice | null>(null)
const noChoiceUndoWindowMs = 10_000
const isPreview = computed(() => import.meta.dev && route.params.id === 'preview-nina')

function previewDate() {
  return {
    id: 'preview-nina', personName: 'Nina', personSlug: 'nina', activity: 'Gallery walk',
    venue: 'Barbican Centre', dateTime: '2026-07-19T14:00:00.000Z', dateHasPassed: true,
    myChoice: null, myMessage: null, bothResponded: false, mutual: false, closed: false,
    theirChoice: null, theirMessage: null, canReconsider: false,
  }
}

async function load() {
  if (isPreview.value) {
    date.value = previewDate()
    outcome.value = { eligible: true, myOutcome: null, caseAgainstMe: null,
      reliability: { attendedDates: 2, confirmedNoShows: 0, restrictedUntil: null } }
    meetAgain.value = null
    message.value = ''
    loading.value = false
    return
  }
  const [followUp, dateOutcomeResult] = await Promise.all([
    $fetch(`/api/dates/${String(route.params.id)}/follow-up`),
    $fetch(`/api/dates/${String(route.params.id)}/outcome`),
  ])
  date.value = followUp
  outcome.value = dateOutcomeResult
  meetAgain.value = date.value.myChoice
  message.value = date.value.myMessage || ''
  loading.value = false
}
async function submitDateOutcome() {
  if (!dateOutcome.value) return
  outcomeSaving.value = true; outcomeError.value = ''
  try {
    if (isPreview.value) outcome.value = { ...outcome.value, myOutcome: dateOutcome.value, myNote: outcomeNote.value }
    else {
      await $fetch(`/api/dates/${String(route.params.id)}/outcome`, { method: 'POST',
        body: { outcome: dateOutcome.value, note: outcomeNote.value || null } })
      outcome.value = await $fetch(`/api/dates/${String(route.params.id)}/outcome`)
    }
  } catch (error: any) { outcomeError.value = error?.data?.statusMessage || 'Your date check-in could not be saved.' }
  finally { outcomeSaving.value = false }
}
async function respondToNoShowReport(response: 'acknowledge' | 'dispute') {
  outcomeSaving.value = true; outcomeError.value = ''
  try {
    if (isPreview.value) outcome.value.caseAgainstMe.status = response === 'dispute' ? 'disputed' : 'confirmed'
    else {
      await $fetch(`/api/dates/${String(route.params.id)}/outcome-response`, { method: 'POST',
        body: { response, note: reportResponseNote.value || null } })
      outcome.value = await $fetch(`/api/dates/${String(route.params.id)}/outcome`)
    }
  } catch (error: any) { outcomeError.value = error?.data?.statusMessage || 'Your response could not be saved.' }
  finally { outcomeSaving.value = false }
}
async function saveDateChoice(choice: boolean, note: string, reload = true) {
  saving.value = true; errorMessage.value = ''
  try {
    if (isPreview.value) {
      date.value = {
        ...date.value, myChoice: choice, myMessage: note || null,
        bothResponded: true, mutual: choice === true, closed: choice === false,
        theirChoice: true, canReconsider: choice === false,
        theirMessage: 'I had a lovely time too — another gallery trip would be fun.',
      }
      return
    }
    await $fetch(`/api/dates/${String(route.params.id)}/follow-up`, { method: 'POST',
      body: { meetAgain: choice, message: note || null } })
    if (reload) await load()
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your response could not be saved.' }
  finally { saving.value = false }
}
async function submit() {
  if (meetAgain.value === null || pendingNoChoice.value) return
  if (meetAgain.value) {
    await saveDateChoice(true, message.value)
    return
  }
  const note = message.value
  const expiresAt = new Date(Date.now() + noChoiceUndoWindowMs).toISOString()
  pendingNoChoice.value = {
    message: note,
    expiresAt,
    timer: setTimeout(() => { void commitNoChoice() }, noChoiceUndoWindowMs),
  }
}
function undoNoChoice() {
  if (!pendingNoChoice.value || saving.value) return
  clearTimeout(pendingNoChoice.value.timer)
  pendingNoChoice.value = null
}
async function commitNoChoice(reload = true) {
  const pending = pendingNoChoice.value
  if (!pending || saving.value) return
  clearTimeout(pending.timer)
  pendingNoChoice.value = null
  await saveDateChoice(false, pending.message, reload)
}
async function reconsider() {
  if (!apologyMessage.value.trim()) return
  reconsidering.value = true; errorMessage.value = ''
  try {
    if (isPreview.value) {
      date.value = { ...date.value, myChoice: true, myMessage: apologyMessage.value, mutual: true, closed: false, canReconsider: false, myReconsideredAt: new Date().toISOString() }
    } else {
      await $fetch(`/api/dates/${String(route.params.id)}/follow-up/reconsider`, { method: 'POST', body: { message: apologyMessage.value } })
      await load()
    }
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your updated answer could not be saved.' }
  finally { reconsidering.value = false }
}
onMounted(() => { load().catch((error: any) => { errorMessage.value = error?.data?.statusMessage || 'This date could not be loaded.'; loading.value = false }) })
onBeforeUnmount(() => {
  if (pendingNoChoice.value) void commitNoChoice(false)
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-2xl">
      <div v-if="loading" class="rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading your date follow-up…</div>
      <template v-else-if="date">
        <p v-if="isPreview" class="mb-5 rounded-lg bg-[#FFF1C7] px-4 py-3 text-sm font-semibold text-[#694C00]">Local preview · Your answer is not saved to the database.</p>
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">After your date</p>
        <h1 class="mt-2 text-4xl font-semibold">How did your date with {{ date.personName }} go?</h1>
        <p class="mt-3 leading-7 text-[#6E4D58]">There are two short questions: whether you met, and whether you would like another date. Your second choice stays private until you both answer. The connection stays open only if you both choose another date.</p>

        <section class="mt-7 rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-6">
          <div class="flex items-center gap-2"><CalendarCheck class="size-5 text-[#B4234A]" /><h2 class="text-lg font-semibold">{{ date.activity }}</h2></div>
          <p class="mt-3 flex items-center gap-2 text-sm text-[#6E4D58]"><MapPin class="size-4" />{{ date.venue }}</p>
          <p class="mt-2 text-sm text-[#6E4D58]">{{ new Date(date.dateTime).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) }}</p>
        </section>

        <section v-if="outcome?.eligible" class="mt-5 rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-6">
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Private attendance check</p>
          <template v-if="outcome.caseAgainstMe?.status === 'pending'">
            <h2 class="mt-2 text-xl font-semibold">Your date reported that you did not attend.</h2>
            <p class="mt-2 text-sm leading-6 text-[#6E4D58]">You have until {{ new Date(outcome.caseAgainstMe.responseDeadline).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) }} to respond. Disputed reports are held for review and do not automatically affect discovery.</p>
            <textarea v-model="reportResponseNote" :maxlength="noteLimit" rows="3" class="mt-4 w-full resize-none rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] p-3 text-sm" placeholder="Optional context for your response"></textarea>
            <p class="mt-1 text-right text-xs text-[#6E4D58]">{{ reportResponseNote.length }}/{{ noteLimit }}</p>
            <div class="mt-3 flex flex-col gap-2 sm:flex-row"><button type="button" class="rounded-lg bg-[#4D2F39] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="outcomeSaving" @click="respondToNoShowReport('acknowledge')">Acknowledge no-show</button><button type="button" class="rounded-lg border border-[#B4234A]/40 px-4 py-2.5 text-sm font-semibold text-[#8F1839] disabled:opacity-50" :disabled="outcomeSaving" @click="respondToNoShowReport('dispute')">Dispute report</button></div>
          </template>
          <template v-else-if="outcome.myOutcome">
            <h2 class="mt-2 text-xl font-semibold">Attendance check-in saved.</h2>
            <p class="mt-2 text-sm text-[#6E4D58]">{{ outcome.myOutcome === 'happened' ? 'You confirmed the date happened.' : outcome.myOutcome === 'cancelled' ? 'You told us the date was cancelled.' : 'Your no-show report is pending for 48 hours.' }}</p>
          </template>
          <form v-else @submit.prevent="submitDateOutcome">
            <h2 class="mt-2 text-xl font-semibold">Did this date happen?</h2>
            <p class="mt-2 text-sm leading-6 text-[#6E4D58]">This helps us encourage reliable planning. Reports are private and never appear as public profile labels.</p>
            <div class="mt-4 grid gap-2 sm:grid-cols-3"><button type="button" class="choice" :class="dateOutcome === 'happened' && 'choice-selected'" @click="dateOutcome = 'happened'">Yes, it happened</button><button type="button" class="choice" :class="dateOutcome === 'cancelled' && 'choice-selected'" @click="dateOutcome = 'cancelled'">It was cancelled</button><button type="button" class="choice" :class="dateOutcome === 'no_show' && 'choice-selected'" @click="dateOutcome = 'no_show'">They did not attend</button></div>
            <label v-if="dateOutcome === 'no_show'" class="mt-4 block text-sm font-semibold">Optional context<textarea v-model="outcomeNote" :maxlength="noteLimit" rows="3" class="mt-2 w-full resize-none rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] p-3 font-normal" placeholder="Keep this factual and brief."></textarea><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ outcomeNote.length }}/{{ noteLimit }}</span></label>
            <button type="submit" class="mt-4 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" :disabled="!dateOutcome || outcomeSaving">{{ outcomeSaving ? 'Saving…' : 'Save attendance check-in' }}</button>
          </form>
          <p v-if="outcome?.reliability?.attendedDates > 0" class="mt-4 border-t border-[#E8D8C4] pt-4 text-xs text-[#52713A]">Your private history includes {{ outcome.reliability.attendedDates }} {{ outcome.reliability.attendedDates === 1 ? 'date' : 'dates' }} confirmed as having happened.</p>
          <p v-if="outcomeError" class="mt-3 text-sm font-semibold text-[#8F1839]" role="alert">{{ outcomeError }}</p>
        </section>

        <section v-if="date.bothResponded" class="mt-5 grid gap-3 rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:grid-cols-2">
          <div class="rounded-lg bg-[#FBF7F1] p-4"><p class="text-xs font-bold uppercase tracking-wide text-[#6E4D58]">Your choice</p><p class="mt-2 font-semibold">{{ date.myChoice ? 'I’d like another date' : 'I’d like to leave it here' }}</p><p v-if="date.myMessage" class="mt-3 text-sm italic text-[#4D2F39]">“{{ date.myMessage }}”</p></div>
          <div class="rounded-lg bg-[#FBF7F1] p-4"><p class="text-xs font-bold uppercase tracking-wide text-[#6E4D58]">{{ date.personName }}’s choice</p><p class="mt-2 font-semibold">{{ date.theirChoice ? 'They’d like another date' : 'They’d like to leave it here' }}</p><p v-if="date.theirMessage" class="mt-3 text-sm italic text-[#4D2F39]">“{{ date.theirMessage }}”</p></div>
        </section>

        <section v-if="date.mutual" class="mt-5 rounded-lg bg-[#EAF2DE] p-6"><HeartHandshake class="size-7 text-[#6E8B52]" /><h2 class="mt-3 text-2xl font-semibold">You both chose another date.</h2><p class="mt-2 text-sm leading-6 text-[#4D2F39]">Lovely. You can make another plan together.</p><blockquote v-if="date.theirMessage" class="mt-4 rounded-lg bg-white/75 p-4 text-sm italic text-[#4D2F39]">“{{ date.theirMessage }}”</blockquote><NuxtLink :to="`/plans/${date.personSlug}`" class="mt-5 inline-flex rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Plan another date</NuxtLink></section>

        <section v-else-if="date.closed" class="mt-5 rounded-lg bg-[#F3E8DA] p-6">
          <h2 class="text-2xl font-semibold">You didn’t both choose another date.</h2>
          <p class="mt-2 text-sm leading-6 text-[#4D2F39]">The connection is now closed. You can still revisit {{ date.personName }}’s profile.</p>
          <NuxtLink :to="`/profiles/${date.personSlug}`" class="mt-5 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#8F1839]">View {{ date.personName }}’s profile</NuxtLink>
          <form v-if="date.canReconsider" class="mt-5 border-t border-[#D8C8B6] pt-5" @submit.prevent="reconsider">
            <h3 class="text-lg font-semibold">Want to change your answer?</h3>
            <p class="mt-2 text-sm leading-6 text-[#4D2F39]">{{ date.personName }} chose another date. You can change your answer to yes once; doing so reopens the connection and sends them your note.</p>
            <label class="mt-4 block text-sm font-semibold">Note to {{ date.personName }}<textarea v-model="apologyMessage" :maxlength="noteLimit" required rows="4" class="mt-2 w-full resize-none rounded-lg border border-[#D8C8B6] bg-white p-3" placeholder="I answered too quickly. I’d like another date if you’re still open to it…" /><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ apologyMessage.length }}/{{ noteLimit }}</span></label>
            <button type="submit" :disabled="!apologyMessage.trim() || reconsidering" class="mt-4 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{{ reconsidering ? 'Saving…' : 'Change my answer to yes' }}</button>
          </form>
        </section>

        <section v-else-if="date.myChoice !== null" class="mt-5 rounded-lg bg-[#FCE3E8] p-6"><Check class="size-6 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">Your choice is saved.</h2><p class="mt-2 text-sm leading-6 text-[#4D2F39]">We’re waiting for {{ date.personName }}. When they answer, you’ll both see the choices and any notes.</p></section>

        <UndoActionNotice v-if="pendingNoChoice" class="mt-5" :message="`You chose to leave the connection with ${date.personName} here.`" :expires-at="pendingNoChoice.expiresAt" :busy="saving" @undo="undoNoChoice" />

        <form v-else-if="date.dateHasPassed" class="mt-5 rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]" @submit.prevent="submit">
          <fieldset><legend class="text-lg font-semibold">Would you like another date?</legend><div class="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" class="choice" :class="meetAgain === true && 'choice-selected'" @click="meetAgain = true">Yes, I’d like another date</button><button type="button" class="choice" :class="meetAgain === false && 'choice-selected'" @click="meetAgain = false">No, I’d like to leave it here</button></div></fieldset>
          <p v-if="meetAgain === true" class="mt-4 rounded-lg bg-[#EAF2DE] p-3 text-sm leading-6 text-[#4D2F39]">If {{ date.personName }} also chooses yes, your connection stays open and you can plan another date. If they choose no, it closes.</p>
          <p v-else-if="meetAgain === false" class="mt-4 rounded-lg bg-[#F3E8DA] p-3 text-sm leading-6 text-[#4D2F39]">After you save, you’ll have 10 seconds to undo. Once {{ date.personName }} answers, the connection will close and you’ll both see the choices and any notes.</p>
          <label v-if="meetAgain !== null" class="mt-5 block text-sm font-semibold">Optional note<textarea v-model="message" :maxlength="noteLimit" rows="4" class="mt-2 w-full resize-none rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] p-3" :placeholder="meetAgain ? 'I had a lovely time and would enjoy doing this again…' : 'Thank you for meeting me. I wish you all the best…'" /><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ message.length }}/{{ noteLimit }}</span></label>
          <p class="mt-5 flex items-start gap-2 text-xs leading-5 text-[#6E4D58]"><ShieldCheck class="mt-0.5 size-4 shrink-0" />Your note can accompany either choice. It is shown only after both people answer, so neither choice influences the other.</p>
          <button type="submit" :disabled="meetAgain === null || saving" class="mt-5 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Save my choice' }}</button>
        </form>
        <section v-else class="mt-5 rounded-lg bg-[#F3E8DA] p-6"><h2 class="text-xl font-semibold">Check back after your date.</h2><p class="mt-2 text-sm text-[#6E4D58]">This private check-in opens once the confirmed date time has passed.</p></section>
      </template>
      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<style scoped>
.choice { border-radius: .5rem; background: #FBF7F1; padding: 1rem; text-align: left; font-size: .875rem; font-weight: 650; }
.choice-selected { background: #B4234A; color: white; }
</style>
