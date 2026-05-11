<script setup lang="ts">
import { login } from '@/composables/useAuth'
import { ArrowRight, LogIn } from '@lucide/vue';

definePageMeta({
  title: 'Please sign in · TaroTea'
})

const route = useRoute()

async function startLogin() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : undefined
  await login(redirect || '/')
}

</script>


<template>
  <main class="max-w-xl mx-auto px-6 py-20 text-center space-y-10">

    <!-- Title -->
    <div class="space-y-8">
      <h1 class="inline-flex items-center justify-center gap-3 text-3xl font-semibold">
        <LogIn class="h-7 w-7 text-[#D6A3D1]" aria-hidden="true" />
        <span>Please sign in</span>
      </h1>
    </div>

    <!-- CTA -->
    <div class="pt-2">
      <button type="button"
        class="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition hover:-translate-y-0.5"
        style="background-color:rgba(88,199,95,0.45)" @click="startLogin">
        <span>Sign in / Create account</span>
        <ArrowRight class="h-4 w-4" aria-hidden="true" />
      </button>

      <p class="text-gray-600 text-sm mt-10 max-w-md mx-auto">
        Sign in to view this content and continue your journey.
      </p>

      <p class="text-gray-600 text-sm mt-4 max-w-md mx-auto">
        If you are struggling to sign in please try clearing cookies and refreshing the page
      </p>
    </div>



  </main>
</template>
