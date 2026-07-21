<script setup lang="ts">
import { HeartHandshake, MapPin, UserRound } from '@lucide/vue'

definePageMeta({ title: 'Received interests · Lonely Radish', middleware: 'logged-in' })
type ReceivedInterest = { id: string; slug: string; name: string; age: number; place: string; createdAt: string; activityTags: string[]; matchStatus: string | null; photoUrl?: string }
const interests = ref<ReceivedInterest[]>([])
const loading = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
const pending = ref<ReceivedInterest | null>(null)
const accepting = ref(false)

onMounted(async () => {
  try { interests.value = (await $fetch<{ interests: ReceivedInterest[] }>('/api/interests/received')).interests }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Received interests could not be loaded.' }
  finally { loading.value = false }
})
async function acceptInterest() {
  if (!pending.value) return
  accepting.value = true; errorMessage.value = ''
  try {
    const result = await $fetch<{ name: string }>(`/api/interests/${pending.value.id}/accept`, { method: 'POST' })
    interests.value = interests.value.map(item => item.id === pending.value?.id ? { ...item, matchStatus: 'active' } : item)
    successMessage.value = `You matched with ${result.name}. You can start planning when you’re ready.`
    pending.value = null
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'This match could not be created.' }
  finally { accepting.value = false }
}
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8"><section class="mx-auto max-w-3xl">
    <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Your activity</p><h1 class="mt-2 text-4xl font-semibold">People interested in you</h1><p class="mt-3 max-w-2xl leading-6 text-[#6E4D58]">Review who chose you. You decide whether to create a match and begin planning.</p>
    <p v-if="successMessage" class="mt-5 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#4D2F39]" role="status">{{ successMessage }} <NuxtLink to="/matches" class="text-[#8F1839] underline">View matches</NuxtLink></p>
    <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
    <div v-if="loading" class="mt-7 rounded-lg bg-white p-8 text-center text-sm text-[#6E4D58]">Loading received interests…</div>
    <div v-else-if="interests.length" class="mt-7 grid gap-3"><article v-for="person in interests" :key="person.id" class="rounded-lg bg-white p-5 shadow-[0_8px_20px_rgba(180,35,74,.07)]"><div class="flex items-start gap-4"><img v-if="person.photoUrl" :src="person.photoUrl" :alt="`${person.name}'s profile photo`" class="size-16 shrink-0 rounded-full object-cover"><div v-else class="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#FCE3E8] text-xl font-semibold text-[#B4234A]">{{ person.name.charAt(0) }}</div><div class="min-w-0 flex-1"><h2 class="text-xl font-semibold">{{ person.name }}, {{ person.age }}</h2><p class="mt-1 flex items-center gap-1 text-xs text-[#6E4D58]"><MapPin class="size-3.5" />{{ person.place }}</p><div v-if="person.activityTags.length" class="mt-3 flex flex-wrap gap-1.5"><span v-for="tag in person.activityTags" :key="tag" class="rounded-full bg-[#F3E8DA] px-2.5 py-1 text-xs font-semibold text-[#6E4D58]">{{ tag }}</span></div></div></div><div class="mt-5 flex flex-wrap gap-2"><NuxtLink :to="`/profiles/${person.slug}`" class="rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold text-[#8F1839]">View profile</NuxtLink><NuxtLink v-if="person.matchStatus === 'active'" to="/matches" class="rounded-lg bg-[#EAF2DE] px-4 py-2.5 text-sm font-semibold text-[#4D2F39]">Already matched</NuxtLink><span v-else-if="person.matchStatus" class="rounded-lg bg-[#FCE3E8] px-4 py-2.5 text-sm font-semibold text-[#8F1839]">Connection ended</span><button v-else type="button" class="inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white" @click="pending = person"><HeartHandshake class="size-4" />Accept and match</button></div></article></div>
    <div v-else class="mt-7 rounded-lg bg-white p-8 text-center"><UserRound class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">No interests received yet.</h2><p class="mt-2 text-sm text-[#6E4D58]">When someone chooses you, they will appear here.</p></div>
  </section>
  <div v-if="pending" class="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1520]/55 p-5" @click.self="pending = null"><section role="alertdialog" aria-modal="true" aria-labelledby="accept-title" class="w-full max-w-md rounded-xl bg-white p-6"><h2 id="accept-title" class="text-2xl font-semibold">Match with {{ pending.name }}?</h2><p class="mt-3 text-sm leading-6 text-[#6E4D58]">You will both be notified and can start planning a date. This will use one of your five active match spaces.</p><div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button class="rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold" :disabled="accepting" @click="pending = null">Not now</button><button class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="accepting" @click="acceptInterest">{{ accepting ? 'Matching…' : 'Yes, create match' }}</button></div></section></div>
  </main>
</template>
