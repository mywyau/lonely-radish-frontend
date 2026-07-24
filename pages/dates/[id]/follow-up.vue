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
    meetAgain.value = null
    message.value = ''
    loading.value = false
    return
  }
  date.value = await $fetch(`/api/dates/${String(route.params.id)}/follow-up`)
  meetAgain.value = date.value.myChoice
  message.value = date.value.myMessage || ''
  loading.value = false
}
async function submit() {
  if (meetAgain.value === null) return
  saving.value = true; errorMessage.value = ''
  try {
    if (isPreview.value) {
      date.value = {
        ...date.value, myChoice: meetAgain.value, myMessage: message.value || null,
        bothResponded: true, mutual: meetAgain.value === true, closed: meetAgain.value === false,
        theirChoice: true, canReconsider: meetAgain.value === false,
        theirMessage: 'I had a lovely time too — another gallery trip would be fun.',
      }
      return
    }
    await $fetch(`/api/dates/${String(route.params.id)}/follow-up`, { method: 'POST',
      body: { meetAgain: meetAgain.value, message: message.value || null } })
    await load()
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your response could not be saved.' }
  finally { saving.value = false }
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
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-2xl">
      <div v-if="loading" class="rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading your date follow-up…</div>
      <template v-else-if="date">
        <p v-if="isPreview" class="mb-5 rounded-lg bg-[#FFF1C7] px-4 py-3 text-sm font-semibold text-[#694C00]">Local preview · Your answer is not saved to the database.</p>
        <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Private check-in</p>
        <h1 class="mt-2 text-4xl font-semibold">Would you meet {{ date.personName }} again?</h1>
        <p class="mt-3 leading-7 text-[#6E4D58]">Answer independently. Once you have both responded, you’ll see each other’s answer.</p>

        <section class="mt-7 rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:p-6">
          <div class="flex items-center gap-2"><CalendarCheck class="size-5 text-[#B4234A]" /><h2 class="text-lg font-semibold">{{ date.activity }}</h2></div>
          <p class="mt-3 flex items-center gap-2 text-sm text-[#6E4D58]"><MapPin class="size-4" />{{ date.venue }}</p>
          <p class="mt-2 text-sm text-[#6E4D58]">{{ new Date(date.dateTime).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }) }}</p>
        </section>

        <section v-if="date.bothResponded" class="mt-5 grid gap-3 rounded-lg bg-white p-5 shadow-[0_12px_28px_rgba(180,35,74,0.08)] sm:grid-cols-2">
          <div class="rounded-lg bg-[#FBF7F1] p-4"><p class="text-xs font-bold uppercase tracking-wide text-[#6E4D58]">Your answer</p><p class="mt-2 font-semibold">{{ date.myChoice ? 'Yes, I’d meet again' : 'No, I wish them well' }}</p><p v-if="date.myMessage" class="mt-3 text-sm italic text-[#4D2F39]">“{{ date.myMessage }}”</p></div>
          <div class="rounded-lg bg-[#FBF7F1] p-4"><p class="text-xs font-bold uppercase tracking-wide text-[#6E4D58]">{{ date.personName }}’s answer</p><p class="mt-2 font-semibold">{{ date.theirChoice ? 'Yes, I’d meet again' : 'No, I wish them well' }}</p><p v-if="date.theirMessage" class="mt-3 text-sm italic text-[#4D2F39]">“{{ date.theirMessage }}”</p></div>
        </section>

        <section v-if="date.mutual" class="mt-5 rounded-lg bg-[#EAF2DE] p-6"><HeartHandshake class="size-7 text-[#6E8B52]" /><h2 class="mt-3 text-2xl font-semibold">You both want to meet again.</h2><p class="mt-2 text-sm leading-6 text-[#4D2F39]">Lovely. You can make another plan together.</p><blockquote v-if="date.theirMessage" class="mt-4 rounded-lg bg-white/75 p-4 text-sm italic text-[#4D2F39]">“{{ date.theirMessage }}”</blockquote><NuxtLink :to="`/plans/${date.personSlug}`" class="mt-5 inline-flex rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Plan another date</NuxtLink></section>

        <section v-else-if="date.closed" class="mt-5 rounded-lg bg-[#F3E8DA] p-6">
          <h2 class="text-2xl font-semibold">Your answers were different.</h2>
          <p class="mt-2 text-sm leading-6 text-[#4D2F39]">The connection is closed for now. You can still revisit {{ date.personName }}’s profile.</p>
          <NuxtLink :to="`/profiles/${date.personSlug}`" class="mt-5 inline-flex rounded-lg bg-white px-5 py-3 text-sm font-semibold text-[#8F1839]">View {{ date.personName }}’s profile</NuxtLink>
          <form v-if="date.canReconsider" class="mt-5 border-t border-[#D8C8B6] pt-5" @submit.prevent="reconsider">
            <h3 class="text-lg font-semibold">Changed your mind?</h3>
            <p class="mt-2 text-sm leading-6 text-[#4D2F39]">Because {{ date.personName }} said yes, you can change your answer once. Add a sincere note so they understand why.</p>
            <label class="mt-4 block text-sm font-semibold">Apology note<textarea v-model="apologyMessage" :maxlength="noteLimit" required rows="4" class="mt-2 w-full resize-none rounded-lg border border-[#D8C8B6] bg-white p-3" placeholder="I’m sorry I answered too quickly. I’d like to meet again if you’re still open to it…" /><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ apologyMessage.length }}/{{ noteLimit }}</span></label>
            <button type="submit" :disabled="!apologyMessage.trim() || reconsidering" class="mt-4 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{{ reconsidering ? 'Sending…' : 'Change to yes and send note' }}</button>
          </form>
        </section>

        <section v-else-if="date.myChoice !== null" class="mt-5 rounded-lg bg-[#FCE3E8] p-6"><Check class="size-6 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">Your answer is saved.</h2><p class="mt-2 text-sm leading-6 text-[#4D2F39]">We’re waiting for {{ date.personName }} to complete their private check-in. Their individual choice stays private.</p></section>

        <form v-else-if="date.dateHasPassed" class="mt-5 rounded-lg bg-white p-6 shadow-[0_12px_28px_rgba(180,35,74,0.08)]" @submit.prevent="submit">
          <fieldset><legend class="text-lg font-semibold">How would you like to continue?</legend><div class="mt-4 grid gap-3 sm:grid-cols-2"><button type="button" class="choice" :class="meetAgain === true && 'choice-selected'" @click="meetAgain = true">Yes, I’d meet again</button><button type="button" class="choice" :class="meetAgain === false && 'choice-selected'" @click="meetAgain = false">No, but I wish them well</button></div></fieldset>
          <label v-if="meetAgain !== null" class="mt-5 block text-sm font-semibold">Optional note<textarea v-model="message" :maxlength="noteLimit" rows="4" class="mt-2 w-full resize-none rounded-lg border border-[#E8D8C4] bg-[#FBF7F1] p-3" :placeholder="meetAgain ? 'I had a lovely time and would enjoy doing this again…' : 'Thank you for meeting me. I wish you all the best…'" /><span class="mt-1 block text-right text-xs font-normal text-[#6E4D58]">{{ message.length }}/{{ noteLimit }}</span></label>
          <p class="mt-5 flex items-start gap-2 text-xs leading-5 text-[#6E4D58]"><ShieldCheck class="mt-0.5 size-4 shrink-0" />Your note can accompany either answer. To keep the check-in independent, it is shown after both people respond.</p>
          <button type="submit" :disabled="meetAgain === null || saving" class="mt-5 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{{ saving ? 'Saving…' : 'Submit private answer' }}</button>
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
