<script setup lang="ts">
import { LockKeyhole, ShieldCheck, Sparkles } from '@lucide/vue'

definePageMeta({
  title: 'Feature preview · Lonely Radish'
})
</script>

<template>
  <main class="min-h-[70vh] bg-[#FBF7F1] px-5 py-16 text-[#211A16]">
    <section class="mx-auto max-w-3xl rounded-lg bg-white p-6 shadow-sm sm:p-8">
      <div class="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div class="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#E7F3D5]">
          <LockKeyhole class="size-7" aria-hidden="true" />
        </div>

        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-[#2F7D63]">Prototype preview</p>
          <h1 class="mt-2 text-3xl font-semibold">Premium dating tools are mocked for now.</h1>
          <p class="mt-3 text-[#6B5C52]">
            Auth and subscription checks are disabled while the product shape is being explored. This screen reserves space for future gated tools.
          </p>

          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="rounded-lg bg-[#FBF7F1] p-4">
              <Sparkles class="size-5 text-[#B05D45]" aria-hidden="true" />
              <p class="mt-3 text-sm font-semibold">Profile polish</p>
              <p class="mt-1 text-sm text-[#6B5C52]">Prompts and coffee-date intent hints.</p>
            </div>
            <div class="rounded-lg bg-[#FBF7F1] p-4">
              <ShieldCheck class="size-5 text-[#2F7D63]" aria-hidden="true" />
              <p class="mt-3 text-sm font-semibold">Safety controls</p>
              <p class="mt-1 text-sm text-[#6B5C52]">Public-place defaults and reporting tools.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
