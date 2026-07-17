<script setup lang="ts">
import { CalendarDays, HeartHandshake, MapPin, ShieldCheck, Sparkles } from '@lucide/vue'

definePageMeta({
  title: 'Browse Matches · Lonely Radish',
})

const matches = [
  {
    name: 'Maya',
    activity: 'Gallery wander',
    detail: 'Design books, low-key exhibitions, Sunday markets',
    time: 'Thu evening',
    place: 'Shoreditch',
    score: 'Strong activity overlap',
    tone: 'bg-[#FCE3E8]',
  },
  {
    name: 'Theo',
    activity: 'Live music set',
    detail: 'Jazz bars, bookshops, long walks',
    time: 'Sat morning',
    place: 'Brixton',
    score: 'Similar pace',
    tone: 'bg-[#EAF2DE]',
  },
  {
    name: 'Nina',
    activity: 'Indie film',
    detail: 'Small cinemas, city walks, casual food spots',
    time: 'Sun afternoon',
    place: 'Hackney',
    score: 'Close nearby',
    tone: 'bg-[#F3E8DA]',
  },
]

const maxActiveMatches = 5
const activeMatchCount = matches.length
const remainingMatchSlots = maxActiveMatches - activeMatchCount

const summary = [
  { label: 'Active matches', value: `${activeMatchCount}/${maxActiveMatches}` },
  { label: 'Nearby today', value: '4' },
  { label: 'Public-first', value: '100%' },
]
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
      <div class="space-y-6">
        <div>
          <p class="section-kicker">Matches</p>
          <h1 class="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
            People matched around shared plans.
          </h1>
          <p class="mt-4 max-w-xl text-[#6E4D58]">
            This mock view shows matches grouped by activity intent, timing, and public-place preferences. You can hold up to five active matches at a time.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <article v-for="item in summary" :key="item.label" class="rounded-lg bg-white p-4 shadow-[0_10px_24px_rgba(180,35,74,0.08)]">
            <p class="text-3xl font-semibold">
              {{ item.value }}
            </p>
            <p class="mt-1 text-sm text-[#6E4D58]">
              {{ item.label }}
            </p>
          </article>
        </div>

        <div class="rounded-lg bg-[#2A1520] p-5 text-white shadow-[0_14px_32px_rgba(42,21,32,0.16)]">
          <ShieldCheck class="size-6 text-[#F7B7C4]" aria-hidden="true" />
          <h2 class="mt-4 text-lg font-semibold">
            Five active matches max
          </h2>
          <p class="mt-2 text-sm leading-6 text-white/72">
            Keep the match list focused. You have {{ remainingMatchSlots }} open slots before you need to plan, pass, or close an existing match.
          </p>
        </div>
      </div>

      <div class="grid gap-4">
        <article
          v-for="match in matches"
          :key="match.name"
          class="rounded-lg p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]"
          :class="match.tone"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div class="flex min-w-0 gap-4">
              <div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/75 text-lg font-semibold text-[#B4234A]">
                {{ match.name.charAt(0) }}
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 class="text-lg font-semibold">
                    {{ match.name }}
                  </h2>
                  <span class="inline-flex items-center gap-1 text-xs font-semibold text-[#6E4D58]">
                    <MapPin class="size-3.5" aria-hidden="true" />
                    {{ match.place }}
                  </span>
                </div>
                <p class="mt-1 text-sm font-semibold text-[#8F1839]">
                  {{ match.activity }}
                </p>
                <p class="mt-2 text-sm leading-6 text-[#4D2F39]">
                  {{ match.detail }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2 text-xs font-semibold text-[#4D2F39] sm:justify-end">
              <span class="inline-flex items-center gap-1 rounded-full bg-white/65 px-3 py-1">
                <CalendarDays class="size-3.5" aria-hidden="true" />
                {{ match.time }}
              </span>
              <span class="inline-flex items-center gap-1 rounded-full bg-white/65 px-3 py-1">
                <Sparkles class="size-3.5" aria-hidden="true" />
                {{ match.score }}
              </span>
            </div>
          </div>
        </article>

        <NuxtLink
          to="/activities"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#8F1839]"
        >
          <HeartHandshake class="size-4" aria-hidden="true" />
          Browse activity ideas
        </NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.section-kicker {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #b4234a;
}
</style>
