<script setup lang="ts">
import { CalendarClock, History, XCircle } from '@lucide/vue'

definePageMeta({ title: 'Past connections · Lonely Radish', middleware: 'logged-in' })
type ReconnectResolution = 'accepted' | 'passed' | 'expired' | 'withdrawn' | 'blocked' | null
type Connection = { id: string; name: string; slug: string; photoUrl?: string; endedReason?: 'removed' | 'post_date'; endedAt?: string; endedByMe?: boolean; wasUnmatched?: boolean; activity?: string; proposalId?: string; canReconsider?: boolean; canViewProfile?: boolean; apologySent?: boolean; apologyReceived?: boolean; apologyReceivedMessage?: string | null; apologyReceivedAt?: string | null; reconnectInterestId?: string | null; reconnectInterestResolution?: ReconnectResolution; incomingReconnectInterestId?: string | null; incomingReconnectInterestResolution?: ReconnectResolution }
const connections = ref<Connection[]>([])
const loading = ref(true)
const errorMessage = ref('')
const apologyFor = ref<string | null>(null)
const apologyMessage = ref('')
const apologySending = ref(false)
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const loadingMore = ref(false)
function outcome(connection: Connection) {
  if (connection.endedReason === 'post_date') return 'Closed after your post-date check-in'
  return connection.endedByMe ? 'You ended this connection' : 'The other person ended this connection'
}
function reconnectStatus(connection: Connection) {
  if (!connection.reconnectInterestResolution) return 'Reconnect request pending'
  if (connection.reconnectInterestResolution === 'passed') return 'They chose not to reconnect'
  if (connection.reconnectInterestResolution === 'expired') return 'Reconnect request expired'
  if (connection.reconnectInterestResolution === 'withdrawn') return 'You took back the reconnect request'
  if (connection.reconnectInterestResolution === 'blocked') return 'Reconnect request closed'
  return 'Reconnect request accepted'
}
function incomingReconnectStatus(connection: Connection) {
  if (!connection.incomingReconnectInterestResolution) return 'Reconnect request pending'
  if (connection.incomingReconnectInterestResolution === 'passed') return 'You chose not to reconnect'
  if (connection.incomingReconnectInterestResolution === 'expired') return 'Their reconnect request expired'
  if (connection.incomingReconnectInterestResolution === 'withdrawn') return 'They took back their reconnect request'
  if (connection.incomingReconnectInterestResolution === 'blocked') return 'Reconnect request closed'
  return 'You reconnected'
}
async function sendApology(connection: Connection) {
  if (!apologyMessage.value.trim()) return
  apologySending.value = true; errorMessage.value = ''
  try {
    await $fetch(`/api/matches/${connection.id}/apology`, { method: 'POST', body: { message: apologyMessage.value } })
    connection.apologySent = true; apologyFor.value = null; apologyMessage.value = ''
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Your note could not be sent.' }
  finally { apologySending.value = false }
}
async function loadConnections(loadMore = false) {
  if (loadMore) loadingMore.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{ connections: Connection[]; nextCursor: string | null; hasMore: boolean }>('/api/matches/past', {
      query: loadMore && nextCursor.value ? { cursor: nextCursor.value } : undefined,
    })
    connections.value = loadMore ? [...connections.value, ...result.connections] : result.connections
    nextCursor.value = result.nextCursor; hasMore.value = result.hasMore
    if (!loadMore && import.meta.dev) {
      const preview = window.localStorage.getItem('lonely-radish-preview-rejected-match')
      if (preview) {
        const saved = JSON.parse(preview) as { endedAt?: string }
        connections.value.unshift({ id: 'preview-past-nina', name: 'Nina', slug: 'nina',
          photoUrl: '/images/nina-profile-triptych.png', endedReason: 'removed', endedByMe: true,
          endedAt: saved.endedAt || new Date().toISOString(), activity: 'Gallery walk', canViewProfile: true })
      }
    }
  }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Past connections could not be loaded.' }
  finally { loading.value = false; loadingMore.value = false }
}
onMounted(() => loadConnections())
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">History</p>
      <h1 class="mt-2 text-4xl font-semibold">Past connections</h1>
      <p class="mt-3 max-w-2xl leading-7 text-[#6E4D58]">You can find ended connections here. They don’t take up room in your active connection list.</p>
      <div v-if="loading" class="mt-8 rounded-lg bg-white p-8 text-center text-[#6E4D58]">Loading past connections…</div>
      <p v-else-if="errorMessage && !connections.length" class="mt-8 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]">{{ errorMessage }}</p>
      <div v-else-if="connections.length" class="mt-8 grid gap-3">
        <article v-for="connection in connections" :key="connection.id" class="rounded-lg bg-white p-5 shadow-[0_8px_20px_rgba(180,35,74,.07)]">
          <div class="flex items-start gap-4">
            <ProfilePhotoImage v-if="connection.photoUrl" :src="connection.photoUrl" :alt="`${connection.name}'s profile photo`" class="size-14 rounded-full" />
            <div v-else class="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#F3E8DA] text-lg font-semibold text-[#B4234A]">{{ connection.name.charAt(0) }}</div>
            <div class="min-w-0 flex-1"><h2 class="text-lg font-semibold">{{ connection.name }}</h2><p class="mt-1 flex items-center gap-1.5 text-sm text-[#6E4D58]"><XCircle class="size-4" />{{ outcome(connection) }}</p><p v-if="connection.activity" class="mt-1 text-xs text-[#6E4D58]">Last agreed plan: {{ connection.activity }}</p><p v-if="connection.endedAt" class="mt-1 text-xs text-[#6E4D58]">{{ new Date(connection.endedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) }}</p></div>
          </div>
          <div class="mt-4 flex flex-wrap gap-2">
            <NuxtLink v-if="connection.canViewProfile" :to="{ path: `/profiles/${connection.slug}`, query: { connection: 'past' } }" class="rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold text-[#8F1839]">View their profile</NuxtLink>
            <NuxtLink v-if="connection.canReconsider && connection.proposalId" :to="`/dates/${connection.proposalId}/follow-up`" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white">Review your answer</NuxtLink>
            <button v-if="connection.endedByMe && !connection.apologySent" type="button" class="rounded-lg bg-[#FCE3E8] px-4 py-2.5 text-sm font-semibold text-[#8F1839]" @click="apologyFor = connection.id; apologyMessage = ''">Send a note</button>
            <span v-else-if="connection.apologySent && !connection.reconnectInterestId" class="rounded-lg bg-[#EAF2DE] px-4 py-2.5 text-sm font-semibold text-[#4D2F39]">Note sent</span>
            <span v-if="connection.reconnectInterestId" class="rounded-lg px-4 py-2.5 text-sm font-semibold" :class="connection.reconnectInterestResolution ? 'bg-[#F3E8DA] text-[#6E4D58]' : 'bg-[#FFF1C7] text-[#694C00]'">{{ reconnectStatus(connection) }}</span>
            <NuxtLink v-if="connection.apologySent && !connection.reconnectInterestId" :to="{ path: `/profiles/${connection.slug}`, query: { connection: 'past' } }" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white">Ask to reconnect</NuxtLink>
            <NuxtLink v-else-if="connection.reconnectInterestId" to="/interests/sent" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white">View sent request</NuxtLink>
            <span v-if="connection.incomingReconnectInterestId" class="rounded-lg px-4 py-2.5 text-sm font-semibold" :class="connection.incomingReconnectInterestResolution ? 'bg-[#F3E8DA] text-[#6E4D58]' : 'bg-[#FFF1C7] text-[#694C00]'">{{ incomingReconnectStatus(connection) }}</span>
            <NuxtLink v-if="connection.incomingReconnectInterestId && !connection.incomingReconnectInterestResolution" to="/interests/received" class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white">Review reconnect request</NuxtLink>
            <p v-if="connection.wasUnmatched && !connection.canViewProfile" class="text-xs leading-5 text-[#6E4D58]">They ended this connection, so it remains closed unless they choose to ask for another chance.</p>
            <p v-else-if="!connection.canViewProfile" class="text-xs leading-5 text-[#6E4D58]">Their profile is no longer available from this connection.</p>
          </div>
          <div v-if="connection.apologyReceivedMessage" class="mt-4 rounded-lg bg-[#FBF7F1] p-4 text-sm leading-6 text-[#4D2F39]"><p class="font-semibold">Note received from {{ connection.name }}</p><blockquote class="mt-2 border-l-2 border-[#D8C8B6] pl-3 italic">“{{ connection.apologyReceivedMessage }}”</blockquote><p v-if="connection.apologyReceivedAt" class="mt-2 text-xs text-[#6E4D58]">Received {{ new Date(connection.apologyReceivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p></div>
          <form v-if="apologyFor === connection.id" class="mt-4 rounded-lg bg-[#FBF7F1] p-4" @submit.prevent="sendApology(connection)"><label class="text-sm font-semibold">Note to {{ connection.name }}<textarea v-model="apologyMessage" maxlength="500" rows="3" class="mt-2 w-full rounded-lg border border-[#D8C8B6] bg-white p-3 font-normal" placeholder="Keep it brief, respectful, and without pressure." /></label><p class="mt-2 text-xs leading-5 text-[#6E4D58]">They will receive this note. Afterward, you may ask to reconnect once; they can ignore or decline that request.</p><div class="mt-3 flex gap-2"><button type="submit" :disabled="apologySending || !apologyMessage.trim()" class="rounded-lg bg-[#8F1839] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{{ apologySending ? 'Sending…' : 'Send note' }}</button><button type="button" class="px-3 py-2 text-sm font-semibold text-[#6E4D58]" @click="apologyFor = null">Cancel</button></div></form>
        </article>
        <button v-if="hasMore" type="button" :disabled="loadingMore" class="mx-auto mt-3 rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="loadConnections(true)">{{ loadingMore ? 'Loading…' : 'Load more past connections' }}</button>
        <p v-if="errorMessage" class="text-center text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      </div>
      <div v-else class="mt-8 rounded-lg bg-white p-8 text-center"><History class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">Nothing here yet</h2><p class="mt-2 text-sm text-[#6E4D58]">If a connection ends, you’ll be able to find it here.</p></div>
      <NuxtLink to="/matches" class="mt-8 inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white"><CalendarClock class="size-4" />Return to active connections</NuxtLink>
    </section>
  </main>
</template>
