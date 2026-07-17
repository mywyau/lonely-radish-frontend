<script setup lang="ts">
import {
  CalendarDays,
  CheckCircle2,
  Coffee,
  HeartHandshake,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from '@lucide/vue'

useSeoMeta({
  title: 'Coffee dates without the endless chat',
  description: 'A casual dating app for matching over low-pressure coffee dates, clear availability, and thoughtful introductions.',
  ogTitle: 'Coffee dates without the endless chat | Lonely Radish',
  ogDescription: 'Meet people who want a real coffee date, not weeks of vague messaging.',
})

const { data: stats } = await useFetch('/api/total-users-stats', {
  server: true,
  lazy: true,
})

const currentUsers = ref<number | null>(null)
const sessionCookie = useCookie<string>('online_session_id', {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

const { isLoggedIn, user, resolve: resolveMeState } = useMeStateV2()
let currentUsersInterval: ReturnType<typeof setInterval> | undefined

const greeting = computed(() => {
  const firstName = user.value?.firstName?.trim()
  return firstName ? `Welcome back, ${firstName}` : 'Welcome back'
})

const featuredMatches = [
  {
    name: 'Maya',
    detail: 'Flat white, art walks, Sunday markets',
    time: 'Free Thu evening',
    tone: 'bg-[#F6E1E1]',
  },
  {
    name: 'Theo',
    detail: 'Filter coffee, bookshops, live jazz',
    time: 'Free Sat morning',
    tone: 'bg-[#E7F3D5]',
  },
  {
    name: 'Nina',
    detail: 'Iced latte, indie films, city walks',
    time: 'Free after work',
    tone: 'bg-[#DCECF5]',
  },
]

const dateFlow = [
  {
    title: 'Pick your coffee mood',
    description: 'Set what you are up for: quick espresso, slow weekend cafe, or a walk with takeaway cups.',
    icon: Coffee,
  },
  {
    title: 'Match around real availability',
    description: 'See people who have overlapping windows, nearby neighbourhoods, and the same low-pressure intent.',
    icon: CalendarDays,
  },
  {
    title: 'Move from chat to plan',
    description: 'Use a lightweight prompt and suggested cafe shortlist so a match can become a date quickly.',
    icon: MessageCircle,
  },
]

const principles = [
  'Coffee-first profiles with date intent up front',
  'Availability windows before open-ended chatting',
  'Safety nudges, public-place defaults, and easy reporting',
  'No swipe marathon: a small daily table of thoughtful matches',
]

async function refreshCurrentUsers() {
  if (!sessionCookie.value && import.meta.client) {
    sessionCookie.value = crypto.randomUUID()
  }

  const data = await $fetch<{ currentUsers: number }>('/api/current-users', {
    method: 'POST',
    body: {
      sessionId: sessionCookie.value,
    },
  })

  currentUsers.value = data.currentUsers
}

function startOnboarding() {
  return navigateTo('/coming-soon')
}

onMounted(() => {
  void resolveMeState()
  void refreshCurrentUsers()

  currentUsersInterval = setInterval(() => {
    void refreshCurrentUsers()
  }, 30_000)
})

onBeforeUnmount(() => {
  if (currentUsersInterval) {
    clearInterval(currentUsersInterval)
  }
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] text-[#211A16]">
    <section class="hero-shell">
      <img
        src="/images/coffee-date-hero.png"
        alt="Two coffees on a cafe table beside a phone"
        class="hero-image"
      >
      <div class="hero-scrim" />

      <div class="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-end px-5 pb-8 pt-24 sm:px-8 lg:min-h-[42rem] lg:pb-12">
        <div v-if="isLoggedIn" class="mb-5 max-w-md rounded-lg bg-white/82 px-4 py-3 text-sm shadow-sm backdrop-blur">
          <p class="font-semibold text-[#211A16]">
            {{ greeting }}
          </p>
          <p class="mt-1 text-[#5F5149]">
            Your coffee-date queue is being prepared.
          </p>
        </div>

        <div class="max-w-3xl">
          <p class="mb-4 inline-flex items-center gap-2 rounded-full bg-white/82 px-3 py-1 text-sm font-medium text-[#4E3E35] shadow-sm backdrop-blur">
            <Coffee class="size-4" aria-hidden="true" />
            Casual dates, clear plans, good coffee
          </p>

          <h1 class="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-white drop-shadow sm:text-6xl">
            Meet for coffee, not for endless chat.
          </h1>

          <p class="mt-5 max-w-2xl text-base leading-7 text-white/92 drop-shadow sm:text-lg">
            Lonely Radish is a dating app base for people who want simple, public, low-pressure first dates.
            Match by cafe style, neighbourhood, and availability before the conversation drifts.
          </p>

          <div class="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" class="primary-action" @click="startOnboarding">
              <Sparkles class="size-5" aria-hidden="true" />
              Start matching
            </button>

            <NuxtLink to="/coming-soon" class="secondary-action">
              Preview date flow
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-6xl gap-4 px-5 py-6 sm:grid-cols-3 sm:px-8">
      <article class="metric-card">
        <span class="metric-value">{{ currentUsers ?? '-' }}</span>
        <span class="metric-label">People browsing now</span>
      </article>

      <article class="metric-card">
        <span class="metric-value">{{ stats?.totalUsers ?? '-' }}</span>
        <span class="metric-label">Early members</span>
      </article>

      <article class="metric-card">
        <span class="metric-value">30m</span>
        <span class="metric-label">Default first-date window</span>
      </article>
    </section>

    <section class="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <div>
        <p class="section-kicker">Discovery base</p>
        <h2 class="section-heading">
          A calmer matching surface built around one real plan.
        </h2>
        <p class="mt-4 max-w-xl text-[#6B5C52]">
          The app should feel more like choosing a table than performing for a feed. Profiles highlight coffee preferences,
          first-date rhythm, availability, and the kind of conversation someone actually wants.
        </p>

        <ul class="mt-6 space-y-3">
          <li v-for="principle in principles" :key="principle" class="flex gap-3 text-sm text-[#4D4038]">
            <CheckCircle2 class="mt-0.5 size-5 shrink-0 text-[#2F7D63]" aria-hidden="true" />
            <span>{{ principle }}</span>
          </li>
        </ul>
      </div>

      <div class="grid gap-3">
        <article
          v-for="match in featuredMatches"
          :key="match.name"
          class="match-card"
          :class="match.tone"
        >
          <div class="avatar-mark">
            {{ match.name.charAt(0) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 class="text-lg font-semibold">
                {{ match.name }}
              </h3>
              <span class="inline-flex items-center gap-1 text-xs font-medium text-[#5B4E46]">
                <MapPin class="size-3.5" aria-hidden="true" />
                2 km away
              </span>
            </div>
            <p class="mt-1 text-sm text-[#5E5148]">
              {{ match.detail }}
            </p>
          </div>
          <span class="availability-pill">{{ match.time }}</span>
        </article>
      </div>
    </section>

    <section class="bg-[#211A16] px-5 py-12 text-white sm:px-8">
      <div class="mx-auto max-w-6xl">
        <div class="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p class="section-kicker text-[#DABFA4]">How it works</p>
            <h2 class="section-heading max-w-2xl text-white">
              Keep the product opinionated: match, suggest a cafe, meet in public.
            </h2>
          </div>
          <NuxtLink to="/contact" class="text-sm font-semibold text-[#F3D8B8] hover:text-white">
            Give feedback
          </NuxtLink>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <article v-for="step in dateFlow" :key="step.title" class="flow-card">
            <component :is="step.icon" class="size-6 text-[#E8C79F]" aria-hidden="true" />
            <h3 class="mt-4 font-semibold">
              {{ step.title }}
            </h3>
            <p class="mt-2 text-sm leading-6 text-white/72">
              {{ step.description }}
            </p>
          </article>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-6xl gap-5 px-5 py-12 sm:px-8 md:grid-cols-2">
      <article class="foundation-card">
        <ShieldCheck class="size-7 text-[#2F7D63]" aria-hidden="true" />
        <h2 class="mt-4 text-2xl font-semibold">
          Safety belongs in the core flow.
        </h2>
        <p class="mt-3 text-sm leading-6 text-[#66584F]">
          This base is set up around public meetup defaults, clear date windows, profile context, and account controls.
          The next product layer should add verification, moderation, reporting, and venue safety guidance before launch.
        </p>
      </article>

      <article class="foundation-card">
        <HeartHandshake class="size-7 text-[#B05D45]" aria-hidden="true" />
        <h2 class="mt-4 text-2xl font-semibold">
          Designed for intentional casual dating.
        </h2>
        <p class="mt-3 text-sm leading-6 text-[#66584F]">
          The positioning is not marriage-market serious or swipe-game frantic. It is for people who are open to meeting,
          want chemistry in person, and prefer a simple first date that can end gracefully.
        </p>
      </article>
    </section>
  </main>
</template>

<style scoped>
.hero-shell {
  position: relative;
  min-height: calc(100vh - 5rem);
  overflow: hidden;
  background: #211a16;
}

.hero-image {
  position: absolute;
  inset: 0;
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.hero-scrim {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(33, 26, 22, 0.78), rgba(33, 26, 22, 0.34) 48%, rgba(33, 26, 22, 0.1)),
    linear-gradient(0deg, rgba(33, 26, 22, 0.52), rgba(33, 26, 22, 0.06) 42%);
}

.primary-action,
.secondary-action {
  display: inline-flex;
  min-height: 3rem;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border-radius: 999px;
  padding: 0.8rem 1.15rem;
  font-weight: 700;
  transition: transform 160ms ease, background 160ms ease, color 160ms ease;
}

.primary-action {
  background: #ffffff;
  color: #211a16;
}

.secondary-action {
  border: 1px solid rgba(255, 255, 255, 0.62);
  color: #ffffff;
}

.primary-action:hover,
.secondary-action:hover {
  transform: translateY(-1px);
}

.secondary-action:hover {
  background: rgba(255, 255, 255, 0.12);
}

.metric-card,
.foundation-card {
  border: 1px solid rgba(33, 26, 22, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 12px 28px rgba(33, 26, 22, 0.06);
}

.metric-card {
  display: flex;
  min-height: 7rem;
  flex-direction: column;
  justify-content: center;
  padding: 1.25rem;
}

.metric-value {
  font-size: clamp(2rem, 6vw, 3.25rem);
  font-weight: 750;
  line-height: 1;
}

.metric-label {
  margin-top: 0.55rem;
  color: #6b5c52;
  font-size: 0.9rem;
}

.section-kicker {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #9a624b;
}

.section-heading {
  margin-top: 0.55rem;
  font-size: clamp(2rem, 4vw, 3.15rem);
  font-weight: 720;
  line-height: 1.05;
  letter-spacing: 0;
}

.match-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  border-radius: 8px;
  padding: 1rem;
  color: #211a16;
  box-shadow: 0 10px 24px rgba(33, 26, 22, 0.08);
}

.avatar-mark {
  display: inline-flex;
  height: 3.25rem;
  width: 3.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.68);
  font-size: 1.35rem;
  font-weight: 800;
}

.availability-pill {
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  padding: 0.45rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: #4b3f38;
}

.flow-card {
  min-height: 14rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  padding: 1.25rem;
}

.foundation-card {
  padding: 1.4rem;
}

@media (max-width: 640px) {
  .hero-shell {
    min-height: 42rem;
  }

  .hero-scrim {
    background:
      linear-gradient(0deg, rgba(33, 26, 22, 0.86), rgba(33, 26, 22, 0.18) 72%),
      linear-gradient(90deg, rgba(33, 26, 22, 0.48), rgba(33, 26, 22, 0.08));
  }

  .match-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .availability-pill {
    margin-left: 4.25rem;
  }
}
</style>
