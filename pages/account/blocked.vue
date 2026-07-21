<script setup lang="ts">
import { ShieldCheck, UserRound } from '@lucide/vue'

definePageMeta({ title: 'Blocked users · Lonely Radish', middleware: 'logged-in' })

type BlockedUser = { slug: string; name: string; blockedAt: string; photoUrl?: string }
const blockedUsers = ref<BlockedUser[]>([])
const loading = ref(true)
const errorMessage = ref('')
const pendingUnblock = ref<BlockedUser | null>(null)
const unblocking = ref(false)

async function loadBlockedUsers() {
  loading.value = true; errorMessage.value = ''
  try { blockedUsers.value = (await $fetch<{ blockedUsers: BlockedUser[] }>('/api/blocks')).blockedUsers }
  catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'Blocked users could not be loaded.' }
  finally { loading.value = false }
}
async function unblock() {
  if (!pendingUnblock.value) return
  unblocking.value = true; errorMessage.value = ''
  try {
    await $fetch(`/api/blocks/${pendingUnblock.value.slug}`, { method: 'DELETE' })
    blockedUsers.value = blockedUsers.value.filter(person => person.slug !== pendingUnblock.value?.slug)
    pendingUnblock.value = null
  } catch (error: any) { errorMessage.value = error?.data?.statusMessage || 'This person could not be unblocked.' }
  finally { unblocking.value = false }
}
onMounted(loadBlockedUsers)
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-3xl">
      <NuxtLink to="/account/v2" class="text-sm font-semibold text-[#8F1839] hover:underline">← Back to account</NuxtLink>
      <div class="mt-6 rounded-lg bg-[#2A1520] p-6 text-white sm:p-8">
        <ShieldCheck class="size-6 text-[#F7B7C4]" />
        <p class="mt-5 text-xs font-extrabold uppercase tracking-widest text-[#F7B7C4]">Privacy and safety</p>
        <h1 class="mt-2 text-3xl font-semibold sm:text-4xl">Blocked users</h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-white/75">People you block cannot discover your profile, send interest, appear in your matches, or continue shared plans.</p>
      </div>

      <div v-if="loading" class="mt-6 rounded-lg bg-white p-8 text-center text-sm text-[#6E4D58]" aria-live="polite">Loading blocked users…</div>
      <p v-else-if="errorMessage" class="mt-6 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      <div v-else-if="blockedUsers.length" class="mt-6 grid gap-3">
        <article v-for="person in blockedUsers" :key="person.slug" class="flex items-center gap-4 rounded-lg bg-white p-5 shadow-[0_8px_20px_rgba(180,35,74,.07)]">
          <img v-if="person.photoUrl" :src="person.photoUrl" alt="" class="size-14 shrink-0 rounded-full object-cover">
          <div v-else class="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#F3E8DA] text-lg font-semibold text-[#B4234A]">{{ person.name.charAt(0) }}</div>
          <div class="min-w-0 flex-1"><h2 class="truncate text-lg font-semibold">{{ person.name }}</h2><p class="mt-1 text-xs text-[#6E4D58]">Blocked {{ new Date(person.blockedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p></div>
          <button type="button" class="rounded-lg border border-[#B4234A]/30 px-4 py-2.5 text-sm font-semibold text-[#8F1839] hover:bg-[#FCE3E8]" @click="pendingUnblock = person">Unblock</button>
        </article>
      </div>
      <div v-else class="mt-6 rounded-lg bg-white p-8 text-center"><UserRound class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">You haven’t blocked anyone.</h2><p class="mt-2 text-sm text-[#6E4D58]">Anyone you block in future will appear here.</p></div>
    </section>

    <div v-if="pendingUnblock" class="fixed inset-0 z-50 flex items-center justify-center bg-[#2A1520]/55 p-5" @click.self="pendingUnblock = null">
      <section role="alertdialog" aria-modal="true" aria-labelledby="unblock-title" class="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <h2 id="unblock-title" class="text-2xl font-semibold">Unblock {{ pendingUnblock.name }}?</h2>
        <p class="mt-3 text-sm leading-6 text-[#6E4D58]">You may become visible to each other again. Previous interests, matches, and plans will not be restored.</p>
        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button class="rounded-lg bg-[#F3E8DA] px-4 py-2.5 text-sm font-semibold" :disabled="unblocking" @click="pendingUnblock = null">Keep blocked</button><button class="rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="unblocking" @click="unblock">{{ unblocking ? 'Unblocking…' : 'Yes, unblock' }}</button></div>
      </section>
    </div>
  </main>
</template>
