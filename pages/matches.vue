<script setup lang="ts">
import { CalendarCheck, CalendarDays, ChevronRight, Clock3, HeartHandshake, MapPin, Sparkles } from '@lucide/vue'

definePageMeta({ title: 'Matches & Plans · Lonely Radish', middleware: 'logged-in' })

const sections = [
  { title: 'New matches', description: 'You both want to meet. Choose a date idea and start making a plan.', items: [
    { name: 'Maya', slug: 'maya', activity: 'Gallery wander', place: 'Shoreditch', status: 'Choose a time', icon: HeartHandshake, tone: 'bg-[#FCE3E8]' },
  ] },
  { title: 'Planning', description: 'A date idea is chosen and needs one or two more details.', items: [
    { name: 'Nina', slug: 'nina', activity: 'Indie film', place: 'Hackney', status: 'Venue needed', icon: Clock3, tone: 'bg-[#F3E8DA]' },
  ] },
  { title: 'Confirmed dates', description: 'Everything is agreed. Keep communication focused on practical details.', items: [
    { name: 'Alex', slug: 'alex', activity: 'Climbing taster', place: 'Bethnal Green', status: 'Friday · 7:00pm', icon: CalendarCheck, tone: 'bg-[#EAF2DE]' },
  ] },
]
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-5xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Matches & plans</p>
      <h1 class="mt-2 text-4xl font-semibold sm:text-5xl">Turn mutual interest into a real date.</h1>
      <p class="mt-4 max-w-2xl leading-7 text-[#6E4D58]">Every match has a clear next step: choose what to do, agree a time and public venue, then meet.</p>

      <div class="mt-9 grid gap-8">
        <section v-for="section in sections" :key="section.title">
          <h2 class="text-2xl font-semibold">{{ section.title }}</h2>
          <p class="mt-1 text-sm leading-6 text-[#6E4D58]">{{ section.description }}</p>
          <div class="mt-4 grid gap-3">
            <article v-for="match in section.items" :key="match.name" class="rounded-lg p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)]" :class="match.tone">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="flex min-w-0 gap-4"><div class="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/75 text-lg font-semibold text-[#B4234A]">{{ match.name.charAt(0) }}</div><div><h3 class="text-lg font-semibold">{{ match.name }}</h3><p class="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-[#8F1839]"><Sparkles class="size-3.5" />{{ match.activity }}</p><p class="mt-1 inline-flex items-center gap-1 text-xs text-[#6E4D58]"><MapPin class="size-3.5" />{{ match.place }}</p></div></div>
                <span class="inline-flex w-fit items-center gap-1 rounded-full bg-white/70 px-3 py-2 text-xs font-semibold"><component :is="match.icon" class="size-3.5" />{{ match.status }}</span>
              </div>
              <div class="mt-5 flex flex-col gap-2 min-[380px]:flex-row">
                <NuxtLink :to="`/plans/${match.slug}`" class="group inline-flex items-center justify-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#8F1839]">Continue planning<ChevronRight class="size-4 transition group-hover:translate-x-1" /></NuxtLink>
                <NuxtLink :to="`/profiles/${match.slug}`" class="inline-flex items-center justify-center rounded-lg bg-white/75 px-4 py-2.5 text-sm font-semibold text-[#8F1839] transition hover:bg-white">View {{ match.name }}’s profile</NuxtLink>
              </div>
            </article>
          </div>
        </section>
      </div>

      <NuxtLink to="/activities" class="mt-9 inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-5 py-3 text-sm font-semibold text-white"><CalendarDays class="size-4" />Discover another date idea</NuxtLink>
    </section>
  </main>
</template>
