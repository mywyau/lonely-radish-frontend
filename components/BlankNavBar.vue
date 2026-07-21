<script setup lang="ts">
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { Bell, HeartHandshake, History, House, Menu, Send, ShieldCheck, Sparkles, X } from '@lucide/vue'
import { login, logout, signup } from '@/composables/useAuth'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const { user, isLoggedIn, resolve } = useMeStateV2()
const { profile: accountProfile, loadProfile } = useMockProfile()

const accountLabel = computed(() => user.value?.firstName || accountProfile.value.firstName.trim() || 'Account')
const route = useRoute()

const menuOpen = ref(false)
const navOpen = ref(false)
const unreadCount = ref(0)
const matchCount = ref(0)
const menuRoot = ref<HTMLElement | null>(null)

const navLinks = computed(() => {
  const links = [
    { to: '/', label: 'Home', icon: House },
    { to: '/activities', label: 'Discover date ideas', icon: Sparkles },
    { to: '/matches', label: 'Matches & plans', icon: HeartHandshake },
    { to: '/matches/past', label: 'Past connections', icon: History },
    { to: '/interests/sent', label: 'Sent interests', icon: Send },
    { to: '/interests/received', label: 'Received interests', icon: HeartHandshake },
    { to: '/notifications', label: unreadCount.value ? `Notifications (${unreadCount.value})` : 'Notifications', icon: Bell },
    { to: '/account/blocked', label: 'Safety & blocked users', icon: ShieldCheck },
  ]

  return links
})

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}
async function handleLogout() {
  closeMenu()
  await logout()
}

function toggleNav() {
  navOpen.value = !navOpen.value
}
function closeNav() {
  navOpen.value = false
}
function onDocumentClick(e: MouseEvent) {
  const target = e.target as Node | null
  if (menuOpen.value && menuRoot.value && target && !menuRoot.value.contains(target)) {
    closeMenu()
  }
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  closeMenu()
  closeNav()
}

async function loadNavigationCounts() {
  if (!isLoggedIn.value) return
  try {
    const counts = await $fetch<{ matchCount: number; unreadNotificationCount: number }>('/api/navigation/counts')
    matchCount.value = counts.matchCount
    unreadCount.value = counts.unreadNotificationCount
  } catch { /* Navigation remains usable when counts are temporarily unavailable. */ }
}

onMounted(async () => {
  loadProfile()
  await resolve()
  await loadNavigationCounts()
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})

watch(() => route.fullPath, () => { void loadNavigationCounts() })

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})

</script>

