<script setup lang="ts">
definePageMeta({ ssr: false })

import { normalizeLoginRedirectPath, useAuth } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { onMounted, ref } from 'vue'

const route = useRoute()
const router = useRouter()

const me = useMeStateV2()

const error = route.query.error as string | undefined
const description = route.query.error_description as string | undefined
const callbackError = ref<string | null>(null)

onMounted(async () => {
  if (error) {
    console.warn('Auth0 login error:', error, description)
    return
  }

  const auth = await useAuth()
  const client = auth.client

  if (!client) {
    console.error('Auth0 client not initialised')
    callbackError.value = 'Auth0 client not initialised'
    return
  }

  try {
    const redirectResult = await client.handleRedirectCallback()

    const token = await auth.getAccessToken()
    const user = await client.getUser()

    await $fetch('/api/auth/post-login', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: {
        email: user?.email,
      },
    })

    await me.resolve({ force: true })

    const targetUrl = normalizeLoginRedirectPath(redirectResult.appState?.targetUrl)
    await router.replace(targetUrl)
  } catch (e) {
    console.error('Login callback failed:', e)
    callbackError.value = e instanceof Error ? e.message : 'Login callback failed'
  }
  
})
</script>
<template>
  <main class="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
    <template v-if="error">
      <h1 class="text-2xl font-semibold">
        Sign-in unavailable
      </h1>

      <p class="text-gray-600">
        {{ description || 'This application is currently private.' }}
      </p>

      <NuxtLink to="/" class="inline-block mt-4 text-blue-600 hover:underline">
        Return to home
      </NuxtLink>
    </template>

    <template v-else-if="callbackError">
      <h1 class="text-2xl font-semibold">
        Sign-in failed
      </h1>

      <p class="text-gray-600">
        {{ callbackError }}
      </p>

      <NuxtLink to="/" class="inline-block mt-4 text-blue-600 hover:underline">
        Return to home
      </NuxtLink>
    </template>

    <template v-else>
      <p class="text-gray-700">
        Signing you in…
      </p>
    </template>
  </main>
</template>