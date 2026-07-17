<script setup lang="ts">
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { HeartHandshake, Menu, ShieldCheck, Sparkles, X } from '@lucide/vue'

const { entitlement, resolve } = useMeStateV2()

const mobileOpen = ref(false)

function toggleMobile() {
  mobileOpen.value = !mobileOpen.value
}

function closeMobile() {
  mobileOpen.value = false
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

        <NuxtLink to="/coming-soon" class="nav-link hover:text-gray-600">
          Matches
        </NuxtLink>

        <NuxtLink to="/coming-soon" class="nav-link hover:text-gray-600">
          <span class="inline-flex items-center gap-1.5">
            <HeartHandshake class="size-4" aria-hidden="true" />Browse
          </span>
        </NuxtLink>
        <NuxtLink to="/coming-soon" class="nav-link hover:text-gray-600">
          <span class="inline-flex items-center gap-1.5">
            <Sparkles class="size-4" aria-hidden="true" />Activities
          </span>
        </NuxtLink>
        <NuxtLink to="/coming-soon" class="nav-link hover:text-gray-600">
          <span class="inline-flex items-center gap-1.5">
            <ShieldCheck class="size-4" aria-hidden="true" />Safety
          </span>
        </NuxtLink>

        <!-- Logged In Desktop -->
        <template>
          <NuxtLink v-if="entitlement?.plan === 'free' || entitlement?.subscription_status !== 'active'" to="/upgrade"
            class="font-medium text-[#B4234A] transition hover:text-[#8F1839]">
            Plus
          </NuxtLink>

          <NuxtLink to="/account/v2" class="nav-link hover:text-gray-600">
            Account
          </NuxtLink>
        </template>

      </nav>

      <!-- Mobile Hamburger -->
      <button type="button" class="md:hidden relative z-50 inline-flex h-10 w-10 shrink-0 items-center justify-center"
        @click="toggleMobile" aria-label="Toggle menu" :aria-expanded="mobileOpen ? 'true' : 'false'">
        <X v-if="mobileOpen" class="h-6 w-6" aria-hidden="true" />
        <Menu v-else class="h-6 w-6" aria-hidden="true" />
      </button>

    </div>

    <!-- Mobile Menu -->
    <div v-if="mobileOpen" class="md:hidden border-t bg-white px-4 py-5 divide-gray-200">

      <!-- Primary Links -->
      <div class="space-y-4 py-4">

        <NuxtLink to="/coming-soon" class="mobile-primary block" @click="closeMobile">
          Matches
        </NuxtLink>

        <NuxtLink to="/coming-soon" class="mobile-primary block" @click="closeMobile">
          Browse
        </NuxtLink>

        <NuxtLink to="/coming-soon" class="mobile-primary block" @click="closeMobile">
          Activities
        </NuxtLink>

        <NuxtLink to="/coming-soon" class="mobile-primary block" @click="closeMobile">
          Safety
        </NuxtLink>

      </div>

      <!-- Account Section -->
      <div class="space-y-4 py-4">

        <template>
          <NuxtLink v-if="entitlement?.plan === 'free' || entitlement?.subscription_status !== 'active'" to="/upgrade"
            class="mobile-secondary block font-medium text-[#B4234A] transition hover:text-[#8F1839]"
            @click="closeMobile">
            Plus
          </NuxtLink>

          <NuxtLink to="/account/v2" class="mobile-secondary block" @click="closeMobile">
            Account
          </NuxtLink>
        </template>

      </div>

    </div>

  </header>
</template>

<style></style>
