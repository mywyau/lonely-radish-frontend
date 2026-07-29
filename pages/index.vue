<script setup lang="ts">
import {
  BadgePercent,
  CalendarDays,
  CheckCircle2,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Store,
  TicketCheck,
} from '@lucide/vue'

useSeoMeta({
  title: 'Meet through activities you both want to do',
  description: 'Meet new people nearby through simple, low-pressure shared plans.',
  ogTitle: 'Meet through activities you both want to do | Lonely Radish',
  ogDescription: 'Find someone nearby, pick an activity, and meet around something you both enjoy.',
})

const { isLoggedIn, user, resolve: resolveMeState } = useMeStateV2()
const localHour = ref<number | null>(null)
const welcomeMessageIndex = ref(0)
const nighttimeGreetingIndex = ref(0)

const welcomeMessages = [
  'A shared interest could be the start of something lovely.',
  'There are new people and possibilities waiting to be discovered.',
  'Your next great plan could be one introduction away.',
  'Take a look around — someone nearby may enjoy the same things you do.',
  'A simple hello and a shared plan can go a long way.',
  'New activity matches are ready whenever you are.',
]

const timeOfDayGreeting = computed(() => {
  const hour = localHour.value
  if (hour === null) return 'Welcome back'
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 22) return 'Good evening'
  return null
})

const greetingFirstName = computed(() => {
  const firstName = user.value?.firstName?.trim()
  return firstName
    ? `${firstName.charAt(0).toLocaleUpperCase()}${firstName.slice(1)}`
    : ''
})

const greeting = computed(() => {
  const firstName = greetingFirstName.value
  if (timeOfDayGreeting.value === null) {
    return nighttimeGreetingIndex.value === 0
      ? `Nice to see you tonight${firstName ? `, ${firstName}` : ''}`
      : 'Welcome back, night owl'
  }
  return firstName ? `${timeOfDayGreeting.value}, ${firstName}` : `${timeOfDayGreeting.value} from Lonely Radish`
})

const welcomeMessage = computed(() => welcomeMessages[welcomeMessageIndex.value])

const featuredMatches = [
  {
    name: 'Maya',
    age: 31,
    photo: '/images/maya-profile-triptych.png',
    detail: 'Gallery walks, Sunday markets, low-key gigs',
    time: 'Free Thu evening',
    tone: 'bg-[#F3E8DA]',
  },
  {
    name: 'Theo',
    age: 32,
    photo: '/images/theo-profile-triptych.png',
    detail: 'Bookshops, live jazz, evening walks',
    time: 'Free Sat morning',
    tone: 'bg-[#EAF2DE]',
  },
  {
    name: 'Nina',
    age: 29,
    photo: '/images/nina-profile-triptych.png',
    detail: 'Indie films, city walks, casual food spots',
    time: 'Free after work',
    tone: 'bg-[#F7D4DC]',
  },
]

const dateFlow = [
  {
    kicker: 'New match',
    title: 'You and Maya matched',
    description: 'You both like gallery walks.',
    detail: 'Gallery walks · 2 km away',
    action: 'Start planning',
    icon: HeartHandshake,
  },
  {
    kicker: 'Date proposal',
    title: 'Gallery walk',
    description: 'Choose a time and send details for a public venue. Suggest a small change if needed.',
    detail: 'Sat, 2:00 pm · Barbican Centre',
    action: 'Review plan',
    icon: CalendarDays,
  },
  {
    kicker: 'Plan confirmed',
    title: 'You’re all set',
    description: 'Reschedule simply, or optionally share contact details once matched.',
    detail: 'Public venue · Contact sharing off',
    action: 'View date',
    icon: MessageCircle,
  },
]

const principles = [
  'People who are open to forming new relationships',
  'Activity preferences and simple plans up front',
  'Public places first, with safety reminders and confirmations on meetups.',
]

