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

const { isLoggedIn, user, resolve: resolveMeState } = useMeStateV2()
const localHour = ref<number | null>(null)
const welcomeMessageIndex = ref(0)
const nighttimeGreetingIndex = ref(0)

const welcomeMessages = [
  'Fancy making a plan with someone new?',
  'See who nearby is into the same things as you.',
  'Someone new might have caught your eye.',
  'Have a look around when you’re ready.',
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
    detail: 'Gallery walks, Sunday markets and small gigs',
    time: 'Free Thu evening',
    tone: 'bg-[#F3E8DA]',
  },
  {
    name: 'Theo',
    age: 32,
    photo: '/images/theo-profile-triptych.png',
    detail: 'Bookshops, live jazz and evening walks',
    time: 'Free Sat morning',
    tone: 'bg-[#EAF2DE]',
  },
  {
    name: 'Nina',
    age: 29,
    photo: '/images/nina-profile-triptych.png',
    detail: 'Indie films, city walks and casual places to eat',
    time: 'Free after work',
    tone: 'bg-[#F7D4DC]',
  },
]

const dateFlow = [
  {
    kicker: 'Find someone',
    title: 'Start with something in common',
    description: 'Perhaps you both like gallery trips, live music or trying a new place to eat. That gives you an easy place to begin.',
    detail: 'You both fancy a gallery visit',
    action: 'Say hello',
    icon: HeartHandshake,
  },
  {
    kicker: 'Make a plan',
    title: 'Sort out the details together',
    description: 'Suggest what to do, when to go and where to meet. Nothing is booked in until you have both agreed.',
    detail: 'Gallery visit · Sat, 2:00 pm · Meet by the entrance',
    action: 'That works',
    icon: CalendarDays,
  },
  {
    kicker: 'Meet up',
    title: 'Know where you stand',
    description: 'You’ll get a reminder before the date. If something changes, either person can suggest another time or cancel clearly.',
    detail: 'Still going? · Yes, see you there',
    action: 'See you soon',
    icon: MessageCircle,
  },
]

const principles = [
  'Meet people who are genuinely open to someone new',
  'Start with an activity, so there is already something to talk about',
  'Make the first plan somewhere public and confirm before you go',
]

