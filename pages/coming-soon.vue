<script setup lang="ts">
import { CalendarDays, Coffee, HeartHandshake, MapPin, ShieldCheck } from '@lucide/vue'

definePageMeta({
  title: 'Coffee-date preview · Lonely Radish'
})

const matches = [
  {
    name: 'Maya',
    detail: 'Flat white, design books, low-key galleries',
    time: 'Thu 6:30 PM',
    place: 'Shoreditch',
    tone: 'bg-[#F6E1E1]',
  },
  {
    name: 'Theo',
    detail: 'Filter coffee, jazz bars, long walks',
    time: 'Sat 10:00 AM',
    place: 'Brixton',
    tone: 'bg-[#E7F3D5]',
  },
  {
    name: 'Nina',
    detail: 'Iced latte, indie films, quiet corners',
    time: 'Sun 2:00 PM',
    place: 'Hackney',
    tone: 'bg-[#DCECF5]',
  },
]

const flow = [
  'Pick a coffee mood and date window',
  'Browse a small table of compatible people',
  'Choose a public cafe suggestion',
  'Confirm the plan without endless chat',
]
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#211A16] sm:px-8">
    <section class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <div class="space-y-6">
        <p class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-medium shadow-sm">
          <Coffee class="size-4" aria-hidden="true" />
          Mock product screen
        </p>

        <div class="space-y-4">
          <h1 class="max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">
            Browse matches built around an actual coffee date.
          </h1>
          <p class="max-w-xl text-[#6B5C52]">
            This placeholder shows the intended dating flow without requiring auth, real profiles, or backend data.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-lg bg-white p-4 shadow-sm">
            <CalendarDays class="size-5 text-[#B05D45]" aria-hidden="true" />
            <p class="mt-3 text-sm font-semibold">Tonight</p>
            <p class="mt-1 text-sm text-[#6B5C52]">4 people free near you</p>
          </div>
          <div class="rounded-lg bg-white p-4 shadow-sm">
            <ShieldCheck class="size-5 text-[#2F7D63]" aria-hidden="true" />
            <p class="mt-3 text-sm font-semibold">Public first</p>
            <p class="mt-1 text-sm text-[#6B5C52]">Cafe suggestions only</p>
          </div>
        </div>

        <ol class="space-y-3">
          <li v-for="(item, index) in flow" :key="item" class="flex gap-3 text-sm text-[#4D4038]">
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#211A16] text-xs font-semibold text-white">
              {{ index + 1 }}
            </span>
            <span>{{ item }}</span>
          </li>
        </ol>
      </div>

      <div class="grid gap-4">
        <article
          v-for="match in matches"
          :key="match.name"
          class="rounded-lg p-5 shadow-sm"
          :class="match.tone"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex min-w-0 items-center gap-4">
              <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/75 text-lg font-semibold">
                {{ match.name.charAt(0) }}
              </div>
              <div class="min-w-0">
                <h2 class="text-lg font-semibold">{{ match.name }}</h2>
                <p class="mt-1 text-sm text-[#5E5148]">{{ match.detail }}</p>
              </div>
            </div>
            <div class="flex flex-wrap gap-2 text-xs font-medium text-[#4D4038]">
              <span class="inline-flex items-center gap-1 rounded-full bg-white/65 px-3 py-1">
                <CalendarDays class="size-3.5" aria-hidden="true" />
                {{ match.time }}
              </span>
              <span class="inline-flex items-center gap-1 rounded-full bg-white/65 px-3 py-1">
                <MapPin class="size-3.5" aria-hidden="true" />
                {{ match.place }}
              </span>
            </div>
          </div>
        </article>

        <NuxtLink
          to="/account/v2"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#211A16] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3A302A]"
        >
          <HeartHandshake class="size-4" aria-hidden="true" />
          Open mock profile
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
