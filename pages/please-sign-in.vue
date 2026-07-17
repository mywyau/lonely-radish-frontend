<script setup lang="ts">
import { ArrowRight, Coffee, UserRound } from '@lucide/vue'

definePageMeta({
  title: 'Mock onboarding · Lonely Radish'
})
</script>

<template>
  <main class="min-h-[70vh] bg-[#FBF7F1] px-5 py-16 text-[#211A16]">
    <section class="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-sm sm:p-8">
      <div class="flex items-start gap-4">
        <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#F6E1E1]">
          <UserRound class="size-6" aria-hidden="true" />
        </div>
        <div>
          <p class="text-sm font-semibold text-[#B05D45]">Auth disabled for prototype</p>
          <h1 class="mt-2 text-3xl font-semibold">Mock profile setup</h1>
          <p class="mt-3 text-[#6B5C52]">
            This page used to block signed-out users. For now, every flow is open and backed by local mock data.
          </p>
        </div>
      </div>

      <div class="mt-8 grid gap-3 sm:grid-cols-2">
        <NuxtLink
          to="/account/v2"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#211A16] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3A302A]"
        >
          Open mock account
          <ArrowRight class="size-4" aria-hidden="true" />
        </NuxtLink>
        <NuxtLink
          to="/coming-soon"
          class="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D8C8B6] bg-[#FBF7F1] px-5 py-3 text-sm font-semibold transition hover:bg-[#F3E8DA]"
        >
          <Coffee class="size-4" aria-hidden="true" />
          Browse mock matches
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
