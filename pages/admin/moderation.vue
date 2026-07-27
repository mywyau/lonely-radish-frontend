<script setup lang="ts">
import { AlertTriangle, Check, ChevronDown, Clock3, Search, ShieldAlert, UserRound, X } from '@lucide/vue'

definePageMeta({ title: 'Moderation · Lonely Radish', middleware: 'admin' })

type ReportStatus = 'active' | 'open' | 'reviewing' | 'resolved' | 'dismissed' | 'all'
type Decision = 'reviewing' | 'dismiss' | 'warning' | 'suspend_7_days' | 'suspend_30_days' | 'suspend_permanent' | 'restore'
type ReportItem = {
  id: string
  category: string
  details?: string | null
  status: string
  priority: number
  createdAt: string
  reviewedAt?: string | null
  reviewedBy?: string | null
  resolution?: string | null
  reporterId: string
  reporterEmail: string
  reporterName?: string | null
  reporterSlug?: string | null
  reportedId: string
  reportedEmail: string
  reportedName?: string | null
  reportedSlug?: string | null
  reportedRole: string
  reportedAccountStatus: string
  suspendedUntil?: string | null
  reporterBlockedUser: boolean
  previousReportCount: number
  reporterSubmissionCount: number
  recentReports: { id: string; category: string; status: string; priority: number; createdAt: string }[]
  relatedMatchId?: string | null
  relatedMatchStatus?: string | null
  relatedMatchEndedReason?: string | null
  relatedMatchEndedAt?: string | null
  relatedDateCount: number
  latestAction?: string | null
  latestActionNote?: string | null
  latestActionExpiresAt?: string | null
}

const reports = ref<ReportItem[]>([])
const counts = ref({ active: 0, open: 0, reviewing: 0, resolved: 0, dismissed: 0 })
const status = ref<ReportStatus>('active')
const category = ref('all')
const priority = ref('all')
const searchInput = ref('')
const loading = ref(true)
const loadingMore = ref(false)
const savingId = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const nextCursor = ref<string | null>(null)
const hasMore = ref(false)
const decisions = reactive<Record<string, Decision>>({})
const notes = reactive<Record<string, string>>({})
let filterTimer: ReturnType<typeof setTimeout> | undefined
let requestNumber = 0

const statusTabs: { value: ReportStatus; label: string; count: keyof typeof counts.value }[] = [
  { value: 'active', label: 'Active', count: 'active' },
  { value: 'resolved', label: 'Resolved', count: 'resolved' },
  { value: 'dismissed', label: 'No action', count: 'dismissed' },
]

function displayName(report: ReportItem, party: 'reporter' | 'reported') {
  return party === 'reporter'
    ? report.reporterName || report.reporterSlug || report.reporterEmail
    : report.reportedName || report.reportedSlug || report.reportedEmail
}

function formattedDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function priorityLabel(value: number) {
  return value === 1 ? 'Urgent' : value === 2 ? 'High' : value === 3 ? 'Normal' : `Priority ${value}`
}

function selectedDecision(report: ReportItem) {
  return decisions[report.id] || (report.status === 'open' ? 'reviewing' : 'dismiss')
}

async function loadReports(append = false) {
  const thisRequest = ++requestNumber
  if (append) loadingMore.value = true
  else loading.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{
      reports: ReportItem[]
      counts: typeof counts.value
      nextCursor: string | null
      hasMore: boolean
    }>('/api/admin/reports', {
      query: {
        status: status.value,
        category: category.value,
        priority: priority.value,
        ...(searchInput.value.trim() ? { q: searchInput.value.trim() } : {}),
        ...(append && nextCursor.value ? { cursor: nextCursor.value } : {}),
      },
    })
    if (thisRequest !== requestNumber) return
    reports.value = append ? [...reports.value, ...result.reports] : result.reports
    counts.value = result.counts
    nextCursor.value = result.nextCursor
    hasMore.value = result.hasMore
  } catch (error: any) {
    if (thisRequest === requestNumber) errorMessage.value = error?.data?.statusMessage || 'Moderation reports could not be loaded.'
  } finally {
    if (thisRequest === requestNumber) {
      loading.value = false
      loadingMore.value = false
    }
  }
}

function chooseStatus(value: ReportStatus) {
  status.value = value
}

function scheduleReload() {
  if (filterTimer) clearTimeout(filterTimer)
  filterTimer = setTimeout(() => void loadReports(), 300)
}

