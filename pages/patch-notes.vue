<script setup lang="ts">
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/vue'
import { patchNotes } from '@/utils/patchNotes'
import { computed, watchEffect } from 'vue'

definePageMeta({
  title: 'What’s new · TaroTea'
})

const route = useRoute()
const router = useRouter()

const NOTES_PER_PAGE = 5
const MAX_VISIBLE_PAGES = 3

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(patchNotes.length / NOTES_PER_PAGE))
})

const currentPage = computed(() => {
  const raw = Number(route.query.page ?? 1)

  if (!Number.isFinite(raw)) return 1

  return Math.min(Math.max(1, Math.floor(raw)), totalPages.value)
})

const paginatedNotes = computed(() => {
  const start = (currentPage.value - 1) * NOTES_PER_PAGE
  const end = start + NOTES_PER_PAGE
  return patchNotes.slice(start, end)
})

const visiblePages = computed(() => {
  const total = totalPages.value
  const current = currentPage.value

  if (total <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  let start = current
  let end = current + MAX_VISIBLE_PAGES - 1

  if (end > total) {
    end = total
    start = total - MAX_VISIBLE_PAGES + 1
  }

  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

const showFirstButton = computed(() => {
  return visiblePages.value.length > 0 && visiblePages.value[0] > 1
})

const showLastButton = computed(() => {
  return (
    visiblePages.value.length > 0 &&
    visiblePages.value[visiblePages.value.length - 1] < totalPages.value
  )
})

async function goToPage(page: number) {
  const safePage = Math.min(Math.max(1, page), totalPages.value)

  await router.replace({
    query: {
      ...route.query,
      page: safePage === 1 ? undefined : String(safePage)
    }
  })

  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

watchEffect(() => {
  const raw = Number(route.query.page ?? 1)

  if (!Number.isFinite(raw) || raw < 1 || raw > totalPages.value) {
    router.replace({
      query: {
        ...route.query,
        page: currentPage.value === 1 ? undefined : String(currentPage.value)
      }
    })
  }
})
</script>

<template>
  <main class="max-w-2xl mx-auto px-4 py-16 space-y-12">

    <!-- <!-- <BackLink /> --> -->

    <header class="space-y-3 text-center">
      <h1 class="text-3xl font-semibold">
        Patch Notes
      </h1>

      <p class="text-gray-600">
        Improvements, features and updates
      </p>
    </header>

    <section v-for="note in paginatedNotes" :key="`${note.date}-${note.title ?? ''}`" class="space-y-4">
      <div class="flex items-center gap-3">
        <h2 class="text-lg font-semibold">
          {{ note.date }}
        </h2>

        <span v-if="note.title" class="text-sm text-gray-500">
          — {{ note.title }}
        </span>
      </div>

      <ul class="list-disc list-inside space-y-2 text-gray-700">
        <li v-for="item in note.items" :key="item">
          {{ item }}
        </li>
      </ul>
    </section>

    <nav v-if="totalPages > 1" class="pagination-wrapper flex flex-col items-center gap-3 pt-8"
      aria-label="Patch notes pagination">
      <div class="flex justify-center items-center gap-1.5 sm:gap-3">
        <button v-if="showFirstButton" @click="goToPage(1)" :disabled="currentPage === 1" class="pagination-jump"
          aria-label="First page">
          <ChevronsLeft class="h-4 w-4" aria-hidden="true" />
        </button>

        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="pagination-arrow"
          aria-label="Previous page">
          <ChevronLeft class="h-4 w-4" aria-hidden="true" />
        </button>

        <button v-for="page in visiblePages" :key="page" @click="goToPage(page)" class="pagination-page"
          :class="{ 'is-active': page === currentPage }">
          {{ page }}
        </button>

        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="pagination-arrow"
          aria-label="Next page">
          <ChevronRight class="h-4 w-4" aria-hidden="true" />
        </button>

        <button v-if="showLastButton" @click="goToPage(totalPages)" :disabled="currentPage === totalPages"
          class="pagination-jump" aria-label="Last page">
          <ChevronsRight class="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <p class="text-xs text-gray-500">
        Page {{ currentPage }} of {{ totalPages }}
      </p>
    </nav>

  </main>
</template>

<style scoped>
.pagination-page,
.pagination-arrow,
.pagination-jump {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.pagination-page {
  min-width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.8rem;
  background-color: #F6E1E1;
  color: #3A2A2A;
  transition: all 0.18s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.pagination-page:hover:not(.is-active) {
  background-color: #EAB8E4;
  transform: translateY(-1px);
}

.pagination-page.is-active {
  background-color: #D6A3D1;
  color: #000;
  box-shadow: 0 6px 16px rgba(214, 163, 209, 0.35);
  transform: translateY(-1px);
}

.pagination-arrow svg,
.pagination-jump svg {
  display: block;
}

.pagination-arrow {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-weight: 600;
  background-color: rgba(244, 205, 39, 0.35);
  color: #3A2A2A;
  transition: all 0.18s ease;
}

.pagination-arrow:hover:not(:disabled) {
  background-color: rgba(244, 205, 39, 0.55);
  transform: translateY(-1px);
}

.pagination-arrow:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-jump {
  min-width: 48px;
  height: 32px;
  padding: 0 10px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.75rem;
  background-color: rgba(168, 202, 224, 0.45);
  color: #3A2A2A;
  transition: all 0.18s ease;
}

.pagination-jump:hover:not(:disabled) {
  background-color: rgba(168, 202, 224, 0.65);
  transform: translateY(-1px);
}

.pagination-jump:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

@media (min-width: 640px) {
  .pagination-wrapper {
    padding: 12px 16px;
  }

  .pagination-page {
    min-width: 38px;
    height: 38px;
    border-radius: 12px;
    font-size: 0.9rem;
  }

  .pagination-arrow {
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }

  .pagination-jump {
    min-width: 58px;
    height: 38px;
    border-radius: 12px;
    font-size: 0.85rem;
  }
}
</style>
