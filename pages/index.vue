<script setup lang="ts">
useSeoMeta({
  title: 'Learn Cantonese in 15 minutes a day',
  description: 'Learn natural Cantonese with vocabulary, sentence quizzes, audio-only drills, and writing practice.',
  ogTitle: 'Learn Cantonese in 15 minutes a day | TaroTea',
  ogDescription: 'Build everyday Cantonese with short, focused practice sessions.',
})

const { data: stats } = await useFetch('/api/total-users-stats', {
  server: true,
  lazy: true,
})

const learningModes = [
  {
    title: 'Daily practice',
    description: 'Short sessions designed for consistency, even with a busy schedule.',
    bgClass: 'brand-card-yellow',
  },
  {
    title: 'Multiple activities',
    description: 'Switch between vocabulary, audio only, or sentence quizzes, and pronunciation-focused learning modes.',
    bgClass: 'brand-card-blue',
  },
  {
    title: 'Progress-driven',
    description: 'See your growth and keep momentum with clear goals and repetition. Track progress via XP and unlock more words for free. Visualise which words are familiar and words that you may need to work on easily.',
    bgClass: 'brand-card-pink',
  },
  {
    title: 'Learn how to write',
    description: 'Grab your pen and paper! Watch and learn how to write traditional chinese characters by following the Hanzi Writer.',
    bgClass: 'brand-card-green',
  },
]

const currentUsers = ref<number | null>(null)
const sessionCookie = useCookie<string>('online_session_id', {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})

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

onMounted(() => {
  void refreshCurrentUsers()
  const interval = setInterval(() => {
    void refreshCurrentUsers()
  }, 30_000)

  onBeforeUnmount(() => {
    clearInterval(interval)
  })
})
</script>

<template>
  <main class="max-w-4xl mx-auto py-16 sm:py-20 px-6 min-h-screen">
    <section class="text-center">
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
        Learn and improve your Cantonese in just <span class="brand-text-gradient">15 minutes</span> a day
      </h1>

      <div class="grid grid-cols-2 sm:grid-cols-2 gap-4 mt-6 max-w-2xl mx-auto">
        <div class="rounded-xl p-5 text-center brand-card-green shadow-sm">
          <div class="text-2xl font-semibold text-gray-900">
            {{ currentUsers ?? '—' }}
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Current users online
          </div>
        </div>

        <div class="rounded-xl p-5 text-center brand-card-pink shadow-sm">
          <div class="text-2xl font-semibold text-gray-900">
            {{ stats?.totalUsers ?? '—' }}
          </div>
          <div class="text-sm text-gray-700 mt-1">
            Learners
          </div>
        </div>
      </div>

      <p class="text-base sm:text-lg text-gray-700 mt-10 max-w-2xl mx-auto">
        Build confidence with quick, focused and fun activities that help you remember what you learn.
        Practice at you own pace, no daily streaks or annoying birds. Grind whatever, whenever you want.
      </p>
    </section>

    <section class="mt-12 rounded-2xl p-6 sm:p-8 brand-cta-bg text-gray-900 shadow-sm">
      <h2 class="text-2xl font-semibold tracking-tight">
        Start learning Cantonese today
      </h2>
      <p class="text-sm sm:text-base text-gray-800 mt-2 max-w-2xl">
        Explore our library or play through different modes and build real vocabulary you can use in everyday
        conversations.
      </p>
      <div class="mt-5 flex flex-wrap gap-3">
        <NuxtLink to="/topics"
          class="inline-flex items-center justify-center rounded-md bg-gray-900 text-white font-medium px-4 py-2 hover:bg-gray-800 transition">
          Explore Topics
        </NuxtLink>
        <NuxtLink to="/levels"
          class="inline-flex items-center justify-center rounded-md bg-gray-900 text-white font-medium px-4 py-2 hover:bg-gray-800 transition">
          Explore Levels
        </NuxtLink>
        <NuxtLink to="/topics/quiz"
          class="inline-flex items-center justify-center rounded-md border border-gray-700 text-gray-900 font-medium px-4 py-2 hover:bg-white/60 transition">
          Try quizzes
        </NuxtLink>


      </div>
    </section>

    <section class="mt-14">
      <h2 class="text-sm uppercase tracking-wide text-gray-500 mb-4">
        How you learn
      </h2>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <article v-for="mode in learningModes" :key="mode.title" :class="mode.bgClass" class="rounded-xl p-5 shadow-sm">
          <h3 class="font-semibold text-gray-900">
            {{ mode.title }}
          </h3>
          <p class="text-sm text-gray-800 mt-2">
            {{ mode.description }}
          </p>
        </article>
      </div>
    </section>
  </main>
</template>

<style scoped>
.brand-card-green {
  background-color: #E7F3D5;
}

.brand-card-pink {
  background-color: #F6E1E1;
}

.brand-card-lilac {
  background-color: #EAB8E4;
}

.brand-card-blue {
  background-color: #A8CAE0;
}

.brand-card-yellow {
  background-color: rgba(244, 205, 39, 0.35);
}

.brand-cta-bg {
  background: linear-gradient(135deg, #F6E1E1 0%, #EAB8E4 50%, #A8CAE0 100%);
}

.brand-text-gradient {
  background: linear-gradient(90deg, #6F5CCA 0%, #E07ABF 50%, #5EA6D6 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
</style>
