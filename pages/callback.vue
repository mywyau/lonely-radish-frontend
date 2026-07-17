<script setup lang="ts">
import { CircleCheck } from '@lucide/vue'

definePageMeta({
  title: 'Mock callback · Lonely Radish',
  ssr: false,
})
</script>

<template>
  <main class="min-h-[70vh] bg-[#FBF7F1] px-5 py-16 text-[#211A16]">
    <section class="mx-auto max-w-xl rounded-lg bg-white p-6 text-center shadow-sm sm:p-8">
      <div class="mx-auto flex size-14 items-center justify-center rounded-full bg-[#E7F3D5]">
        <CircleCheck class="size-8 text-[#2F7D63]" aria-hidden="true" />
      </div>
      <h1 class="mt-6 text-3xl font-semibold">Mock auth callback</h1>
      <p class="mt-3 text-[#6B5C52]">
        Auth is disabled for now, so this route simply confirms the prototype state.
      </p>
      <NuxtLink to="/account/v2" class="mt-6 inline-flex rounded-lg bg-[#211A16] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3A302A]">
        Open mock account
      </NuxtLink>
    </section>
  </main>
</template>
