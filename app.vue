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
  ogTitle: 'Lonely Radish · Coffee-date dating',
  ogDescription: 'A casual dating app for low-pressure coffee dates, clear availability, and thoughtful introductions.',
  twitterTitle: 'Lonely Radish · Coffee-date dating',
  twitterDescription: 'A casual dating app for low-pressure coffee dates, clear availability, and thoughtful introductions.',
})
</script>

<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[#FFF6F7]">
    <BlankNavBar />

    <BackLink
      v-if="showBackLink"
      class="mt-10"
    />

    <main class="flex-1">
      <ClientOnly>
        <Analytics />
      </ClientOnly>

      <NuxtPage />
    </main>

    <AppFooter />
  </div>
</template>
