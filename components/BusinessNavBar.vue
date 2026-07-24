<script setup lang="ts">
import { BadgePercent, Building2, CreditCard, LayoutDashboard, LogOut, UserRoundCog } from '@lucide/vue'
import { logout } from '~/composables/useAuth'

const route = useRoute()
const links = [
  { to:'/business',label:'Dashboard',icon:LayoutDashboard },
  { to:'/business/offers',label:'Offers',icon:BadgePercent },
  { to:'/business/pricing',label:'Plans',icon:CreditCard },
  { to:'/business/account',label:'Account',icon:UserRoundCog },
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-[#E8D8C4] bg-white/95 backdrop-blur">
    <div class="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <NuxtLink to="/business" class="inline-flex items-center gap-2 text-lg font-bold text-[#2A1520]"><span class="flex size-9 items-center justify-center rounded-lg bg-[#FCE3E8]"><Building2 class="size-5 text-[#B4234A]" /></span>Lonely Radish <span class="font-medium text-[#6E4D58]">Business</span></NuxtLink>
      <div class="flex items-center gap-1 overflow-x-auto">
        <nav class="flex items-center gap-1" aria-label="Business navigation"><NuxtLink v-for="link in links" :key="link.to" :to="link.to" class="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition" :class="route.path === link.to ? 'bg-[#FCE3E8] text-[#8F1839]' : 'text-[#4D2F39] hover:bg-[#F3E8DA]'"><component :is="link.icon" class="size-4" />{{ link.label }}</NuxtLink></nav>
        <button type="button" class="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-[#8F1839] hover:bg-[#FCE3E8]" @click="logout"><LogOut class="size-4" />Sign out</button>
      </div>
    </div>
  </header>
</template>
