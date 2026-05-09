<script setup lang="ts">
import { login, logout } from '@/composables/useAuth'
import { useMeStateV2 } from '@/composables/useMeStateV2'
import { Menu, Rocket, X } from '@lucide/vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const { isLoggedIn, resolve } = useMeStateV2()
const route = useRoute()

const menuOpen = ref(false)
const navOpen = ref(false)
const menuRoot = ref<HTMLElement | null>(null)

const navLinks = computed(() => {
  const links = [
    { to: '/', label: 'Home', requiresAuth: false },
    { to: '/daily/vocab/v2/start-quiz', label: 'Daily Quiz', requiresAuth: true },
    { to: '/daily/jyutping/v2', label: 'Daily Jyutping Quiz', requiresAuth: true },
    { to: '/levels', label: 'Levels', requiresAuth: false },
    { to: '/quiz', label: 'Level Quiz', requiresAuth: false },
    { to: '/dojo/level', label: 'Level Dojo', requiresAuth: false },
    { to: '/topics', label: 'Topics', requiresAuth: false },
    { to: '/topics/quiz', label: 'Topic Quiz', requiresAuth: false },
    { to: '/dojo/topic', label: 'Topic Dojo', requiresAuth: false },
  ]

  return links.filter(link => !link.requiresAuth || isLoggedIn.value)
})

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
function closeMenu() {
  menuOpen.value = false
}

function toggleNav() {
  navOpen.value = !navOpen.value
}
function closeNav() {
  navOpen.value = false
}
async function handleLogout() {
  await logout()
  await resolve({ force: true })
  closeMenu()
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

onMounted(() => {
  resolve()
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onDocumentKeydown)
})

</script>

<template>
  <header class="header-shell sticky top-0 z-40">
    <div class="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">

      <NuxtLink to="/" class="brand-logo text-2xl font-bold text-black hover:text-gray-700">
        TaroTea
      </NuxtLink>

      <div ref="menuRoot" class="relative">

        <button type="button" class="menu-btn" @click.stop="toggleMenu" aria-label="Open account menu"
          :aria-expanded="menuOpen ? 'true' : 'false'">
          <X v-if="menuOpen" class="h-5 w-5" aria-hidden="true" />
          <Menu v-else class="h-5 w-5" aria-hidden="true" />
        </button>

        <div v-if="menuOpen" class="menu-panel">
          <template v-if="isLoggedIn">
            <NuxtLink to="/account/v2"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-black hover:bg-black/5 transition"
              @click="closeMenu">
              Account
            </NuxtLink>

            <NuxtLink to="/stats/v2"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-black hover:bg-black/5 transition"
              @click="closeMenu">
              Stats
            </NuxtLink>

            <NuxtLink to="/upgrade"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm font-semibold hover:bg-black hover:brightness-125 transition"
              @click="closeMenu">

              <span
                class="bg-gradient-to-r from-[#d48fd0] via-[#b57bc3] via-[#6faed6] to-[#d48fd0] bg-clip-text text-transparent">
                Upgrade
              </span>
            </NuxtLink>

            <div class="h-px my-2 bg-black/10"></div>

            <button type="button"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-red-700 hover:bg-red-500/10 transition"
              @click="handleLogout">
              Log out
            </button>
          </template>

          <template v-else>
            <button type="button"
              class="w-full flex items-center rounded-xl px-3 py-2 text-sm text-gray-900 hover:bg-black/5 transition"
              @click="login()">
              Login
            </button>
          </template>
        </div>
      </div>
    </div>

    <button type="button" class="trigger-visibility-btn" :class="{ 'is-open': navOpen }"
      :aria-label="navOpen ? 'Close Warp panel' : 'Open Warp panel'" :aria-expanded="navOpen ? 'true' : 'false'"
      aria-controls="warp-navigation-panel" @click.stop="toggleNav">
      <span class="rocket-burst" aria-hidden="true"></span>
      <Rocket class="portal-icon" aria-hidden="true" />
      <span class="sr-only">{{ navOpen ? 'Close Warp panel' : 'Open Warp panel' }}</span>
    </button>

    <transition name="fade">
      <div v-if="navOpen" class="drawer-overlay" />
    </transition>

    <transition name="slide-left">
      <aside v-if="navOpen" id="warp-navigation-panel" class="nav-drawer" aria-label="Main navigation panel">
        <div class="px-4 py-4 border-b border-black/20">
          <span class="flex items-center gap-2 text-xl font-semibold text-black">
            <Rocket class="h-5 w-5" aria-hidden="true" />
            Warp
          </span>
        </div>

        <nav class="px-3 py-4 space-y-1">
          <NuxtLink v-for="link in navLinks" :key="link.to" :to="link.to" class="drawer-link font-medium"
            :class="{ 'drawer-link-active': route.path === link.to }"
            :aria-current="route.path === link.to ? 'page' : undefined">
            {{ link.label }}
          </NuxtLink>
        </nav>
      </aside>
    </transition>
  </header>
