<script setup lang="ts">
import { Bike, CalendarDays, Gamepad2, MapPin, Music, Palette, Sparkles, Trophy, Utensils, Video, Waves } from '@lucide/vue'

definePageMeta({
  title: 'Date Ideas · Lonely Radish',
})

const activityGroups = [
  {
    title: 'Easy first plans',
    description: 'Low-pressure activities that work well when you are meeting someone new.',
    activities: [
      { name: 'Gallery wander', detail: 'Browse an exhibition, then decide if you want a second stop.', icon: Palette, tone: 'bg-[#FCE3E8]', place: 'Nearby', timing: 'This week' },
      { name: 'Market loop', detail: 'Walk stalls, try something small, keep the plan flexible.', icon: Sparkles, tone: 'bg-[#F3E8DA]', place: 'Nearby', timing: 'This week' },
      { name: 'Riverside walk', detail: 'A public route with space to talk without sitting across a table.', icon: Waves, tone: 'bg-[#EAF2DE]', place: 'Nearby', timing: 'This week' },
    ],
  },
  {
    title: 'When you want more energy',
    description: 'Plans with a bit more pace, useful when messages already feel comfortable.',
    activities: [
      { name: 'Live music set', detail: 'Pick a small venue with an easy exit and a clear start time.', icon: Music, tone: 'bg-[#F7D4DC]', place: 'Nearby', timing: 'Evening' },
      { name: 'Casual food crawl', detail: 'Choose a neighbourhood and try one or two quick spots.', icon: Utensils, tone: 'bg-[#FCE3E8]', place: 'Nearby', timing: 'Weekend' },
      { name: 'Weekend pop-up', detail: 'Meet around an event so there is already something to react to.', icon: CalendarDays, tone: 'bg-[#F3E8DA]', place: 'Nearby', timing: 'Weekend' },
    ],
  },
  {
    title: 'Sports and active plans',
    description: 'Public, movement-friendly ideas for people who prefer doing something side by side.',
    activities: [
      { name: 'Park tennis rally', detail: 'Book a public court, keep it casual, and grab a quick walk after.', icon: Trophy, tone: 'bg-[#EAF2DE]', place: 'Outdoor', timing: 'Daytime' },
      { name: 'Cycle and stop', detail: 'Pick a short route with an easy meeting point and no pressure to race.', icon: Bike, tone: 'bg-[#F3E8DA]', place: 'Outdoor', timing: 'Weekend' },
      { name: 'Climbing taster', detail: 'Meet at a beginner-friendly wall where the activity gives the conversation shape.', icon: Sparkles, tone: 'bg-[#FCE3E8]', place: 'Public venue', timing: 'Evening' },
    ],
  },
  {
    title: 'Gaming and remote meetups',
    description: 'Online-first plans for people who want to check the vibe before meeting in person.',
    activities: [
      { name: 'Co-op game session', detail: 'Pick a relaxed co-op game, use voice chat, and keep the first session short.', icon: Gamepad2, tone: 'bg-[#F7D4DC]', place: 'Online', timing: 'Tonight' },
      { name: 'Puzzle room online', detail: 'Try a shared puzzle or escape room where teamwork makes conversation easier.', icon: Sparkles, tone: 'bg-[#FCE3E8]', place: 'Remote', timing: 'This week' },
      { name: 'Watch-and-play lobby', detail: 'Start with a casual multiplayer lobby or stream-friendly game before planning anything offline.', icon: Video, tone: 'bg-[#EAF2DE]', place: 'Online', timing: 'Flexible' },
    ],
  },
]

function activityPath(name: string) {
  return `/activities/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
}
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-6xl">
      <div class="max-w-3xl">
        <p class="section-kicker">Discover</p>
        <h1 class="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
          Start with a date you would actually enjoy.
        </h1>
        <p class="mt-4 max-w-2xl text-[#6E4D58]">
          Choose a date idea, then meet compatible people nearby who would genuinely enjoy doing it with you.
        </p>
      </div>

      <div class="mt-10 grid gap-8">
        <section v-for="group in activityGroups" :key="group.title" class="space-y-4">
          <div>
            <h2 class="text-2xl font-semibold">
              {{ group.title }}
            </h2>
            <p class="mt-2 max-w-2xl text-sm leading-6 text-[#6E4D58]">
              {{ group.description }}
            </p>
          </div>

          <div class="grid gap-4 md:grid-cols-3">
            <NuxtLink
              v-for="activity in group.activities"
              :key="activity.name"
              :to="activityPath(activity.name)"
              class="group rounded-lg p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(180,35,74,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B4234A]"
              :class="activity.tone"
            >
              <component :is="activity.icon" class="size-6 text-[#B4234A]" aria-hidden="true" />
              <h3 class="mt-4 text-lg font-semibold">
                {{ activity.name }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-[#4D2F39]">
                {{ activity.detail }}
              </p>
              <div class="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[#4D2F39]">
                <span class="inline-flex items-center gap-1 rounded-full bg-white/65 px-3 py-1">
                  <MapPin class="size-3.5" aria-hidden="true" />
                  {{ activity.place }}
                </span>
                <span class="inline-flex items-center gap-1 rounded-full bg-white/65 px-3 py-1">
                  <CalendarDays class="size-3.5" aria-hidden="true" />
                  {{ activity.timing }}
                </span>
              </div>
              <span class="mt-5 inline-flex text-sm font-semibold text-[#8F1839] group-hover:underline">See potential dates →</span>
            </NuxtLink>
          </div>
        </section>
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
