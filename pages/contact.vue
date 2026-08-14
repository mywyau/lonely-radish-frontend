<script setup lang="ts">
import { Mail } from '@lucide/vue';

definePageMeta({
  title: 'Contact · Lonely Radish'
})
</script>

<template>
  <main class="min-h-[calc(100vh-5rem)] bg-[#FBF7F1] px-5 py-16 text-[#2A1520] sm:px-8 sm:py-24">
    <section class="mx-auto max-w-xl">
      <p class="text-xs font-extrabold uppercase tracking-[0.1em] text-[#B4234A]">Contact us</p>
      <h1 class="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">How can we help?</h1>
      <p class="mt-4 max-w-lg leading-7 text-[#6E4D58]">
        Have a question, found an issue or want to share feedback? Send us an email and we’ll get back to you.
      </p>

      <div class="mt-8 rounded-xl border border-[#B4234A]/15 bg-white p-5 shadow-[0_12px_30px_rgba(42,21,32,0.06)] sm:p-6">
        <div class="flex items-center gap-4">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#FCE3E8] text-[#B4234A]">
            <Mail class="size-5" aria-hidden="true" />
          </span>
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-[0.08em] text-[#8F6A76]">Email</p>
            <a href="mailto:contact@lonelyradish.app" class="mt-1 block break-all text-base font-semibold text-[#8F1839] hover:underline sm:text-lg">
              contact@lonelyradish.app
            </a>
          </div>
        </div>
        <p class="mt-5 border-t border-[#2A1520]/10 pt-4 text-sm text-[#6E4D58]">
          We usually reply within a few days.
        </p>
      </div>
    </section>
  </main>
</template>
