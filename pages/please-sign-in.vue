<script setup lang="ts">
import { ArrowRight, Sparkles, UserRound } from '@lucide/vue'
import { login, signup } from '@/composables/useAuth'

definePageMeta({
  title: 'Sign in · Lonely Radish',
  layout: false
})
const route = useRoute()
const returnTo = computed(() => typeof route.query.redirect === 'string' ? route.query.redirect : '/')
const authError = computed(() => typeof route.query.error === 'string' ? route.query.error : '')
const cancelled = computed(() => /access denied|cancel|denied|permissions/i.test(authError.value))
</script>

<template>
  <main class="flex min-h-screen items-center bg-[#526B3C] px-5 py-12 text-[#2A1520]">
    <section class="mx-auto w-full max-w-2xl rounded-xl bg-[#FBF7F1] p-6 shadow-2xl sm:p-9">
      <div class="flex items-start gap-4">
        <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#E3EBD9]">
          <UserRound class="size-6 text-[#526B3C]" aria-hidden="true" />
        </div>
        <div>
          <p class="text-xs font-extrabold uppercase tracking-widest text-[#526B3C]">Lonely Radish personal</p>
          <h1 class="mt-2 text-3xl font-semibold">Find your next good date.</h1>
          <p class="mt-3 leading-6 text-[#6E4D58]">
            Choose a Google account or use your email and password.
          </p>
        </div>
      </div>

      <div v-if="authError" class="mt-6 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert"><p>{{ cancelled ? 'Sign-in was cancelled. No account information was shared.' : authError }}</p><p v-if="cancelled" class="mt-2 font-normal text-[#6E4D58]">You can try again or choose a different account.</p></div>
      <div class="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2A1520] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#421F30]"
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
      <div class="mt-6 flex flex-wrap gap-x-5 gap-y-2">
        <NuxtLink to="/" class="inline-flex text-sm font-semibold text-[#526B3C] hover:text-[#2A1520]">Return home</NuxtLink>
        <NuxtLink to="/business/sign-in" class="inline-flex text-sm font-semibold text-[#526B3C] hover:text-[#2A1520]">Looking for business login?</NuxtLink>
      </div>
    </section>
  </main>
</template>
