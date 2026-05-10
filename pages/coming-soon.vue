<script setup lang="ts">
import { Construction } from '@lucide/vue'

definePageMeta({
  title: 'Coming soon · TaroTea'
})

// const goBack = () => {
//   if (window.history.length > 1) {
//     window.history.back()
//   } else {
//     navigateTo('/levels')
//   }
// }

</script>

<template>
  <main class="max-w-xl mx-auto px-4 py-20 space-y-8 text-center">

    <!-- <div class="text-left">
      <button
        type="button"
        @click="goBack"
        class="text-sm text-black hover:underline"
      >
        ← Back
      </button>
    </div> -->

    <!-- <!-- <BackLink /> --> -->

    <h1 class="flex items-center justify-center gap-3 text-3xl text-black font-semibold">
      <Construction class="size-8" aria-hidden="true" />
      <span>Coming soon</span>
    </h1>

    <p class="text-gray-800">
      Sit tight, new cantonese content and features are on the way.
    </p>

    <p class="text-sm text-gray-600 pt-4">
      You can already explore some free content while we finish preparing and cooking up new features.
    </p>
  </main>
</template>
