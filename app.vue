<script setup lang="ts">
import { Analytics } from '@vercel/analytics/vue'
import { defaultSeoDescription, isIndexablePath, normaliseSeoPath, publicSeoForPath, siteName } from '~/utils/siteSeo'

const route = useRoute()
const businessShell = computed(() => route.path.startsWith('/business'))
const businessSignIn = computed(() => route.path === '/business/sign-in')
const standaloneSignIn = computed(() => businessSignIn.value || route.path === '/please-sign-in')

const showBackLink = computed(() => route.path !== '/')

const runtimeConfig = useRuntimeConfig()

const baseUrl = (runtimeConfig.public.siteUrl || 'http://localhost:3000').replace(/\/$/, '')
const publicSeo = computed(() => publicSeoForPath(route.path))
const canonicalPath = computed(() => normaliseSeoPath(route.path))
const canonicalUrl = computed(() => `${baseUrl}${canonicalPath.value}`)
const pageTitle = computed(() => publicSeo.value?.title
  || (typeof route.meta.title === 'string' ? route.meta.title : undefined))
const pageDescription = computed(() => publicSeo.value?.description || defaultSeoDescription)
const robots = computed(() => isIndexablePath(route.path) ? 'index, follow' : 'noindex, nofollow')

useHead(() => ({
  title: pageTitle.value,
  titleTemplate: (titleChunk) => {
    if (!titleChunk) return 'Lonely Radish · Intentional dating built around real plans'
    return titleChunk.includes(siteName) ? titleChunk : `${titleChunk} · ${siteName}`
  },
  link: [
    {
      rel: 'canonical',
      href: canonicalUrl.value,
    },
  ],
  script: canonicalPath.value === '/' ? [{
    key: 'lonely-radish-website-schema',
    type: 'application/ld+json',
    innerHTML: JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', '@id': `${baseUrl}/#organization`, name: siteName, url: `${baseUrl}/` },
        { '@type': 'WebSite', '@id': `${baseUrl}/#website`, name: siteName, url: `${baseUrl}/`,
          description: defaultSeoDescription, publisher: { '@id': `${baseUrl}/#organization` } },
      ],
    }),
  }] : [],
}))

useSeoMeta({
  description: () => pageDescription.value,
  robots: () => robots.value,
  ogSiteName: siteName,
  ogType: 'website',
  ogLocale: 'en_GB',
  ogUrl: () => canonicalUrl.value,
  ogTitle: () => pageTitle.value ? `${pageTitle.value}${pageTitle.value.includes(siteName) ? '' : ` · ${siteName}`}` : siteName,
  ogDescription: () => pageDescription.value,
  twitterCard: 'summary',
  twitterTitle: () => pageTitle.value ? `${pageTitle.value}${pageTitle.value.includes(siteName) ? '' : ` · ${siteName}`}` : siteName,
  twitterDescription: () => pageDescription.value,
})
</script>

<template>
  <div class="min-h-screen flex flex-col overflow-x-hidden bg-[#FBF7F1]">
    <BusinessNavBar v-if="businessShell && !standaloneSignIn" />
    <BlankNavBar v-else-if="!businessShell && !standaloneSignIn" />

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

    <footer v-if="businessShell && !standaloneSignIn" class="border-t border-[#E8D8C4] bg-white px-5 py-6 text-center text-xs text-[#6E4D58]">Lonely Radish Business · Venue and offer tools</footer>
    <AppFooter v-else-if="!businessShell && !standaloneSignIn" />
  </div>
</template>