function clearFilters() {
  searchInput.value = ''
  category.value = 'all'
  priority.value = 'all'
  status.value = 'active'
}

async function applyDecision(report: ReportItem) {
  const decision = selectedDecision(report)
  const note = notes[report.id]?.trim() || ''
  if (decision !== 'reviewing' && note.length < 10) {
    errorMessage.value = 'Add a resolution note of at least 10 characters.'
    return
  }
  if (['suspend_7_days', 'suspend_30_days', 'suspend_permanent'].includes(decision)) {
    const label = decision === 'suspend_permanent' ? 'permanently suspend' : 'temporarily suspend'
    if (!window.confirm(`Are you sure you want to ${label} ${displayName(report, 'reported')}?`)) return
  }
  savingId.value = report.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    await $fetch(`/api/admin/reports/${report.id}`, {
      method: 'PATCH',
      body: { decision, note },
    })
    successMessage.value = 'Moderation decision saved and audited.'
    delete notes[report.id]
    delete decisions[report.id]
    await loadReports()
  } catch (error: any) {
    errorMessage.value = error?.data?.statusMessage || 'The moderation decision could not be saved.'
  } finally {
    savingId.value = ''
  }
}

watch([status, category, priority], () => {
  nextCursor.value = null
  void loadReports()
})
watch(searchInput, scheduleReload)
onMounted(() => loadReports())
onBeforeUnmount(() => {
  if (filterTimer) clearTimeout(filterTimer)
})
</script>