<template>
  <header class="header-shell sticky top-0 z-40">
    <div class="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">

      <NuxtLink to="/" class="brand-logo text-2xl font-bold text-black hover:text-gray-600">
        Lonely Radish
      </NuxtLink>

      <div class="flex items-center gap-1">
        <NuxtLink v-if="isLoggedIn" to="/matches" class="nav-count-link" :aria-label="`${matchCount} active ${matchCount === 1 ? 'match' : 'matches'}`" title="Active matches">
          <HeartHandshake class="size-5" aria-hidden="true" />
          <span class="nav-count-badge">{{ matchCount > 99 ? '99+' : matchCount }}</span>
        </NuxtLink>
        <NuxtLink v-if="isLoggedIn" to="/notifications" class="nav-count-link" :aria-label="`${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}`" title="New notifications">
          <Bell class="size-5" aria-hidden="true" />
          <span class="nav-count-badge" :class="unreadCount > 0 && 'nav-count-badge-active'">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </NuxtLink>

        <div ref="menuRoot" class="relative">

        <button type="button" class="menu-btn" @click.stop="toggleMenu" aria-label="Open account menu"
          :aria-expanded="menuOpen ? 'true' : 'false'">
          <X v-if="menuOpen" class="h-5 w-5 text-black hover:text-gray-600" aria-hidden="true" />
          <Menu v-else class="h-5 w-5 text-black hover:text-gray-600" aria-hidden="true" />
        </button>

        <div v-if="menuOpen" class="menu-panel">
          <NuxtLink v-if="isLoggedIn" to="/account/v2"
            class="w-full flex items-center rounded-lg px-3 py-2 text-sm text-[#2A1520] hover:bg-[#F3E8DA] transition"
            @click="closeMenu">
            {{ accountLabel }}
          </NuxtLink>

          <NuxtLink v-if="isLoggedIn" to="/preferences"
            class="w-full flex items-center rounded-lg px-3 py-2 text-sm text-[#2A1520] hover:bg-[#F3E8DA] transition"
            @click="closeMenu">
            Match preferences
          </NuxtLink>

          <NuxtLink v-if="isLoggedIn" to="/photos"
            class="w-full flex items-center rounded-lg px-3 py-2 text-sm text-[#2A1520] hover:bg-[#F3E8DA] transition"
            @click="closeMenu">
            Profile photos
          </NuxtLink>

          <NuxtLink v-if="isLoggedIn" to="/account/blocked"
            class="w-full flex items-center rounded-lg px-3 py-2 text-sm text-[#2A1520] hover:bg-[#F3E8DA] transition"
            @click="closeMenu">
            Blocked users
          </NuxtLink>

          <NuxtLink v-if="isLoggedIn" to="/upgrade"
            class="w-full flex items-center rounded-lg px-3 py-2 text-sm font-semibold hover:bg-[#F3E8DA] transition"
            @click="closeMenu">

            <span class="text-[#B4234A]">Upgrade</span>
          </NuxtLink>
          <div v-if="isLoggedIn" class="my-2 h-px bg-[#E8D8C4]" />
          <button v-if="isLoggedIn" type="button" class="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#8F1839] hover:bg-[#FCE3E8]" @click="handleLogout">Log out</button>
          <template v-else>
            <button type="button" class="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-black hover:bg-[#F3E8DA]" @click="login(route.fullPath)">Log in</button>
            <button type="button" class="mt-1 w-full rounded-lg bg-[#B4234A] px-3 py-2 text-left text-sm font-semibold text-white" @click="signup(route.fullPath)">Create account</button>
          </template>
        </div>
      </div>
      </div>
    </div>

    <button type="button" class="trigger-visibility-btn" :class="{ 'is-open': navOpen }"
      :aria-label="navOpen ? 'Close navigation panel' : 'Open navigation panel'" :aria-expanded="navOpen ? 'true' : 'false'"
      aria-controls="app-navigation-panel" @click.stop="toggleNav">
      <span class="rocket-burst" aria-hidden="true"></span>
      <Sparkles class="portal-icon" aria-hidden="true" />
      <span class="sr-only">{{ navOpen ? 'Close navigation panel' : 'Open navigation panel' }}</span>
    </button>

    <transition name="fade">
      <div v-if="navOpen" class="drawer-overlay" />
    </transition>

    <transition name="slide-left">
      <aside v-if="navOpen" id="app-navigation-panel" class="nav-drawer" aria-label="Main navigation panel">
        <div class="px-4 py-4 border-b border-black/20">
          <span class="flex items-center gap-2 text-xl font-semibold text-[#2A1520]">
            <Sparkles class="h-5 w-5" aria-hidden="true" />
            Plan a date
          </span>
        </div>

        <nav class="px-3 py-4 space-y-1">
          <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to" class="drawer-link font-medium"
            :class="{ 'drawer-link-active': route.path === link.to }"
            :aria-current="route.path === link.to ? 'page' : undefined">
            <component :is="link.icon" class="drawer-link-icon" aria-hidden="true" />
            <span>{{ link.label }}</span>
          </NuxtLink>
        </nav>
      </aside>
    </transition>
  </header>
</template>

