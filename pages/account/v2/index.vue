<script setup lang="ts">

definePageMeta({
    middleware: ['logged-in'],
    //   middleware: ['coming-soon'],
    ssr: true,
})

const {
    authReady,
    isLoggedIn,
    user,
    entitlement,
    isCanceling,
    currentPeriodEnd,
} = useMeStateV2()

const deleting = ref(false)
const deleteConfirmInput = ref('')

const animatedRemaining = ref(0)
const showDeletePanel = ref(false)

const deleteError = ref('')

const aiUsage = ref<{
    attempts: number
    remaining: number
    limit: number
} | null>(null)

const aiUsageLoading = ref(true)


async function deleteAccount() {
    if (!isLoggedIn.value) return
    if (deleteConfirmInput.value.trim().toLowerCase() !== 'delete') return

    deleteError.value = ''
    deleting.value = true

    try {
        const auth = await useAuth()
        const token = await auth.getAccessToken()

        await $fetch('/api/account/v2', {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
            body: { confirm: 'DELETE' }
        })

        await auth.client?.logout({
            logoutParams: { returnTo: window.location.origin }
        })
    } catch (err: any) {
        console.error('Account deletion failed', err)
        deleteError.value =
            err?.data?.statusMessage ??
            'Something went wrong deleting your account. Please try again.'
    } finally {
        deleting.value = false
        deleteConfirmInput.value = ''

        if (!deleteError.value) {
            showDeletePanel.value = false
        }
    }
}

