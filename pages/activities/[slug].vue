<script setup lang="ts">
import { discoveryCategorySlug } from '~/utils/activityDiscovery'

definePageMeta({ middleware: 'logged-in' })

const route = useRoute()
const category = discoveryCategorySlug(String(route.params.slug || ''))

if (!category) {
  throw createError({ statusCode: 404, statusMessage: 'Activity category not found' })
}

await navigateTo({ path: '/activities', query: { categories: category } }, { redirectCode: 301, replace: true })
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1]" />
</template>
