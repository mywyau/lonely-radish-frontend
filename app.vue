<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'

const route = useRoute()

const showBackLink = computed(() => route.path !== '/')

const runtimeConfig = useRuntimeConfig()

const baseUrl = (runtimeConfig.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')

useHead({
  link: [
    {
      rel: 'canonical',
      href: `${baseUrl}/`,
    },
  ],
})

useSeoMeta({
  ogUrl: `${baseUrl}/`,
  ogTitle: 'Lonely Radish · Activity-first dating',
  ogDescription: 'A casual dating app for people who want to meet through shared plans, clear availability, and thoughtful introductions.',
  twitterTitle: 'Lonely Radish · Activity-first dating',
  twitterDescription: 'A casual dating app for people who want to meet through shared plans, clear availability, and thoughtful introductions.',
})
</script>

<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[#FBF7F1]">
    <BlankNavBar />

    <!-- <BackLink
      v-if="showBackLink"
      class="mt-10"
    /> -->

    <main class="flex-1">
      <ClientOnly>
        <Analytics />
      </ClientOnly>

      <NuxtPage />
    </main>

    <AppFooter />
  </div>
</template>
