<script setup lang="ts">
import {
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from '@lucide/vue'

useSeoMeta({
  title: 'Meet through activities you both want to do',
  description: 'Meet new people nearby through simple, low-pressure shared plans.',
  ogTitle: 'Meet through activities you both want to do | Lonely Radish',
  ogDescription: 'Find someone nearby, pick an activity, and meet around something you both enjoy.',
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
    detail: 'Gallery walks, Sunday markets, low-key gigs',
    time: 'Free Thu evening',
    tone: 'bg-[#F3E8DA]',
  },
  {
    name: 'Theo',
    detail: 'Bookshops, live jazz, evening walks',
    time: 'Free Sat morning',
    tone: 'bg-[#EAF2DE]',
  },
  {
    name: 'Nina',
    detail: 'Indie films, city walks, casual food spots',
    time: 'Free after work',
    tone: 'bg-[#F7D4DC]',
  },
]

const dateFlow = [
  {
    title: 'Pick an activity',
    description: 'Choose the kind of plan you would actually enjoy, from a gallery walk to a film, market, gig, sports or a simple stroll.',
    icon: Sparkles,
  },
  {
    title: 'Meet someone nearby',
    description: 'Browse people nearby who want to do something similar, at a time that works for both of you.',
    icon: CalendarDays,
  },
  {
    title: 'Keep it easy',
    description: 'Agree the plan and get stuck in. Keep meet-ups feeling natural instead of overplanned.',
    icon: MessageCircle,
  },
]

const principles = [
  'People who are open to forming new relationships',
  'Activity preferences, neighbourhoods, and simple plans up front',
  'Public places first, with safety reminders and confirmations on meetups.',
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
  <main class="min-h-screen bg-[#FBF7F1] text-[#2A1520]">
    <section class="hero-shell">
      <div class="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl flex-col justify-end px-5 pb-8 pt-24 sm:px-8 lg:min-h-[40rem] lg:pb-12">
        <div v-if="isLoggedIn" class="mb-7 max-w-xl rounded-lg bg-[#C13A5C] px-6 py-5 shadow-[0_16px_34px_rgba(180,35,74,0.2)]">
          <p class="text-lg font-semibold text-white">
            {{ greeting }}
          </p>
          <p class="mt-2 text-base leading-6 text-white">
            New activity matches are ready to browse.
          </p>
        </div>

        <div class="max-w-3xl">
          <p class="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E8D8C4] bg-white px-3 py-1 text-sm font-medium text-[#8F1839] shadow-sm">
            <Sparkles class="size-4" aria-hidden="true" />
            Casual activity dates nearby
          </p>

          <h1 class="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-[#2A1520] sm:text-6xl">
            Meet through something you both enjoy.
          </h1>

          <p class="mt-5 max-w-2xl text-base leading-7 text-[#6E4D58] sm:text-lg">
            Find someone nearby who wants to do the same kind of thing. Pick an activity, choose a public place, and meet naturally.
          </p>

          <div class="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" class="primary-action" @click="startOnboarding">
              <Sparkles class="size-5" aria-hidden="true" />
              Start matching
            </button>

            <NuxtLink to="/coming-soon" class="secondary-action">
              Browse the preview
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- <section class="mx-auto grid max-w-4xl gap-4 px-5 py-6 sm:grid-cols-2 sm:px-8">
      <article class="metric-card">
        <span class="metric-value">{{ currentUsers ?? '-' }}</span>
        <span class="metric-label">People browsing now</span>
      </article>

      <article class="metric-card">
        <span class="metric-value">{{ stats?.totalUsers ?? '-' }}</span>
        <span class="metric-label">Early members</span>
      </article>
    </section> -->

    <section class="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <div>
        <p class="section-kicker">Meet casually</p>
        <h2 class="section-heading">
          Skip the endless swiping. Say yes to a plan.
        </h2>
        <p class="mt-4 max-w-xl text-[#6E4D58]">
          Lonely Radish is for people who would rather meet around a shared activity than keep guessing over messages.
        </p>

        <ul class="mt-6 space-y-3">
          <li v-for="principle in principles" :key="principle" class="flex gap-3 text-sm text-[#4D2F39]">
            <CheckCircle2 class="mt-0.5 size-5 shrink-0 text-[#6E8B52]" aria-hidden="true" />
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
              <span class="inline-flex items-center gap-1 text-xs font-medium text-[#6E4D58]">
                <MapPin class="size-3.5" aria-hidden="true" />
                2 km away
              </span>
            </div>
            <p class="mt-1 text-sm text-[#6E4D58]">
              {{ match.detail }}
            </p>
          </div>
          <span class="availability-pill">{{ match.time }}</span>
        </article>
      </div>
    </section>

    <section class="bg-[#2A1520] px-5 py-12 text-white sm:px-8">
      <div class="mx-auto max-w-6xl">
        <div class="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <!-- <p class="section-kicker text-[#F7B7C4]">How it works</p> -->
            <h2 class="section-heading max-w-2xl text-white">
              From match to shared plan without making it complicated.
            </h2>
          </div>
          <NuxtLink to="/contact" class="text-sm font-semibold text-[#F7B7C4] hover:text-white">
            Give feedback
          </NuxtLink>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <article v-for="step in dateFlow" :key="step.title" class="flow-card">
            <component :is="step.icon" class="size-6 text-[#F7B7C4]" aria-hidden="true" />
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
        <ShieldCheck class="size-7 text-[#6E8B52]" aria-hidden="true" />
        <h2 class="mt-4 text-2xl font-semibold">
          Meet somewhere safe and public.
        </h2>
        <p class="mt-3 text-sm leading-6 text-[#6E4D58]">
          First meet-ups should feel simple and comfortable. Pick a public place, choose an activity with clear expectations, and keep it easy to leave or extend.
        </p>
      </article>

      <article class="foundation-card">
        <HeartHandshake class="size-7 text-[#B4234A]" aria-hidden="true" />
        <h2 class="mt-4 text-2xl font-semibold">
          Keep it cool, keep it chill.
        </h2>
        <p class="mt-3 text-sm leading-6 text-[#6E4D58]">
          Come as you are, do something you will both enjoy, and see if there is a reason to meet again.
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
  background: linear-gradient(180deg, #fbf7f1 0%, #f3e8da 100%);
  border-bottom: 1px solid rgba(180, 35, 74, 0.12);
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
  background: #b4234a;
  color: #ffffff;
}

.secondary-action {
  border: 1px solid rgba(180, 35, 74, 0.28);
  color: #8f1839;
}

.primary-action:hover,
.secondary-action:hover {
  transform: translateY(-1px);
}

.secondary-action:hover {
  background: rgba(255, 255, 255, 0.68);
}

.metric-card,
.foundation-card {
  /* border: 1px solid rgba(180, 35, 74, 0.14); */
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
  /* box-shadow: 0 12px 28px rgba(180, 35, 74, 0.08); */
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
  color: #6e4d58;
  font-size: 0.9rem;
}

.section-kicker {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #b4234a;
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
  color: #2a1520;
  box-shadow: 0 10px 24px rgba(180, 35, 74, 0.1);
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
  color: #4d2f39;
}

.flow-card {
  min-height: 14rem;
  border: 1px solid rgba(247, 183, 196, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  padding: 1.25rem;
}

.foundation-card {
  padding: 1.4rem;
}

@media (max-width: 640px) {
  .hero-shell {
    min-height: 36rem;
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