async function fetchAIUsage() {
    if (!isLoggedIn.value) return

    aiUsageLoading.value = true

    try {
        const auth = await useAuth()
        const token = await auth.getAccessToken()

        const usage = await $fetch("/api/ai/usage", {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        aiUsage.value = usage
        animateCount(animatedRemaining, usage.remaining)
    } finally {
        aiUsageLoading.value = false
    }
}

async function openBillingPortal() {
    if (!isLoggedIn.value) return

    const auth = await useAuth()
    const token = await auth.getAccessToken()

    const { url } = await $fetch<{ url: string }>('/api/stripe/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    })

    window.location.href = url
}

watch(
    () => [authReady.value, isLoggedIn.value],
    async ([ready, loggedIn]) => {
        if (ready && loggedIn && !aiUsage.value) {
            await fetchAIUsage()
        }
    },
    { immediate: true }
)

const animatedPercent = ref(0)

watch(aiUsage, (val) => {
    if (!val || !val.limit) return
    const percent = (val.remaining / val.limit) * 100
    animateCount(animatedPercent, percent)
})

</script>

<template>
    <main class="min-h-[calc(100vh-56px)]">

        <!-- Soft page background -->
        <div class="px-4 py-14 sm:py-16">
            <div class="max-w-xl mx-auto space-y-8">

                <!-- <BackLink /> -->

                <!-- Header -->
                <header v-if="isLoggedIn" class="space-y-2">
                    <h1 class="text-3xl font-semibold text-gray-900">Account</h1>
                    <p class="text-sm text-gray-600">
                        Manage your plan, billing, and account settings.
                    </p>
                </header>

                <!-- Loading -->
                <div v-if="!isLoggedIn" class="rounded-lg backdrop-blur p-5 text-gray-800">
                    Loading Account details…
                </div>

                <!-- Account details -->
                <div v-else-if="isLoggedIn" class="space-y-6">
                    <!-- Signed in card -->
                    <section class="rounded-lg backdrop-blur p-5" style="background-color:#A8CAE0;">
                        <div class="text-sm text-gray-700">Signed in as</div>
                        <div class="mt-1 font-medium text-gray-900 break-all">{{ user.email }}</div>
                    </section>

                    <!-- Plan card -->
                    <section class="rounded-lg backdrop-blur p-5 space-y-3"
                        style="background-color:rgba(244,205,39,0.35);">
                        <div class="flex items-center justify-between gap-3">
                            <div>
                                <div class="text-sm text-gray-700">Plan</div>
                                <div class="mt-1 font-medium text-gray-900">
                                    <span
                                        v-if="entitlement?.plan === 'monthly' && entitlement?.subscription_status === 'active'">Monthly</span>
                                    <span
                                        v-else-if="entitlement?.plan === 'yearly' && entitlement?.subscription_status === 'active'">Yearly</span>
                                    <span v-else>Free</span>
                                </div>
                            </div>
                        </div>

                        <p v-if="isCanceling && currentPeriodEnd" class="text-sm text-gray-600">
                            Cancels on <span class="font-medium">{{ currentPeriodEnd.toLocaleDateString() }}</span>
                        </p>

                        <p v-else-if="entitlement?.subscription_status === 'active' && currentPeriodEnd"
                            class="text-sm text-gray-700">
                            Renews on <span class="font-medium">{{ currentPeriodEnd.toLocaleDateString() }}</span>
                        </p>

                        <p v-else-if="entitlement?.subscription_status === 'past_due'" class="text-sm text-red-700">
                            Payment issue — update your card to keep access.
                        </p>
                    </section>

                    <!-- AI Usage card -->
                    <section class="rounded-lg backdrop-blur p-5 space-y-3" style="background-color:#F6E1E1;">
                        <div class="text-sm text-gray-700 mt-3 space-y-2 min-h-[80px]">
                            <div class="font-medium">AI Usage</div>

                            <template v-if="aiUsageLoading">
                                <div class="h-5 w-40 rounded bg-white/50 animate-pulse"></div>
                                <div class="w-full h-2 bg-gray-300 rounded overflow-hidden">
                                    <div class="h-2 w-1/3 rounded bg-white/50 animate-pulse"></div>
                                </div>
                            </template>

                            <template v-else-if="aiUsage">
                                <p>{{ animatedRemaining.toLocaleString() }} requests remaining</p>

                                <div class="w-2/3 h-2 bg-gray-300 rounded overflow-hidden">
                                    <div class="h-2 bg-blue-300 transition-[width] duration-500 ease-out"
                                        :style="{ width: animatedPercent + '%' }"></div>
                                </div>
                            </template>

                            <template v-else>
                                <p class="text-gray-600">Unable to load AI usage right now.</p>
                                <div class="w-full h-2 bg-gray-300 rounded overflow-hidden">
                                    <div class="h-2 w-0 bg-blue-300"></div>
                                </div>
                            </template>
                        </div>
                    </section>

                    <!-- Primary action -->
                    <div class="space-y-3">
                        <button v-if="entitlement && entitlement.plan !== 'free'" type="button" class="w-full rounded-lg py-3 font-semibold text-white border border-black/10
                     bg-black backdrop-blur
                     hover:bg-gray-800 transition shadow-sm" @click="openBillingPortal">
                            Manage billing
                        </button>

                        <div v-else>
                            <NuxtLink to="/upgrade" class="w-full block text-center rounded-lg py-3 font-semibold text-gray-900
                     bg-black text-white backdrop-blur transition shadow-sm hover:brightness-125 transition">
                                <span class="bg-gradient-to-r
                                from-[#d48fd0]
                                via-[#b57bc3]
                                via-[#6faed6]
                                to-[#d48fd0]
                                bg-clip-text text-transparent
                                hover:brightness-125 transition">
                                    Upgrade plan
                                </span>
                            </NuxtLink>

                            <!-- Optional: make upgrade feel “special” via text -->
                            <p class="mt-4 text-xs text-gray-500 text-center">
                                Upgrade to unlock more topics, levels, and practice tools.
                            </p>
                        </div>
                    </div>

                    <!-- Danger zone -->
                    <section class="rounded-lg border p-5 space-y-4"
                        style="background: rgba(246,225,225,0.55); border-color: rgba(185,28,28,0.25);">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <h2 class="text-base font-semibold text-gray-900">Danger zone</h2>

                                <p class="mt-4 text-sm text-red-800">
                                    Deleting your account permanently removes your account, data and subscription.
                                    Your subscription will be canceled, and you will be signed out immediately.
                                </p>
                            </div>

                            <span class="text-xs font-semibold text-red-800 rounded-lg px-3 py-1"
                                style="background: rgba(244,205,39,0.25);">
                                Permanent
                            </span>
                        </div>

                        <div class="space-y-2 text-sm text-red-800/90">
                            <p>This action cannot be undone.</p>
                            <p>It will also cancel any active subscription so it won’t renew.</p>
                            <p>Unused time will not be refunded.</p>
                        </div>

                        <div class="pt-2">
                            <button v-if="!showDeletePanel" type="button"
                                class="w-full rounded-lg py-3 font-semibold border border-red-300 text-red-800 bg-white/70 backdrop-blur hover:bg-white transition"
                                @click="
                                    showDeletePanel = true;
                                deleteError = '';
                                deleteConfirmInput = '';
                                ">
                                Show delete options
                            </button>

                            <div v-else class="space-y-4">
                                <div class="space-y-2">
                                    <label class="block text-sm text-gray-900">
                                        Type <span class="font-mono font-semibold">delete</span> to confirm
                                    </label>

                                    <input v-model="deleteConfirmInput" type="text" placeholder="delete"
                                        class="w-full rounded-lg border px-4 py-2 text-sm bg-white/80 backdrop-blur border-red-300/60 focus:outline-none focus:ring-2 focus:ring-red-300" />
                                </div>

                                <div v-if="deleteError"
                                    class="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
                                    {{ deleteError }}
                                </div>

                                <div class="flex flex-col gap-2 sm:flex-row">
                                    <button type="button"
                                        class="w-full rounded-lg py-3 font-semibold border border-red-400/70 text-red-800 bg-white/70 backdrop-blur hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                                        :disabled="deleting || deleteConfirmInput.trim().toLowerCase() !== 'delete'"
                                        @click="deleteAccount">
                                        {{ deleting ? 'Deleting account…' : 'Permanently delete account' }}
                                    </button>
                                    <button type="button"
                                        class="w-full rounded-lg py-3 font-semibold border border-gray-300 text-gray-800 bg-white/70 backdrop-blur hover:bg-white transition"
                                        :disabled="deleting" @click="
                                            showDeletePanel = false;
                                        deleteConfirmInput = '';
                                        deleteError = '';
                                        ">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <!-- Not signed in -->
                <div v-else class="rounded-lg backdrop-blur p-6 text-center space-y-6">
                    <p class="text-black font-medium text-xl">You’re not signed in.</p>
                    <p class="text-sm text-black">Sign in to manage your account and subscription.</p>
                    <div class="mt-">
                        <NuxtLink to="/" class="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold
                    transition text-black hover:underline">
                            Go home
                        </NuxtLink>
                    </div>
                </div>
            </div>
        </div>
    </main>
</template>