<template>
  <main class="min-h-screen bg-[#FBF7F1] px-4 py-10 text-[#2A1520] sm:px-8">
    <section class="mx-auto max-w-6xl">
      <p class="text-xs font-extrabold uppercase tracking-widest text-[#B4234A]">Administration</p>
      <h1 class="mt-2 text-4xl font-semibold">Safety moderation</h1>
      <p class="mt-3 max-w-3xl leading-7 text-[#6E4D58]">Review member reports, inspect relevant context, and record proportionate, auditable decisions.</p>

      <nav class="mt-7 flex gap-2 overflow-x-auto border-b border-[#E8D8C4]" aria-label="Moderation report status">
        <button
          v-for="tab in statusTabs"
          :key="tab.value"
          type="button"
          class="flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold"
          :class="status === tab.value ? 'border-[#B4234A] text-[#8F1839]' : 'border-transparent text-[#6E4D58]'"
          @click="chooseStatus(tab.value)"
        >
          {{ tab.label }} <span class="rounded-full bg-[#FCE3E8] px-2 py-0.5 text-xs text-[#8F1839]">{{ counts[tab.count] }}</span>
        </button>
      </nav>

      <section class="mt-5 rounded-lg bg-white p-4 shadow-[0_10px_24px_rgba(180,35,74,0.07)]" aria-label="Filter reports">
        <div class="grid gap-3 md:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr]">
          <label class="text-sm font-semibold">Search
            <span class="relative block"><Search class="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-[#6E4D58]" /><input v-model="searchInput" class="filter-field search-field" placeholder="Member, email or report details"></span>
          </label>
          <label class="text-sm font-semibold">Status
            <select v-model="status" class="filter-field"><option value="active">Open or reviewing</option><option value="open">Open</option><option value="reviewing">Reviewing</option><option value="resolved">Resolved</option><option value="dismissed">No action</option><option value="all">All</option></select>
          </label>
          <label class="text-sm font-semibold">Category
            <select v-model="category" class="filter-field"><option value="all">All categories</option><option value="safety">Safety</option><option value="harassment">Harassment</option><option value="impersonation">Impersonation</option><option value="spam">Spam</option><option value="other">Other</option></select>
          </label>
          <label class="text-sm font-semibold">Priority
            <select v-model="priority" class="filter-field"><option value="all">All priorities</option><option value="1">Urgent</option><option value="2">High</option><option value="3">Normal</option><option value="4">Priority 4</option><option value="5">Priority 5</option></select>
          </label>
        </div>
        <div class="mt-3 flex items-center justify-between gap-3"><p class="text-xs text-[#6E4D58]">{{ loading ? 'Updating reports…' : `${reports.length} report${reports.length === 1 ? '' : 's'} shown` }}</p><button v-if="searchInput || category !== 'all' || priority !== 'all' || status !== 'active'" type="button" class="inline-flex items-center gap-1 text-xs font-semibold text-[#8F1839]" @click="clearFilters"><X class="size-3.5" />Clear filters</button></div>
      </section>

      <p v-if="successMessage" class="mt-5 rounded-lg bg-[#EAF2DE] p-4 text-sm font-semibold text-[#52713A]" role="status">{{ successMessage }}</p>
      <p v-if="errorMessage" class="mt-5 rounded-lg bg-[#FCE3E8] p-4 text-sm font-semibold text-[#8F1839]" role="alert">{{ errorMessage }}</p>
      <div v-if="loading && !reports.length" class="mt-6 rounded-lg bg-white p-8 text-[#6E4D58]">Loading moderation reports…</div>

      <div v-else-if="reports.length" class="mt-6 grid gap-3">
        <details v-for="report in reports" :key="report.id" class="report-row rounded-lg bg-white shadow-[0_8px_20px_rgba(180,35,74,0.06)]">
          <summary class="cursor-pointer list-none p-4 sm:p-5">
            <div class="flex items-start gap-3">
              <AlertTriangle v-if="report.priority <= 2" class="mt-0.5 size-5 shrink-0 text-[#B4234A]" /><ShieldAlert v-else class="mt-0.5 size-5 shrink-0 text-[#8F1839]" />
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2"><h2 class="font-semibold sm:text-lg">{{ displayName(report, 'reported') }}</h2><span class="status-chip" :class="`priority-${report.priority}`">{{ priorityLabel(report.priority) }}</span><span class="status-chip bg-[#F3E8DA] text-[#6E4D58]">{{ report.category }}</span><span class="status-chip bg-[#FBF7F1] text-[#4D2F39]">{{ report.status }}</span></div>
                <p class="mt-1 text-sm text-[#6E4D58]">Reported by {{ displayName(report, 'reporter') }}</p>
                <p class="mt-1 flex flex-wrap gap-x-3 text-xs text-[#6E4D58]"><span class="inline-flex items-center gap-1"><Clock3 class="size-3.5" />{{ formattedDate(report.createdAt) }}</span><span>{{ report.previousReportCount }} previous report{{ report.previousReportCount === 1 ? '' : 's' }} against this member</span></p>
              </div>
              <ChevronDown class="mt-1 size-5 shrink-0 text-[#6E4D58]" />
            </div>
          </summary>

          <div class="border-t border-[#E8D8C4] p-4 sm:p-5">
            <section class="rounded-lg bg-[#FCE3E8] p-4"><h3 class="text-xs font-extrabold uppercase tracking-wide text-[#8F1839]">Report details</h3><p class="mt-2 whitespace-pre-wrap text-sm leading-6">{{ report.details || 'No additional details were supplied.' }}</p></section>
            <div class="mt-4 grid gap-4 md:grid-cols-2">
              <section class="rounded-lg border border-[#E8D8C4] p-4"><h3 class="flex items-center gap-2 font-semibold"><UserRound class="size-4 text-[#B4234A]" />Reported member</h3><dl class="mt-3 grid gap-2 text-sm"><div><dt>Name</dt><dd>{{ displayName(report, 'reported') }}</dd></div><div><dt>Email</dt><dd class="break-all">{{ report.reportedEmail }}</dd></div><div><dt>Account</dt><dd>{{ report.reportedRole }} · {{ report.reportedAccountStatus }}<span v-if="report.suspendedUntil"> until {{ formattedDate(report.suspendedUntil) }}</span></dd></div><div><dt>History</dt><dd>{{ report.previousReportCount }} previous reports</dd></div></dl></section>
              <section class="rounded-lg border border-[#E8D8C4] p-4"><h3 class="flex items-center gap-2 font-semibold"><UserRound class="size-4 text-[#6E4D58]" />Reporter</h3><dl class="mt-3 grid gap-2 text-sm"><div><dt>Name</dt><dd>{{ displayName(report, 'reporter') }}</dd></div><div><dt>Email</dt><dd class="break-all">{{ report.reporterEmail }}</dd></div><div><dt>Reporting history</dt><dd>{{ report.reporterSubmissionCount }} other submissions</dd></div><div><dt>Safety action</dt><dd>{{ report.reporterBlockedUser ? 'Reported member was also blocked' : 'No block recorded with this report' }}</dd></div></dl></section>
            </div>
            <section v-if="report.relatedMatchId" class="mt-4 rounded-lg bg-[#FBF7F1] p-4 text-sm"><h3 class="font-semibold">Related connection context</h3><p class="mt-2 text-[#6E4D58]">Match {{ report.relatedMatchStatus }}<span v-if="report.relatedMatchEndedReason"> · ended: {{ report.relatedMatchEndedReason }}</span> · {{ report.relatedDateCount }} date plan{{ report.relatedDateCount === 1 ? '' : 's' }}</p><p class="mt-1 break-all text-xs text-[#6E4D58]">Match ID: {{ report.relatedMatchId }}</p></section>
            <section v-if="report.recentReports.length" class="mt-4"><h3 class="font-semibold">Recent reports against this member</h3><ul class="mt-2 grid gap-2 text-sm"><li v-for="previous in report.recentReports" :key="previous.id" class="flex flex-wrap justify-between gap-2 rounded-lg bg-[#FBF7F1] p-3"><span class="capitalize">{{ previous.category }} · {{ priorityLabel(previous.priority) }}</span><span class="text-[#6E4D58]">{{ previous.status }} · {{ formattedDate(previous.createdAt) }}</span></li></ul></section>
            <p v-if="report.resolution" class="mt-4 rounded-lg bg-[#EAF2DE] p-4 text-sm"><span class="font-semibold">Resolution:</span> {{ report.resolution }}<span v-if="report.reviewedBy" class="block mt-1 text-xs text-[#52713A]">Reviewed by {{ report.reviewedBy }} on {{ formattedDate(report.reviewedAt) }}</span></p>

            <section class="mt-5 border-t border-[#E8D8C4] pt-5"><h3 class="font-semibold">Record a decision</h3><div class="mt-3 grid gap-3 md:grid-cols-[0.8fr_1.2fr]"><label class="text-sm font-semibold">Action<select v-model="decisions[report.id]" class="filter-field"><option value="reviewing">Mark as reviewing</option><option value="dismiss">Close — no action</option><option value="warning">Issue warning</option><option value="suspend_7_days">Suspend for 7 days</option><option value="suspend_30_days">Suspend for 30 days</option><option value="suspend_permanent">Suspend permanently</option><option v-if="report.reportedAccountStatus === 'suspended'" value="restore">Restore account</option></select></label><label class="text-sm font-semibold">Private resolution note<textarea v-model="notes[report.id]" maxlength="1000" rows="3" class="filter-field resize-none" placeholder="Required for final decisions; never shown to the reporter or reported member." /></label></div><div class="mt-3 flex items-center justify-between gap-3"><p class="text-xs text-[#6E4D58]">Every action records the administrator, timestamp and report.</p><button type="button" :disabled="savingId === report.id" class="inline-flex items-center gap-2 rounded-lg bg-[#B4234A] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" @click="applyDecision(report)"><Check class="size-4" />{{ savingId === report.id ? 'Saving…' : 'Save decision' }}</button></div></section>
          </div>
        </details>
      </div>
      <div v-else-if="!loading" class="mt-6 rounded-lg bg-white p-8 text-center"><ShieldAlert class="mx-auto size-8 text-[#B4234A]" /><h2 class="mt-3 text-xl font-semibold">No reports found</h2><p class="mt-2 text-sm text-[#6E4D58]">There are no reports matching the current filters.</p></div>
      <div v-if="hasMore" class="mt-6 text-center"><button type="button" :disabled="loadingMore" class="rounded-lg bg-[#4D2F39] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50" @click="loadReports(true)">{{ loadingMore ? 'Loading…' : 'Load more reports' }}</button></div>
    </section>
  </main>
</template>

<style scoped>
.filter-field { margin-top: .3rem; width: 100%; border-radius: .5rem; border: 1px solid #E8D8C4; background: #FBF7F1; padding: .7rem .8rem; font-size: .875rem; outline: none; }
.filter-field.search-field { padding-left: 2.5rem; }
.filter-field:focus { border-color: #B4234A; box-shadow: 0 0 0 3px rgba(180,35,74,.12); }
.report-row[open] > summary svg:last-child { transform: rotate(180deg); }
.report-row > summary svg:last-child { transition: transform .2s ease; }
.status-chip { border-radius: 9999px; padding: .2rem .55rem; font-size: .65rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; }
.priority-1 { background: #B4234A; color: white; }
.priority-2 { background: #FCE3E8; color: #8F1839; }
.priority-3 { background: #FFF3CD; color: #7A5600; }
.priority-4, .priority-5 { background: #F3E8DA; color: #6E4D58; }
dt { font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: #6E4D58; }
dd { margin-top: .1rem; }
</style>
