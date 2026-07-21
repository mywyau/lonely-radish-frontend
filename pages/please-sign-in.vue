<script setup lang="ts">
import { ArrowRight, Sparkles, UserRound } from '@lucide/vue'
import { login, loginWithAnotherAccount, signup } from '@/composables/useAuth'

definePageMeta({
  title: 'Sign in · Lonely Radish'
})
const route = useRoute()
const returnTo = computed(() => typeof route.query.redirect === 'string' ? route.query.redirect : '/')
const authError = computed(() => typeof route.query.error === 'string' ? route.query.error : '')
const cancelled = computed(() => /access denied|cancel|denied|permissions/i.test(authError.value))
</script>

<template>
  <main class="min-h-[70vh] bg-[#FBF7F1] px-5 py-16 text-[#211A16]">
    <section class="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm sm:p-8">
      <div class="flex items-start gap-4">
        <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#F6E1E1]">
          <UserRound class="size-6" aria-hidden="true" />
        </div>
        <div>
          <p class="text-sm font-semibold text-[#B05D45]">Welcome back</p>
          <h1 class="mt-2 text-3xl font-semibold">Sign in to Lonely Radish</h1>
          <p class="mt-3 text-[#6B5C52]">
            Sign in or create an account to manage your profile, show interest, and plan dates.
          </p>
        </div>
      </div>

      <div v-if="authError" class="mt-6 rounded-lg bg-[#FCE3E8] p-4 text-sm text-[#8F1839]" role="alert"><p>{{ cancelled ? 'Sign-in was cancelled. No account information was shared.' : authError }}</p><p v-if="cancelled" class="mt-2 text-[#6E4D58]">You can try again or choose a different account.</p></div>
      <div class="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#211A16] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3A302A]"
          @click="login(returnTo)"
        >
          Log in
          <ArrowRight class="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8F1839]"
          @click="signup(returnTo)"
        >
          <Sparkles class="size-4" aria-hidden="true" />
          Create account
        </button>
      </div>
      <button type="button" class="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-[#D8C8B6] bg-white px-5 py-3 text-sm font-semibold text-[#4D2F39] transition hover:bg-[#FBF7F1]" @click="loginWithAnotherAccount(returnTo)">Use another account</button>
      <NuxtLink to="/" class="mt-5 inline-flex text-sm font-semibold text-[#6E4D58] hover:text-[#B4234A]">Return home</NuxtLink>
    </section>
  </main>
</template>
