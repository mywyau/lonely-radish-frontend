<script setup lang="ts">

import { NuxtLink } from '#components';
import { masteryXp } from '@/config/xp/helpers';;
import { CheckCircle2 } from '@lucide/vue';

const props = defineProps<{
  to?: string
  word: string
  jyutping: string
  meaning: string
  xp?: number
  mastered?: boolean
}>()

const rippleClass = 'is-ripple-neighbor'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function getTileHash() {
  const seed = `${props.word}-${props.jyutping}-${props.meaning}`
  let hash = 0

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }

  return hash
}

function getTileGrid(tile: HTMLElement) {
  const tileShell = tile.closest('.tile-shell')

  return tileShell?.parentElement ?? tile.parentElement
}

function clearNeighborRipple(tile: HTMLElement) {
  const grid = getTileGrid(tile)

  grid?.querySelectorAll<HTMLElement>(`.word-tile.${rippleClass}`).forEach((neighborTile) => {
    neighborTile.classList.remove(rippleClass)
    neighborTile.style.removeProperty('--tile-ripple-x')
    neighborTile.style.removeProperty('--tile-ripple-y')
    neighborTile.style.removeProperty('--tile-ripple-rotate')
    neighborTile.style.removeProperty('--tile-ripple-delay')
  })
}

function rippleNeighborTiles(tile: HTMLElement) {
  const grid = getTileGrid(tile)
  if (!grid) return

  const tileRect = tile.getBoundingClientRect()
  const tileCenterX = tileRect.left + tileRect.width / 2
  const tileCenterY = tileRect.top + tileRect.height / 2
  const rippleDistance = Math.max(tileRect.width * 2.6, 210)

  grid.querySelectorAll<HTMLElement>('.word-tile').forEach((neighborTile) => {
    if (neighborTile === tile) return

    const neighborRect = neighborTile.getBoundingClientRect()
    const neighborCenterX = neighborRect.left + neighborRect.width / 2
    const neighborCenterY = neighborRect.top + neighborRect.height / 2
    const deltaX = neighborCenterX - tileCenterX
    const deltaY = neighborCenterY - tileCenterY
    const distance = Math.hypot(deltaX, deltaY)

    if (distance > rippleDistance) return

    const influence = 1 - distance / rippleDistance
    const angle = Math.atan2(deltaY, deltaX)
    const rippleX = Math.cos(angle) * influence * 14
    const rippleY = Math.sin(angle) * influence * 12 - influence * 3
    const rippleRotate = Math.sign(deltaX || 1) * influence * 5
    const rippleDelay = Math.round((distance / rippleDistance) * 90)

    neighborTile.style.setProperty('--tile-ripple-x', `${rippleX}px`)
    neighborTile.style.setProperty('--tile-ripple-y', `${rippleY}px`)
    neighborTile.style.setProperty('--tile-ripple-rotate', `${rippleRotate}deg`)
    neighborTile.style.setProperty('--tile-ripple-delay', `${rippleDelay}ms`)
    neighborTile.classList.add(rippleClass)
  })
}

function resetTileMovement(event: Event) {
  const tile = event.currentTarget as HTMLElement

  tile.style.setProperty('--tile-x', '0px')
  tile.style.setProperty('--tile-y', '0px')
  tile.style.setProperty('--tile-lift', '0px')
  tile.style.setProperty('--tile-rotate', '0deg')
  tile.style.setProperty('--tile-scale', '1')
  clearNeighborRipple(tile)
}

function startTileMovement(event: PointerEvent) {
  if (prefersReducedMotion()) return

  const tile = event.currentTarget as HTMLElement
  const hash = getTileHash()
  const rotateDirection = hash % 2 === 0 ? 1 : -1
  const rotate = rotateDirection * (2 + (hash % 3))

  clearNeighborRipple(tile)
  tile.style.setProperty('--tile-lift', '-10px')
  tile.style.setProperty('--tile-rotate', `${rotate}deg`)
  tile.style.setProperty('--tile-scale', '1.045')
  rippleNeighborTiles(tile)
  moveTileWithPointer(event)
}

