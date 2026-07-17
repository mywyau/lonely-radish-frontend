<script setup lang="ts">
import { loginWithGoogle, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { Coffee, HeartHandshake, Menu, ShieldCheck, X } from '@lucide/vue'

const { isLoggedIn, entitlement, resolve } = useMeStateV2()

const mobileOpen = ref(false)

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

function closeMobile() {
  mobileOpen.value = false
}

async function handleLogout() {
  await logout()
  await resolve({ force: true })
  closeMobile()
}

onMounted(() => {
  resolve()
})
</script>

<template>
  <header class="border-b bg-white shadow-sm">

    <!-- Top Bar -->
    <div class="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">

      <!-- Logo -->
      <NuxtLink to="/" class="text-2xl font-bold text-primary-600 hover:text-gray-600">
        Lonely Radish
      </NuxtLink>

      <!-- Desktop Navigation -->
      <nav class="hidden md:flex items-center gap-6">

        <NuxtLink v-if="isLoggedIn" to="/coming-soon" class="nav-link hover:text-gray-600">
          Matches
        </NuxtLink>

        <NuxtLink to="/coming-soon" class="nav-link hover:text-gray-600">
          <span class="inline-flex items-center gap-1.5"><HeartHandshake class="size-4" aria-hidden="true" />Browse</span>
        </NuxtLink>
        <NuxtLink to="/coming-soon" class="nav-link hover:text-gray-600">
          <span class="inline-flex items-center gap-1.5"><Coffee class="size-4" aria-hidden="true" />Coffee Dates</span>
        </NuxtLink>
        <NuxtLink to="/coming-soon" class="nav-link hover:text-gray-600">
          <span class="inline-flex items-center gap-1.5"><ShieldCheck class="size-4" aria-hidden="true" />Safety</span>
        </NuxtLink>

        <!-- Logged In Desktop -->
        <template v-if="isLoggedIn">

          <NuxtLink v-if="entitlement?.plan === 'free' || entitlement?.subscription_status !== 'active'" to="/upgrade"
            class="font-medium bg-clip-text text-transparent
                   bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500
                   hover:from-pink-700 hover:via-purple-700 hover:to-indigo-700
                   transition hover:scale-105 hover:saturate-150">
            Plus
          </NuxtLink>

          <NuxtLink to="/stats" class="nav-link hover:text-gray-600">
            Stats
          </NuxtLink>

          <NuxtLink to="/account" class="nav-link hover:text-gray-600">
            Account
          </NuxtLink>

          <button type="button" class="text-red-600 hover:text-red-400" @click="handleLogout">
            Log out
          </button>
        </template>

        <!-- Logged Out Desktop -->
        <button v-else type="button" class="text-blue-600 hover:text-blue-400" @click="loginWithGoogle">
          Login
        </button>

      </nav>

      <!-- Mobile Hamburger -->
      <button type="button" class="md:hidden relative z-50 inline-flex h-10 w-10 shrink-0 items-center justify-center" @click="toggleMobile"
        aria-label="Toggle menu" :aria-expanded="mobileOpen ? 'true' : 'false'">
        <X v-if="mobileOpen" class="h-6 w-6" aria-hidden="true" />
        <Menu v-else class="h-6 w-6" aria-hidden="true" />
      </button>

    </div>

    <!-- Mobile Menu -->
    <div v-if="mobileOpen" class="md:hidden border-t bg-white px-4 py-5 divide-gray-200">

      <!-- Primary Links -->
      <div class="space-y-4 py-4">

          <NuxtLink v-if="isLoggedIn" to="/coming-soon" class="mobile-primary block" @click="closeMobile">
          Matches
        </NuxtLink>

        <NuxtLink to="/coming-soon" class="mobile-primary block" @click="closeMobile">
          Browse
        </NuxtLink>

        <NuxtLink to="/coming-soon" class="mobile-primary block" @click="closeMobile">
          Coffee Dates
        </NuxtLink>

        <NuxtLink to="/coming-soon" class="mobile-primary block" @click="closeMobile">
          Safety
        </NuxtLink>

      </div>

      <!-- Account Section -->
      <div class="space-y-4 py-4">

        <template v-if="isLoggedIn">

          <NuxtLink v-if="entitlement?.plan === 'free' || entitlement?.subscription_status !== 'active'" to="/upgrade"
            class="mobile-secondary font-medium block bg-clip-text text-transparent
               bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600
               hover:from-pink-700 hover:via-purple-700 hover:to-indigo-700
               transition hover:scale-105 hover:saturate-150" @click="closeMobile">
            Plus
          </NuxtLink>

          <NuxtLink to="/stats" class="mobile-primary block" @click="closeMobile">
            Stats
          </NuxtLink>

          <NuxtLink to="/account" class="mobile-secondary block" @click="closeMobile">
            Account
          </NuxtLink>

          <button type="button" class="mobile-danger text-red-600 hover:text-red-400 block text-left w-full"
            @click="handleLogout">
            Log out
          </button>

        </template>

        <template v-else>
          <button type="button" class="mobile-secondary text-blue-600 hover:text-blue-400 block text-left w-full"
            @click="loginWithGoogle">
            Login
          </button>
        </template>

      </div>

    </div>

  </header>
</template>

<style>


</style>
