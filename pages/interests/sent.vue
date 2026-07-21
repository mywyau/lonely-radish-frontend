<script setup lang="ts">
import { Check, HeartHandshake, MapPin, Send } from '@lucide/vue'

definePageMeta({ title: 'Sent interests · Lonely Radish', middleware: 'logged-in' })
type SentInterest = { id: string; slug: string; name: string; place?: string; sentOn: string; createdAt: string; matched: boolean; ended: boolean; matchStatus?: string; photoUrl?: string }
const interests = ref<SentInterest[]>([])
const loading = ref(true)
const errorMessage = ref('')
const { todaysInterests, dailyInterestLimit, loadInterest } = useDailyInterest()
onMounted(async () => {
  const dailyRequest = loadInterest()
  try { interests.value = (await $fetch<{ interests: SentInterest[] }>('/api/interests/sent')).interests }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Sent interests could not be loaded.' }
  finally { await dailyRequest; loading.value = false }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Your activity</p>
      <h1 class="mt-2 text-4xl font-semibold">Sent interests</h1>
      <p class="mt-3 max-w-2xl text-[#6E4D58]">A record of the people you chose. Interest remains private unless they choose you too.</p>
      <DailyInterestCounter class="mt-6" :count="todaysInterests.length" :limit="dailyInterestLimit" />
      <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading sent interests…</div>
      <p v-else-if="errorMessage" class="mt-8 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]">{{ errorMessage }}</p>
      <div v-else-if="interests.length" class="mt-8 grid gap-3">
        <article v-for="interest in interests" :key="interest.id" class="flex flex-col gap-4 rounded-lg bg-white p-5 shadow-[0_8px_20px_rgba(180,35,74,.07)] sm:flex-row sm:items-center">
          <img v-if="interest.photoUrl" :src="interest.photoUrl" :alt="`${interest.name}'s profile photo`" class="size-14 rounded-full object-cover">
          <div v-else class="flex size-14 items-center justify-center rounded-full bg-[#FCE3E8] text-lg font-semibold text-[#B4234A]">{{ interest.name.charAt(0) }}</div>
          <div class="min-w-0 flex-1"><h2 class="text-lg font-semibold">{{ interest.name }}</h2><p v-if="interest.place" class="mt-1 flex items-center gap-1 text-xs text-[#6E4D58]"><MapPin class="size-3.5" />{{ interest.place }}</p><p class="mt-1 text-xs text-[#6E4D58]">Sent {{ new Date(interest.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p></div>
          <div class="flex flex-wrap items-center gap-2"><span class="inline-flex items-center gap-1 rounded-full px-3 py-2 text-xs font-semibold" :class="interest.matched ? 'bg-[#EAF2DE] text-[#4D2F39]' : interest.ended ? 'bg-[#FCE3E8] text-[#8F1839]' : 'bg-[#F3E8DA] text-[#6E4D58]' "><Check v-if="interest.matched" class="size-3.5" /><Send v-else class="size-3.5" />{{ interest.matched ? 'You matched' : interest.ended ? 'Match ended' : 'Interest sent' }}</span><NuxtLink :to="interest.matched ? '/matches' : interest.ended ? '/matches/past' : `/profiles/${interest.slug}`" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white">{{ interest.matched ? 'View match' : interest.ended ? 'View past connection' : 'View profile' }}</NuxtLink></div>
        </article>
      </div>
      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center"><HeartHandshake class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">No interests sent yet.</h2><NuxtLink to="/activities" class="mt-5 inline-flex rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white">Discover people by activity</NuxtLink></div>
    </section>
  </main>
</template>
