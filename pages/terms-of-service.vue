<script setup lang="ts">
import { BookOpen, CircleSlash, Copyright, CreditCard, FileText, Handshake, Mail, Scale, ShieldAlert, UserRound, WifiOff } from '@lucide/vue'

definePageMeta({
  title: 'Terms of Service · Lonely Radish'
})
</script>

<template>
  <main class="max-w-3xl mx-auto px-4 py-16 space-y-10">



    <header class="space-y-3">
      <h1 class="text-3xl font-semibold">
        Terms of Service
      </h1>

      <p class="text-sm text-gray-500">
        Last updated: {{ new Date().toLocaleDateString() }}
      </p>
    </header>

    <section class="space-y-4 text-gray-700">
      <p>
        These Terms of Service (“Terms”) govern your use of Lonely Radish.
        By using the app, you agree to these Terms.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="BookOpen">About Lonely Radish</FooterPageSectionHeading>
      <p class="text-gray-700">
        Lonely Radish is a web application designed to help adults discover and plan
        casual, public coffee dates with clearer intent and less endless messaging.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="UserRound">Accounts</FooterPageSectionHeading>
      <p class="text-gray-700">
        To access certain features, you may need to create an account.
        You are responsible for keeping your account secure and for any activity
        that occurs under your account.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="CreditCard">Subscriptions and payments</FooterPageSectionHeading>
      <p class="text-gray-700">
        Some features of Lonely Radish may require a paid subscription.
        Payments are processed by third-party providers such as Stripe.
      </p>

      <p class="text-gray-700">
        Subscription pricing, billing periods, and cancellation options will be
        clearly shown before purchase. You may cancel your subscription at any time
        according to the terms provided during checkout.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="FileText">Content and availability</FooterPageSectionHeading>
      <p class="text-gray-700">
        Profiles, prompts, venue suggestions, and related app content are provided to
        support social discovery. We may update, modify, or remove content at any time
        as the app evolves.
      </p>

      <p class="text-gray-700">
        We do not guarantee that any particular content will always be available.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Handshake">Acceptable use</FooterPageSectionHeading>
      <p class="text-gray-700">
        You agree not to misuse the service, including attempting to:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>Access restricted areas without permission</li>
        <li>Harass, impersonate, threaten, or mislead other users</li>
        <li>Distribute or resell app content without authorisation</li>
        <li>Interfere with the operation or security of the app</li>
      </ul>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Copyright">Intellectual property</FooterPageSectionHeading>
      <p class="text-gray-700">
        All content on Lonely Radish, including text, visuals, prompts, and design, is
        owned by or licensed to Lonely Radish and is protected by intellectual property laws.
      </p>

      <p class="text-gray-700">
        You may use the content for personal, non-commercial dating purposes only.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="CircleSlash">No guarantees</FooterPageSectionHeading>
      <p class="text-gray-700">
        Lonely Radish is provided on an “as is” basis. We do not guarantee matches,
        dates, compatibility, relationship outcomes, or the conduct of other users.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="ShieldAlert">Limitation of liability</FooterPageSectionHeading>
      <p class="text-gray-700">
        To the extent permitted by law, Lonely Radish will not be liable for any indirect,
        incidental, or consequential loss arising from your use of the app.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="WifiOff">Termination</FooterPageSectionHeading>
      <p class="text-gray-700">
        We may suspend or terminate access to the service if these Terms are violated
        or if the app is discontinued.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Scale">Governing law</FooterPageSectionHeading>
      <p class="text-gray-700">
        These Terms are governed by the laws of the UK.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Mail">Contact</FooterPageSectionHeading>
      <p class="text-gray-700">
        If you have any questions about these Terms, please contact:
        <br />
        <a href="mailto:contact@tarotea.co.uk" class="font-medium">
          contact@tarotea.co.uk
        </a>
      </p>
    </section>

  </main>
</template>
