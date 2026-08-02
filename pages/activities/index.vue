<script setup lang="ts">
import { BookOpen, Compass, Gamepad2, HandHeart, HeartPulse, Leaf, MoonStar, Palette, PencilLine, Sparkles, Trophy, Utensils } from '@lucide/vue'

definePageMeta({
  title: 'Date Ideas · Lonely Radish',
})

const route = useRoute()
const reportReference = ref('')
const safetyMessage = computed(() => {
  if (route.query.safety === 'blocked') return 'That person has been blocked. You will no longer see each other.'
  if (route.query.safety === 'reported-blocked') return 'Your report was submitted and the person was blocked immediately.'
  if (route.query.safety === 'reported') return 'Your report was submitted to the moderation team.'
  return ''
})

onMounted(() => {
  if (!safetyMessage.value || !String(route.query.safety).startsWith('reported')) return
  reportReference.value = window.sessionStorage.getItem('lonely-radish-latest-report-reference') || ''
  window.sessionStorage.removeItem('lonely-radish-latest-report-reference')
})

const categories = [
  { slug: 'food-drink', name: 'Food & drink', detail: 'Markets, coffee, cooking, picnics, restaurants, and other things to enjoy together.', icon: Utensils, tone: 'bg-[#F3E8DA]' },
  { slug: 'your-ideas', name: 'Your ideas', detail: 'Original activities that members have written and added themselves.', icon: PencilLine, tone: 'bg-[#FFF1C7]' },
  { slug: 'culture', name: 'Culture', detail: 'Galleries, films, theatre, music, comedy, museums, and other cultural plans.', icon: Palette, tone: 'bg-[#FCE3E8]' },
  { slug: 'sports', name: 'Sports', detail: 'Tennis, climbing, running, swimming, football, and other active interests.', icon: Trophy, tone: 'bg-[#EAF2DE]' },
  { slug: 'outdoors', name: 'Outdoors', detail: 'Walks, parks, cycling, gardens, photography, hikes, and time outside.', icon: Leaf, tone: 'bg-[#EAF2DE]' },
  { slug: 'games', name: 'Games', detail: 'Board games, co-op games, puzzles, party games, strategy, and cosy play.', icon: Gamepad2, tone: 'bg-[#F7D4DC]' },
  { slug: 'learn-create', name: 'Learn & create', detail: 'Workshops, crafts, talks, books, language exchange, trivia, and making things.', icon: BookOpen, tone: 'bg-[#F3E8DA]' },
  { slug: 'wellness', name: 'Wellness', detail: 'Yoga, saunas, meditation, spa days, wellness classes, relaxed movement, and self-care activities.', icon: HeartPulse, tone: 'bg-[#E8F1ED]' },
  { slug: 'nightlife', name: 'Nightlife', detail: 'Bars, cocktails, live DJs, dancing, late-night food, pub quizzes, and evening events.', icon: MoonStar, tone: 'bg-[#E8E4F4]' },
  { slug: 'explore', name: 'Explore', detail: 'Day trips, sightseeing, hidden spots, neighbourhood wandering, road trips, and trying somewhere new.', icon: Compass, tone: 'bg-[#FFF1C7]' },
  { slug: 'community', name: 'Community', detail: 'Volunteering, community events, charity activities, environmental projects, meetups, and local causes.', icon: HandHeart, tone: 'bg-[#EAF2DE]' },
]
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-6xl">
      <div v-if="safetyMessage" class="mb-7 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#4D2F39]" role="status">
        <p>{{ safetyMessage }}</p>
        <p v-if="reportReference" class="mt-1 break-all text-xs font-medium text-[#6E4D58]">Report reference: {{ reportReference }}</p>
      </div>
      <div class="max-w-3xl">
        <p class="section-kicker">Find someone</p>
        <h1 class="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
          What sounds good to you?
        </h1>
        <p class="mt-4 max-w-2xl text-[#6E4D58]">
          Pick a category and see who nearby is interested in something similar. Their profile will show the particular activities they chose.
        </p>
      </div>

      <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NuxtLink
              v-for="category in categories"
              :key="category.slug"
              :to="`/activities/${category.slug}`"
              class="group rounded-lg p-5 shadow-[0_10px_24px_rgba(180,35,74,0.08)] transition hover:-translate-y-1 hover:shadow-[0_16px_30px_rgba(180,35,74,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B4234A]"
              :class="category.tone"
            >
              <component :is="category.icon" class="size-6 text-[#B4234A]" aria-hidden="true" />
              <h3 class="mt-4 text-lg font-semibold">
                {{ category.name }}
              </h3>
              <p class="mt-2 text-sm leading-6 text-[#4D2F39]">
                {{ category.detail }}
              </p>
              <span class="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#8F1839] group-hover:underline"><Sparkles class="size-4" />See who’s interested →</span>
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
