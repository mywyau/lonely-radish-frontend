<script setup lang="ts">
import { BookOpen, Gamepad2, Leaf, Palette, Sparkles, Trophy, Utensils } from '@lucide/vue'

definePageMeta({
  title: 'Date Ideas · Lonely Radish',
})

const categories = [
  { slug: 'casual', name: 'Casual', detail: 'Food, markets, coffee, relaxed meetups, and activities people have added themselves.', icon: Utensils, tone: 'bg-[#F3E8DA]' },
  { slug: 'culture', name: 'Culture', detail: 'Galleries, films, theatre, music, comedy, museums, and other cultural plans.', icon: Palette, tone: 'bg-[#FCE3E8]' },
  { slug: 'sports', name: 'Sports', detail: 'Tennis, climbing, running, swimming, football, and other active interests.', icon: Trophy, tone: 'bg-[#EAF2DE]' },
  { slug: 'outdoors', name: 'Outdoors', detail: 'Walks, parks, cycling, gardens, photography, hikes, and time outside.', icon: Leaf, tone: 'bg-[#EAF2DE]' },
  { slug: 'games', name: 'Games', detail: 'Board games, co-op games, puzzles, party games, strategy, and cosy play.', icon: Gamepad2, tone: 'bg-[#F7D4DC]' },
  { slug: 'learn-create', name: 'Learn & create', detail: 'Workshops, crafts, talks, books, language exchange, trivia, and making things.', icon: BookOpen, tone: 'bg-[#F3E8DA]' },
]
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-5 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-6xl">
      <div class="max-w-3xl">
        <p class="section-kicker">Discover</p>
        <h1 class="mt-2 text-4xl font-semibold leading-tight sm:text-5xl">
          Browse people through broader interests.
        </h1>
        <p class="mt-4 max-w-2xl text-[#6E4D58]">
          Detailed activities still help express who you are. Discovery uses larger categories so good people are not split across lots of tiny lists.
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
              <span class="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#8F1839] group-hover:underline"><Sparkles class="size-4" />Browse people →</span>
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
