<script setup lang="ts">
import { Phone } from '@lucide/vue'

definePageMeta({
  title: 'Contact · TaroTea'
})
</script>

<template>
  <main class="contact-page max-w-xl mx-auto px-4 py-16 space-y-10">

    <BackLink />

    <!-- Header -->
    <header class="text-center space-y-3">
      <h1 class="text-3xl font-semibold text-gray-900">
        Contact
      </h1>

      <p class="text-gray-600 text-sm sm:text-base">
        Have a question, found an issue, or want to share feedback?
        We’d love to hear from you.
      </p>
    </header>

    <!-- Contact Card -->
    <section class="contact-card text-center space-y-4">

      <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 ring-1 ring-purple-100">
        <Phone class="h-6 w-6" aria-hidden="true" />
      </div>

      <p class="text-xs uppercase tracking-wide text-gray-600">
        Email
      </p>

      <a href="mailto:contact@tarotea.co.uk" class="email-link">
        contact@tarotea.co.uk
      </a>

      <p class="text-xs text-gray-600">
        We usually respond in a few days.
      </p>

    </section>

  </main>
</template>


<style>
.contact-page {
  --pink: #EAB8E4;
  --purple: #D6A3D1;
  --blue: #A8CAE0;
  --yellow: #F4CD27;
  --blush: #F6E1E1;
}

/* Clean block card */
.contact-card {
  border-radius: 24px;
  padding: 2rem;
  background: #F6E1E1;
  /* soft blush block */
}

/* Simple email accent */
.email-link {
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
  text-decoration: none;
  transition: opacity 0.15s ease;
}

.email-link:hover {
  opacity: 0.7;
}
</style>