const intentionRules = [
  {
    label: 'A daily limit',
    title: 'Interest is deliberately selective',
    description: 'You can show interest in up to five people each day, so each choice stays meaningful instead of becoming endless swiping.',
    icon: Sparkles,
  },
  {
    label: 'A smaller match list',
    title: 'Plans come before collecting matches',
    description: 'Active matches are limited by your plan. Finish a plan or close a connection before filling your match list again.',
    icon: HeartHandshake,
  },
  {
    label: 'Agreement matters',
    title: 'Date changes need a clear response',
    description: 'A date is only confirmed once both people accept it. A proposed reschedule does not replace the agreed plan until it is accepted.',
    icon: CalendarDays,
  },
  {
    label: 'Follow through',
    title: 'Cancel clearly rather than disappearing',
    description: 'Confirm attendance, reschedule early or cancel explicitly. Blocking, reporting and private post-date follow-up remain available when needed.',
    icon: ShieldCheck,
  },
]

function startOnboarding() {
  return navigateTo('/activities')
}

onMounted(() => {
  localHour.value = new Date().getHours()
  welcomeMessageIndex.value = Math.floor(Math.random() * welcomeMessages.length)
  nighttimeGreetingIndex.value = Math.floor(Math.random() * 2)
  void resolveMeState()
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
            {{ welcomeMessage }}
          </p>
        </div>

        <div class="max-w-3xl">
          <p class="mb-4 inline-flex items-center gap-2 rounded-full border border-[#E8D8C4] bg-white px-3 py-1 text-sm font-medium text-[#8F1839] shadow-sm">
            <Sparkles class="size-4" aria-hidden="true" />
            Meet interesting new souls near you!
          </p>

          <h1 class="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-[#2A1520] sm:text-6xl">
            Meet through something you both enjoy.
          </h1>

          <p class="mt-5 max-w-2xl text-base leading-7 text-[#6E4D58] sm:text-lg">
            Find someone nearby who wants to do the same kind of thing. Pick an activity, choose a public place, and meet and form new relationships naturally.
          </p>

          <div class="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" class="primary-action" @click="startOnboarding">
              <Sparkles class="size-5" aria-hidden="true" />
              Start matching
            </button>

            <NuxtLink to="/matches" class="secondary-action">
              Browse matches
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-6xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
      <div>
        <p class="section-kicker">Meet casually</p>
        <h2 class="section-heading">
          Skip the endless swiping. Say yes to a plan.
        </h2>
        <p class="mt-4 max-w-xl text-[#6E4D58]">
          Lonely Radish is for individuals who would rather meet around a shared activity.
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
          <div class="match-photo"><img :src="match.photo" :alt="`${match.name} profile example`"></div>
          <div class="min-w-0 flex-1">
            <h3 class="text-lg font-semibold">
              {{ match.name }}, {{ match.age }}
            </h3>
            <p class="mt-1 text-sm text-[#6E4D58]">
              {{ match.detail }}
            </p>
          </div>
          <span class="availability-pill">{{ match.time }}</span>
        </article>
      </div>
    </section>

    <section class="border-y border-[#B4234A]/10 bg-white/55 px-5 py-12 sm:px-8 sm:py-16">
      <div class="mx-auto max-w-6xl">
        <div class="max-w-2xl">
          <p class="section-kicker">The rules behind the app</p>
          <h2 class="section-heading">Less swiping. More intention.</h2>
          <p class="mt-4 leading-7 text-[#6E4D58]">
            Intention comes from the boundaries built into Lonely Radish—not just the wording. These rules keep attention on a few genuine possibilities and clearer real-world plans.
          </p>
        </div>

        <ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <li v-for="rule in intentionRules" :key="rule.label" class="how-card">
            <div class="flex items-center justify-between gap-3">
              <span class="how-number">{{ rule.label }}</span>
              <component :is="rule.icon" class="size-6 text-[#B4234A]" aria-hidden="true" />
            </div>
            <h3 class="mt-5 text-lg font-semibold">{{ rule.title }}</h3>
            <p class="mt-2 text-sm leading-6 text-[#6E4D58]">{{ rule.description }}</p>
          </li>
        </ul>

        <div class="mt-7 flex flex-wrap gap-2" aria-label="Lonely Radish features">
          <span class="feature-pill">Shared-interest discovery</span>
          <span class="feature-pill">Selective matches</span>
          <span class="feature-pill">In-app date planning</span>
          <span class="feature-pill">Date-friendly offers</span>
          <span class="feature-pill">Safety and reporting tools</span>
        </div>
        <NuxtLink to="/faq" class="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#2A1520] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4D2F39]">
          Read how the app works in detail <span aria-hidden="true">→</span>
        </NuxtLink>
      </div>
    </section>

    <section class="bg-[#2A1520] px-5 py-12 text-white sm:px-8">
      <div class="mx-auto max-w-6xl">
        <div class="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p class="section-kicker text-[#F7B7C4]">From match to meetup</p>
            <h2 class="section-heading max-w-2xl text-white">
              Match. Make a plan. Meet.
            </h2>
            <p class="mt-4 max-w-2xl leading-7 text-white/70">
              Every match has a shared planning space, so the next step is clear without needing a long conversation first.
            </p>
          </div>
          <NuxtLink to="/contact" class="text-sm font-semibold text-[#F7B7C4] hover:text-white">
            Give feedback
          </NuxtLink>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <article v-for="step in dateFlow" :key="step.title" class="flow-card">
            <div class="flex items-center justify-between gap-3"><component :is="step.icon" class="size-6 text-[#F7B7C4]" aria-hidden="true" /><span class="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#F7B7C4]">{{ step.kicker }}</span></div>
            <h3 class="mt-5 text-lg font-semibold">
              {{ step.title }}
            </h3>
            <p class="mt-2 text-sm leading-5 text-white/72">
              {{ step.description }}
            </p>
            <div class="mt-5 rounded-lg bg-white/10 p-3"><p class="text-xs font-semibold text-white/85">{{ step.detail }}</p><span class="mt-3 inline-flex rounded-full bg-[#F7B7C4] px-3 py-1.5 text-xs font-bold text-[#2A1520]">{{ step.action }}</span></div>
          </article>
        </div>
      </div>
    </section>

    <section class="offer-section px-5 py-12 sm:px-8 sm:py-16">
      <div class="mx-auto max-w-6xl">
        <div class="max-w-3xl">
          <p class="section-kicker">Date-friendly offers</p>
          <h2 class="section-heading">Turn a confirmed date into a better local experience.</h2>
          <p class="mt-4 max-w-2xl leading-7 text-[#6E4D58]">
            Lonely Radish connects real date plans with offers from approved local businesses giving couples a useful saving and venues a genuine reason to welcome them.
          </p>
        </div>

        <div class="mt-8 grid gap-5 lg:grid-cols-2">
          <article class="offer-audience-card offer-audience-daters">
            <div class="offer-card-heading">
              <span class="offer-icon offer-icon-daters"><HeartHandshake class="size-6" aria-hidden="true" /></span>
              <div>
                <p class="offer-card-kicker">For people dating</p>
                <h3 class="text-2xl font-semibold">Add an offer once the date is confirmed.</h3>
              </div>
            </div>
            <ol class="mt-6 grid gap-4">
              <li class="offer-step">
                <BadgePercent class="size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
                <span><strong>Choose together.</strong> Browse approved offers and attach one that suits your confirmed plan.</span>
              </li>
              <li class="offer-step">
                <TicketCheck class="size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
                <span><strong>Keep the code private.</strong> The person claiming receives a secure, expiring code to show at the venue.</span>
              </li>
              <li class="offer-step">
                <CheckCircle2 class="size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
                <span><strong>Use it for that date.</strong> Each offer can be redeemed once for each confirmed couple date, subject to its terms.</span>
              </li>
            </ol>
            <NuxtLink to="/offers" class="offer-link">Explore date offers <span aria-hidden="true">→</span></NuxtLink>
          </article>

          <article class="offer-audience-card offer-audience-business">
            <div class="offer-card-heading">
              <span class="offer-icon offer-icon-business"><Store class="size-6" aria-hidden="true" /></span>
              <div>
                <p class="offer-card-kicker offer-card-kicker-business">For business owners</p>
                <h3 class="text-2xl font-semibold">Reach couples who already have a plan.</h3>
              </div>
            </div>
            <ol class="mt-6 grid gap-4">
              <li class="offer-step">
                <BadgePercent class="size-5 shrink-0 text-[#52713A]" aria-hidden="true" />
                <span><strong>Create a campaign.</strong> Set the saving, terms and the venues where it applies.</span>
              </li>
              <li class="offer-step">
                <ShieldCheck class="size-5 shrink-0 text-[#52713A]" aria-hidden="true" />
                <span><strong>Publish after review.</strong> Approved offers become discoverable while you remain free to pause them.</span>
              </li>
              <li class="offer-step">
                <TicketCheck class="size-5 shrink-0 text-[#52713A]" aria-hidden="true" />
                <span><strong>Redeem with confidence.</strong> Validate the date’s code at the venue and follow redemptions from your dashboard.</span>
              </li>
            </ol>
            <NuxtLink to="/business" class="offer-link offer-link-business">Offer something date-friendly <span aria-hidden="true">→</span></NuxtLink>
          </article>
        </div>
      </div>
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
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  column-gap: 0.875rem;
  row-gap: 0.75rem;
  border-radius: 8px;
  padding: 1rem;
  color: #2a1520;
  box-shadow: 0 10px 24px rgba(180, 35, 74, 0.1);
}

.match-photo { height: 4rem; width: 4rem; flex-shrink: 0; overflow: hidden; border-radius: .65rem; background: rgba(255,255,255,.68); }
.match-photo img { height: 100%; width: 300%; max-width: none; transform: translateX(-33.333%); object-fit: cover; }

.availability-pill {
  grid-column: 2;
  justify-self: start;
  flex-shrink: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.7);
  padding: 0.45rem 0.7rem;
  font-size: 0.75rem;
  font-weight: 800;
  color: #4d2f39;
}

@media (min-width: 640px) {
  .match-card {
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 1rem;
  }

  .availability-pill {
    grid-column: auto;
    justify-self: auto;
  }
}

@media (max-width: 374px) {
  .match-card {
    padding: 0.875rem;
  }

  .match-photo { height: 3.25rem; width: 3.25rem; }
}

.flow-card {
  min-height: 16rem;
  border: 1px solid rgba(247, 183, 196, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  padding: 1.25rem;
}

.how-card {
  border-radius: 8px;
  background: #ffffff;
  padding: 1.25rem;
  box-shadow: 0 10px 24px rgba(180, 35, 74, 0.07);
}

.how-number {
  font-size: 0.75rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  color: #8f1839;
}

.feature-pill {
  border: 1px solid rgba(180, 35, 74, 0.16);
  border-radius: 999px;
  background: #fbf7f1;
  padding: 0.5rem 0.75rem;
  color: #6e4d58;
  font-size: 0.75rem;
  font-weight: 750;
}

.offer-section { border-top: 1px solid rgba(180,35,74,.1); background: linear-gradient(180deg, rgba(252,227,232,.32), rgba(234,242,222,.35)); }
.offer-audience-card { border-radius: .75rem; padding: 1.5rem; box-shadow: 0 12px 28px rgba(42,21,32,.08); }
.offer-audience-daters { background: #F7D7DE; }
.offer-audience-business { background: #DDEACB; }
.offer-card-heading { display: flex; align-items: flex-start; gap: .9rem; }
.offer-icon { display: inline-flex; height: 3rem; width: 3rem; flex-shrink: 0; align-items: center; justify-content: center; border-radius: .75rem; color: white; }
.offer-icon-daters { background: #B4234A; }
.offer-icon-business { background: #52713A; }
.offer-card-kicker { margin-bottom: .25rem; color: #8F1839; font-size: .7rem; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }
.offer-card-kicker-business { color: #526B3C; }
.offer-step { display: flex; align-items: flex-start; gap: .75rem; color: #4D2F39; font-size: .875rem; line-height: 1.55; }
.offer-link { display: inline-flex; align-items: center; gap: .45rem; margin-top: 1.5rem; border-radius: 999px; background: #B4234A; padding: .75rem 1rem; color: white; font-size: .875rem; font-weight: 750; transition: transform .15s ease, background-color .15s ease; }
.offer-link:hover { background: #8F1839; transform: translateY(-1px); }
.offer-link-business { background: #52713A; }
.offer-link-business:hover { background: #3F6229; }

@media (max-width: 640px) {
  .hero-shell {
    min-height: 36rem;
  }

  .match-card {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .availability-pill {
    margin-left: 0;
  }
}
</style>