</template>

<style scoped>
.header-shell {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
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
  color: rgba(15, 15, 15, 0.9);
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
    radial-gradient(circle, rgba(255, 255, 255, 0.82), rgba(255, 255, 255, 0.18) 62%, transparent 70%);
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
    -0.18rem -1.42rem 0 -0.03rem rgba(159, 91, 181, 0.95),
    0.58rem -1.18rem 0 -0.08rem rgba(133, 78, 161, 0.9),
    1.42rem -0.36rem 0 -0.05rem rgba(181, 123, 195, 0.92),
    1.28rem 0.84rem 0 -0.08rem rgba(115, 65, 150, 0.86),
    0.24rem 1.44rem 0 -0.04rem rgba(159, 91, 181, 0.92),
    -0.72rem 1.1rem 0 -0.08rem rgba(181, 123, 195, 0.9),
    -1.44rem 0.42rem 0 -0.05rem rgba(133, 78, 161, 0.9),
    -1.08rem -0.82rem 0 -0.1rem rgba(159, 91, 181, 0.86);
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
    0.22rem -1.72rem 0 -0.04rem rgba(115, 65, 150, 0.84),
    1.52rem -0.96rem 0 -0.03rem rgba(159, 91, 181, 0.9),
    1.72rem 0.24rem 0 -0.06rem rgba(181, 123, 195, 0.86),
    0.78rem 1.58rem 0 -0.04rem rgba(133, 78, 161, 0.86),
    -0.32rem 1.78rem 0 -0.06rem rgba(159, 91, 181, 0.88),
    -1.56rem 0.92rem 0 -0.03rem rgba(115, 65, 150, 0.82),
    -1.72rem -0.28rem 0 -0.06rem rgba(181, 123, 195, 0.86),
    -0.84rem -1.44rem 0 -0.05rem rgba(133, 78, 161, 0.86);
}

.rocket-burst::after {
  width: 0.16rem;
  height: 0.16rem;
  background: transparent;
  box-shadow:
    0.96rem -1.68rem 0 -0.03rem rgba(181, 123, 195, 0.78),
    1.9rem -0.08rem 0 -0.04rem rgba(115, 65, 150, 0.84),
    1.22rem 1.22rem 0 -0.03rem rgba(159, 91, 181, 0.86),
    -0.04rem 2.02rem 0 -0.05rem rgba(181, 123, 195, 0.8),
    -1.18rem 1.42rem 0 -0.04rem rgba(133, 78, 161, 0.84),
    -1.92rem 0.04rem 0 -0.03rem rgba(159, 91, 181, 0.82),
    -1.34rem -1.16rem 0 -0.04rem rgba(181, 123, 195, 0.8),
    0.04rem -1.98rem 0 -0.05rem rgba(115, 65, 150, 0.82);
}

.trigger-visibility-btn:hover .rocket-burst,
.trigger-visibility-btn.is-open .rocket-burst {
  animation: lilacBurst 650ms ease-out both;
}


@media (min-width: 768px) {
  .trigger-visibility-btn {
    left: 1rem;
    bottom: 1rem;
    height: 3.6rem;
    width: 3.6rem;
  }
}

.menu-panel {
  position: absolute;
  right: 0;
  margin-top: 10px;
  width: 220px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.82);
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
  background: rgba(246, 225, 225, 0.22);
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
  background-color: rgba(236, 224, 248, 0.86);
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
  border-radius: 0.75rem;
  padding: 0.65rem 0.75rem;
  font-size: 0.95rem;
  color: #111827;
  transition: background 120ms ease;
}

.drawer-link:hover {
  background: rgba(0, 0, 0, 0.06);
}

.drawer-link-active {
  background: rgba(255, 255, 255, 0.5);
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
  transition:
    color 160ms ease,
    transform 160ms ease;
  will-change: transform;
}

.brand-logo:hover {
  animation: hamburgerWiggle 1.2s ease-in-out infinite;
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

.menu-btn:hover {
  animation: hamburgerWiggle 1.2s ease-in-out infinite;
}

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