<style scoped>
.header-shell {
  z-index: 80;
  --radish-milk: #FBF7F1;
  --radish-ink: #2A1520;
  --radish-blush: #F3E8DA;
  --radish-leaf: #6E8B52;
  --radish-root: #B4234A;
}

.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 40px;
  font-size: 26px;
}

.menu-btn:active {
  transform: scale(0.98);
}

.nav-count-link { position: relative; display: inline-flex; height: 40px; width: 38px; align-items: center; justify-content: center; border-radius: .5rem; color: #2A1520; transition: background-color 150ms ease; }
.nav-count-link:hover { background: #F3E8DA; }
.nav-count-badge { position: absolute; right: 0; top: 0; min-width: 1.1rem; border-radius: 999px; background: #F3E8DA; padding: .08rem .25rem; text-align: center; font-size: .62rem; font-weight: 800; line-height: 1rem; color: #6E4D58; }
.nav-count-badge-active { background: #B4234A; color: white; }
@media (max-width: 359px) { .brand-logo { font-size: 1.25rem; } .nav-count-link { width: 34px; } }

.trigger-visibility-btn {
  position: fixed;
  left: 0.85rem;
  bottom: 0.85rem;
  z-index: 75;
  height: 3.3rem;
  width: 3.3rem;
  border-radius: 999px;
  background: transparent;
  backdrop-filter: none;
  /* box-shadow: 0 8px 18px rgba(0, 0, 0, 0.16); */
  overflow: visible;
  isolation: isolate;
  transition: transform 160ms ease;
}

.portal-icon {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 2.00rem;
  height: 2.00rem;
  color: #111111;
  stroke-width: 2.4;
  transform-origin: center;
  transition: transform 160ms ease;
  z-index: 1;
}

.trigger-visibility-btn::before {
  content: '';
  position: absolute;
  inset: 0.45rem;
  border-radius: inherit;
  background:
    radial-gradient(circle, rgba(252, 227, 232, 0.9), rgba(255, 246, 247, 0.28) 62%, transparent 70%);
  z-index: -2;
}

.trigger-visibility-btn:hover,
.trigger-visibility-btn.is-open {
  transform: scale(1.20);
  /* box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22); */
}

.trigger-visibility-btn:hover .portal-icon,
.trigger-visibility-btn.is-open .portal-icon {
  transform: translateY(-0.08rem);
}

.rocket-burst {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.28rem;
  height: 0.28rem;
  border-radius: 999px;
  background: transparent;
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.35);
  z-index: -1;
  box-shadow:
    -0.18rem -1.42rem 0 -0.03rem rgba(180, 35, 74, 0.95),
    0.58rem -1.18rem 0 -0.08rem rgba(110, 139, 82, 0.9),
    1.42rem -0.36rem 0 -0.05rem rgba(252, 227, 232, 0.92),
    1.28rem 0.84rem 0 -0.08rem rgba(143, 24, 57, 0.86),
    0.24rem 1.44rem 0 -0.04rem rgba(180, 35, 74, 0.92),
    -0.72rem 1.1rem 0 -0.08rem rgba(252, 227, 232, 0.9),
    -1.44rem 0.42rem 0 -0.05rem rgba(110, 139, 82, 0.9),
    -1.08rem -0.82rem 0 -0.1rem rgba(143, 24, 57, 0.86);
  pointer-events: none;
}

.rocket-burst::before,
.rocket-burst::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  background: transparent;
  transform: translate(-50%, -50%);
}

.rocket-burst::before {
  width: 0.2rem;
  height: 0.2rem;
  box-shadow:
    0.22rem -1.72rem 0 -0.04rem rgba(143, 24, 57, 0.84),
    1.52rem -0.96rem 0 -0.03rem rgba(180, 35, 74, 0.9),
    1.72rem 0.24rem 0 -0.06rem rgba(252, 227, 232, 0.86),
    0.78rem 1.58rem 0 -0.04rem rgba(110, 139, 82, 0.86),
    -0.32rem 1.78rem 0 -0.06rem rgba(180, 35, 74, 0.88),
    -1.56rem 0.92rem 0 -0.03rem rgba(143, 24, 57, 0.82),
    -1.72rem -0.28rem 0 -0.06rem rgba(252, 227, 232, 0.86),
    -0.84rem -1.44rem 0 -0.05rem rgba(110, 139, 82, 0.86);
}

.rocket-burst::after {
  width: 0.16rem;
  height: 0.16rem;
  background: transparent;
  box-shadow:
    0.96rem -1.68rem 0 -0.03rem rgba(252, 227, 232, 0.78),
    1.9rem -0.08rem 0 -0.04rem rgba(143, 24, 57, 0.84),
    1.22rem 1.22rem 0 -0.03rem rgba(180, 35, 74, 0.86),
    -0.04rem 2.02rem 0 -0.05rem rgba(252, 227, 232, 0.8),
    -1.18rem 1.42rem 0 -0.04rem rgba(110, 139, 82, 0.84),
    -1.92rem 0.04rem 0 -0.03rem rgba(180, 35, 74, 0.82),
    -1.34rem -1.16rem 0 -0.04rem rgba(252, 227, 232, 0.8),
    0.04rem -1.98rem 0 -0.05rem rgba(143, 24, 57, 0.82);
}

.trigger-visibility-btn:hover .rocket-burst,
.trigger-visibility-btn.is-open .rocket-burst {
  animation: lilacBurst 650ms ease-out both;
}


@media (min-width: 768px) {
  .trigger-visibility-btn {
    left: 1rem;
    bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
    height: 3.1rem;
    width: 3.1rem;
  }

  .trigger-visibility-btn:hover,
  .trigger-visibility-btn.is-open {
    transform: scale(1.12);
  }
}

.menu-panel {
  position: absolute;
  right: 0;
  margin-top: 10px;
  width: 220px;
  border-radius: 10px;
  /* border: 1px solid rgba(180, 35, 74, 0.14); */
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(10px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
  padding: 10px;
  z-index: 60;
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: none;
  background: rgba(42, 21, 32, 0.2);
}

.nav-drawer {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: min(20rem, 88vw);
  background-color: rgba(255, 246, 247, 0.94);
  backdrop-filter: blur(8px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.12);
}

.nav-drawer nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.drawer-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  border-radius: 0.75rem;
  padding: 0.65rem 0.75rem;
  font-size: 0.95rem;
  color: #2A1520;
  transition: background 120ms ease;
}

.drawer-link-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  color: rgba(180, 35, 74, 0.78);
  stroke-width: 2.15;
}

.drawer-link:hover {
  background: rgba(180, 35, 74, 0.1);
}

.drawer-link-active {
  background: rgba(252, 227, 232, 0.82);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.22s ease;
}

.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}

@keyframes lilacBurst {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.2);
  }

  35% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.12);
  }

  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.45);
  }
}

.brand-logo {
  display: inline-block;
  transform-origin: center bottom;
}

.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 40px;
  font-size: 26px;
  transform-origin: center;
  transition: transform 160ms ease;
}

/* .menu-btn:hover {
  animation: hamburgerWiggle 1.2s ease-in-out infinite;
} */

.menu-btn:active {
  transform: scale(0.98);
}

@keyframes hamburgerWiggle {

  0%,
  100% {
    transform: rotate(0deg);
  }

  15% {
    transform: rotate(-10deg);
  }

  30% {
    transform: rotate(8deg);
  }

  45% {
    transform: rotate(-6deg);
  }

  60% {
    transform: rotate(4deg);
  }

  75% {
    transform: rotate(-2deg);
  }
}

@media (prefers-reduced-motion: reduce) {

  .brand-logo:hover,
  .menu-btn:hover,
  .rocket-burst {
    animation: none;
  }
}
</style>