function moveTileWithPointer(event: PointerEvent) {
  if (prefersReducedMotion()) return

  const tile = event.currentTarget as HTMLElement
  const rect = tile.getBoundingClientRect()
  const pointerX = (event.clientX - rect.left) / rect.width - 0.5
  const pointerY = (event.clientY - rect.top) / rect.height - 0.5
  const maxShiftX = 10
  const maxShiftY = 7

  tile.style.setProperty('--tile-x', `${pointerX * maxShiftX}px`)
  tile.style.setProperty('--tile-y', `${pointerY * maxShiftY}px`)
}

</script>

<template>
  <component :is="to ? NuxtLink : 'div'" :to="to" class="relative word-tile hover:brightness-110"
    @pointerenter="startTileMovement" @pointermove="moveTileWithPointer" @pointerleave="resetTileMovement"
    @pointercancel="resetTileMovement" @blur="resetTileMovement">
    <!-- Mastered badge -->
    <div v-if="mastered" class="absolute top-2 right-2 text-emerald-600" aria-label="Mastered">
      <CheckCircle2 class="h-4 w-4" aria-hidden="true" />
    </div>

    <div class="text-xl text-center">
      {{ word }}
    </div>

    <div class="text-sm text-black text-center">
      {{ jyutping }}
    </div>

    <div class="text-xs text-black text-center">
      {{ meaning }}
    </div>

    <div class="mt-5 space-y-1">
      <div class="text-[11px] text-black text-center">
        {{ xp ?? 0 }} XP
      </div>

      <div class="w-full h-1 bg-gray-400 rounded">
        <div class="h-1 bg-green-500 rounded transition-all duration-500"
          :style="{ width: Math.min((xp ?? 0) / masteryXp * 100, 100) + '%' }" />
      </div>
    </div>
  </component>
</template>

<style scoped>
.progress-bar {
  background: linear-gradient(90deg,
      #D6A3D1,
      #EAB8E4);
}

.word-tile {
  border-radius: 14px;
  padding: 1.2rem;
  text-align: center;
  backdrop-filter: blur(6px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
  --tile-x: 0px;
  --tile-y: 0px;
  --tile-lift: 0px;
  --tile-rotate: 0deg;
  --tile-scale: 1;
  --tile-ripple-x: 0px;
  --tile-ripple-y: 0px;
  --tile-ripple-rotate: 0deg;
  --tile-ripple-delay: 0ms;

  transform:
    translate3d(
      calc(var(--tile-ripple-x) + var(--tile-x)),
      calc(var(--tile-ripple-y) + var(--tile-y) + var(--tile-lift)),
      0
    )
    rotate(calc(var(--tile-ripple-rotate) + var(--tile-rotate)))
    scale(var(--tile-scale));
  transform-origin: center;
  will-change: transform;
  transition:
    transform 0.58s cubic-bezier(0.18, 0.89, 0.32, 1.28),
    box-shadow 0.24s ease,
    filter 0.24s ease;
  transition-delay: var(--tile-ripple-delay), 0ms, 0ms;
}

.word-tile:hover {
  box-shadow: 0 22px 44px rgba(0, 0, 0, 0.14);
}

.word-tile.is-ripple-neighbor {
  filter: brightness(1.03);
}

.word-tile:active {
  transform:
    translate3d(
      calc(var(--tile-ripple-x) + var(--tile-x)),
      calc(var(--tile-ripple-y) + var(--tile-y) + var(--tile-lift)),
      0
    )
    rotate(calc(var(--tile-ripple-rotate) + var(--tile-rotate)))
    scale(0.98);
}

@media (prefers-reduced-motion: reduce) {
  .word-tile {
    transform: none;
    transition:
      box-shadow 0.2s ease,
      filter 0.2s ease;
  }
}
</style>