const intentionRules = [
  {
    label: 'Five people a day',
    title: 'Choose who you’re actually curious about',
    description: 'You can show interest in up to five people each day. Enough to meet someone new, without turning it into a numbers game.',
    icon: Sparkles,
  },
  {
    label: 'Three or five matches',
    title: 'Keep room for a real conversation',
    description: 'Free accounts can have 3 active matches and paid accounts can have 5. If your list is full, any new matches will wait for you.',
    icon: HeartHandshake,
  },
  {
    label: 'Both people agree',
    title: 'A plan is only a plan when you both say yes',
    description: 'The time and place are confirmed together. If someone suggests a change, the original plan stays put until the other person accepts.',
    icon: CalendarDays,
  },
  {
    label: 'No guesswork',
    title: 'If plans change, say so',
    description: 'Confirm before you go, suggest another time or cancel clearly. You can also block or report someone whenever you need to.',
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
            Dating feels better when there’s a plan
          </p>

          <h1 class="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-[#2A1520] sm:text-6xl">
            Meet someone by doing something you both enjoy.
          </h1>

          <p class="mt-5 max-w-2xl text-base leading-7 text-[#6E4D58] sm:text-lg">
            Start with something you’d both like to do. If you like each other too, choose a public place and make a plan together.
          </p>

          <div class="mt-7 flex flex-col gap-3 sm:flex-row">
            <button type="button" class="primary-action" @click="startOnboarding">
              <Sparkles class="size-5" aria-hidden="true" />
              Meet someone new
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
        <p class="section-kicker">A different way to date</p>
        <h2 class="section-heading">
          Spend less time swiping and more time seeing if you click.
        </h2>
        <p class="mt-4 max-w-xl text-[#6E4D58]">
          Lonely Radish is for people who would rather share a coffee, a walk or an afternoon out than spend weeks chatting in an app.
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
          <p class="section-kicker">Why it works this way</p>
          <h2 class="section-heading">Give each connection room to grow.</h2>
          <p class="mt-4 leading-7 text-[#6E4D58]">
            We don’t want you juggling dozens of matches or wondering whether a date is still happening. We have some rules we use to keep things manageable.
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

        <div class="mt-6 rounded-lg border border-[#B4234A]/15 bg-[#FCE3E8]/55 p-4 text-sm leading-6 text-[#4D2F39]">
          <strong>Accepting an interest works one at a time.</strong>
          Once you accept someone, either start making a plan or decide that the match isn’t for you before accepting the next person. If you had already liked each other, you’ll still match automatically.
          <NuxtLink to="/faq#discovery-and-matching" class="ml-1 font-semibold text-[#8F1839] hover:underline">How matching works</NuxtLink>
        </div>

        <NuxtLink to="/faq" class="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#2A1520] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#4D2F39]">
          Read the FAQs <span aria-hidden="true">→</span>
        </NuxtLink>
      </div>
    </section>

    <section class="bg-[#2A1520] px-5 py-12 text-white sm:px-8">
      <div class="mx-auto max-w-6xl">
        <div class="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p class="section-kicker text-[#F7B7C4]">When you find someone</p>
            <h2 class="section-heading max-w-2xl text-white">
              We help with the awkward bit between matching and meeting.
            </h2>
            <p class="mt-4 max-w-2xl leading-7 text-white/70">
              No vague “we should do something sometime”. You can pick an idea, agree the details and know whether you’re both still on for it.
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
          <p class="section-kicker">A little extra</p>
          <h2 class="section-heading">Already made a plan? See if there’s an offer nearby.</h2>
          <p class="mt-4 max-w-2xl leading-7 text-[#6E4D58]">
            Once your date is confirmed, you can look for offers from approved local places. It might mean money off a meal, a drink or something you can do together.
          </p>
        </div>

        <div class="mt-8 grid gap-5 lg:grid-cols-2">
          <article class="offer-audience-card offer-audience-daters">
            <div class="offer-card-heading">
              <span class="offer-icon offer-icon-daters"><HeartHandshake class="size-6" aria-hidden="true" /></span>
              <div>
                <p class="offer-card-kicker">For people dating</p>
                <h3 class="text-2xl font-semibold">Found one you both like?</h3>
              </div>
            </div>
            <ol class="mt-6 grid gap-4">
              <li class="offer-step">
                <BadgePercent class="size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
                <span><strong>Add it to the plan.</strong> Pick an offer that suits the date you have already agreed.</span>
              </li>
              <li class="offer-step">
                <TicketCheck class="size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
                <span><strong>Keep the code handy.</strong> The person claiming it gets a private code to show at the venue.</span>
              </li>
              <li class="offer-step">
                <CheckCircle2 class="size-5 shrink-0 text-[#B4234A]" aria-hidden="true" />
                <span><strong>Use it when you meet.</strong> Each offer can be used once for that confirmed date, subject to its terms.</span>
              </li>
            </ol>
            <NuxtLink to="/offers" class="offer-link">Explore date offers <span aria-hidden="true">→</span></NuxtLink>
          </article>

          <article class="offer-audience-card offer-audience-business">
            <div class="offer-card-heading">
              <span class="offer-icon offer-icon-business"><Store class="size-6" aria-hidden="true" /></span>
              <div>
                <p class="offer-card-kicker offer-card-kicker-business">For business owners</p>
                <h3 class="text-2xl font-semibold">Welcome people who are already heading out.</h3>
              </div>
            </div>
            <ol class="mt-6 grid gap-4">
              <li class="offer-step">
                <BadgePercent class="size-5 shrink-0 text-[#52713A]" aria-hidden="true" />
                <span><strong>Create an offer.</strong> Choose the saving, the terms and where people can use it.</span>
              </li>
              <li class="offer-step">
                <ShieldCheck class="size-5 shrink-0 text-[#52713A]" aria-hidden="true" />
                <span><strong>Send it for review.</strong> Once approved, people can find it. You can pause it whenever you like.</span>
              </li>
              <li class="offer-step">
                <TicketCheck class="size-5 shrink-0 text-[#52713A]" aria-hidden="true" />
                <span><strong>Check the code.</strong> Validate it at the venue and see redemptions in your dashboard.</span>
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
