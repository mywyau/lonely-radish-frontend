<script setup lang="ts">
import { BadgePoundSterling, CreditCard, Mail, ReceiptText, RotateCw, Trash2 } from '@lucide/vue'

definePageMeta({
  title: 'Refund Policy · TaroTea'
})
</script>

<template>
  <main class="max-w-3xl mx-auto px-4 py-16 space-y-10">

    <BackLink />

    <header class="space-y-3">
      <h1 class="text-3xl font-semibold">
        Refund Policy
      </h1>

      <p class="text-sm text-gray-500">
        Last updated: {{ new Date().toLocaleDateString() }}
      </p>
    </header>

    <section class="space-y-4 text-gray-700">
      <p>
        This Refund Policy explains how refunds are handled for subscriptions
        purchased on TaroTea.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="CreditCard" color-class="bg-sky-50 text-sky-600 ring-sky-100">Digital subscriptions</FooterPageSectionHeading>

      <p class="text-gray-700">
        TaroTea provides access to digital learning content through monthly or yearly
        subscriptions.
      </p>

      <p class="text-gray-700">
        Once access has been granted, subscription payments are generally
        <strong>non-refundable</strong>, including for partially used billing periods.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="RotateCw" color-class="bg-sky-50 text-sky-600 ring-sky-100">Canceling your subscription</FooterPageSectionHeading>

      <p class="text-gray-700">
        You may cancel your subscription at any time.
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          Your subscription will remain active until the end of your current billing period.
        </li>
        <li>
          You will not be charged again after cancellation.
        </li>
        <li>
          No refunds are issued for unused time.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Trash2" color-class="bg-sky-50 text-sky-600 ring-sky-100">Account deletion</FooterPageSectionHeading>

      <p class="text-gray-700">
        Deleting your account permanently removes your access to TaroTea and any associated data.
      </p>

      <p class="text-gray-700">
        Deleting your account does <strong>not</strong> automatically result in a refund.
        Any remaining subscription time is forfeited.
      </p>

      <p class="text-gray-700">
        This action cannot be undone.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="BadgePoundSterling" color-class="bg-sky-50 text-sky-600 ring-sky-100">Exceptions</FooterPageSectionHeading>

      <p class="text-gray-700">
        Refunds may be considered in limited circumstances, such as:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>Duplicate or accidental charges</li>
        <li>Technical issues preventing access to paid content</li>
      </ul>

      <p class="text-gray-700">
        If you believe you were charged in error, please contact us and we will review the issue.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Mail" color-class="bg-sky-50 text-sky-600 ring-sky-100">How to contact us</FooterPageSectionHeading>

      <p class="text-gray-700">
        For billing or refund questions, please contact:
        <br />
        <a href="mailto:billing@tarotea.co.uk" class="font-medium">
          billing@tarotea.co.uk
        </a>
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="ReceiptText" color-class="bg-sky-50 text-sky-600 ring-sky-100">Changes to this policy</FooterPageSectionHeading>

      <p class="text-gray-700">
        We may update this Refund Policy from time to time. Any changes will be reflected on this page.
      </p>
    </section>

  </main>
</template>
