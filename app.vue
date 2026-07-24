<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'

const route = useRoute()
const businessShell = computed(() => route.path.startsWith('/business'))
const businessSignIn = computed(() => route.path === '/business/sign-in')

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
    <BusinessNavBar v-if="businessShell && !businessSignIn" />
    <BlankNavBar v-else-if="!businessShell" />

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

    <footer v-if="businessShell && !businessSignIn" class="border-t border-[#E8D8C4] bg-white px-5 py-6 text-center text-xs text-[#6E4D58]">Lonely Radish Business · Venue and offer tools</footer>
    <AppFooter v-else-if="!businessShell" />
  </div>
</template>
