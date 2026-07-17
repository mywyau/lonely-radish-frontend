<script setup lang="ts">
import { CalendarDays, CircleCheck, Coffee, HeartHandshake } from '@lucide/vue'

definePageMeta({
  layout: "default",
  title: "Payment successful · Lonely Radish",
})

const route = useRoute()
const plan = computed(() => route.query.plan === "yearly" ? "Yearly" : "Monthly")
</script>

<template>
  <main class="min-h-[70vh] bg-[#FBF7F1] px-5 py-16 text-[#211A16]">
    <section class="mx-auto max-w-2xl rounded-lg bg-white p-6 text-center shadow-sm sm:p-8">
      <div class="mx-auto flex size-16 items-center justify-center rounded-full bg-[#E7F3D5]">
        <CircleCheck class="size-9 text-[#2F7D63]" aria-hidden="true" />
      </div>

      <h1 class="mt-6 text-3xl font-semibold">Payment successful</h1>
      <p class="mt-3 text-[#6B5C52]">
        Mock {{ plan.toLowerCase() }} plan activated for the prototype. No real payment or auth check was performed.
      </p>

      <div class="mt-8 grid gap-3 text-left sm:grid-cols-3">
        <div class="rounded-lg bg-[#FBF7F1] p-4">
          <HeartHandshake class="size-5 text-[#B05D45]" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold">More matches</p>
        </div>
        <div class="rounded-lg bg-[#FBF7F1] p-4">
          <CalendarDays class="size-5 text-[#B05D45]" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold">Date windows</p>
        </div>
        <div class="rounded-lg bg-[#FBF7F1] p-4">
          <Coffee class="size-5 text-[#B05D45]" aria-hidden="true" />
          <p class="mt-3 text-sm font-semibold">Cafe planning</p>
        </div>
      </div>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <NuxtLink to="/coming-soon" class="rounded-lg bg-[#211A16] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3A302A]">
          Continue to matching
        </NuxtLink>
        <NuxtLink to="/account/v2" class="rounded-lg border border-[#D8C8B6] bg-[#FBF7F1] px-5 py-3 text-sm font-semibold transition hover:bg-[#F3E8DA]">
          View mock account
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
