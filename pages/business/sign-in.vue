<script setup lang="ts">
import { ArrowRight, Building2, Store } from '@lucide/vue'
import { businessLogin,businessSignup } from '~/composables/useAuth'

definePageMeta({ title:'Business sign in · Lonely Radish',layout:false })
const route = useRoute()
const authError = computed(() => typeof route.query.error === 'string' ? route.query.error : '')
</script>

<template>
  <main class="flex min-h-screen items-center bg-[#2A1520] px-5 py-12 text-[#2A1520]">
    <section class="mx-auto w-full max-w-2xl rounded-xl bg-[#FBF7F1] p-6 shadow-2xl sm:p-9">
      <div class="flex items-start gap-4"><div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#FCE3E8]"><Building2 class="size-6 text-[#B4234A]" /></div><div><p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Lonely Radish for business</p><h1 class="mt-2 text-3xl font-semibold">Manage your venue and offers.</h1><p class="mt-3 leading-6 text-[#6E4D58]">This portal is separate from personal dating profiles, matching and date planning.</p></div></div>
      <p v-if="authError" class="mt-6 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ authError }}</p>
      <div class="mt-8 grid gap-3 sm:grid-cols-2"><button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2A1520] px-5 py-3 text-sm font-semibold text-white" @click="businessLogin">Business login<ArrowRight class="size-4" /></button><button type="button" class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white" @click="businessSignup"><Store class="size-4" />Create business account</button></div>
      <NuxtLink to="/please-sign-in" class="mt-6 inline-flex text-sm font-semibold text-[#6E4D58] hover:text-[#B4234A]">Looking for personal dating login?</NuxtLink>
    </section>
  </main>
</template>
