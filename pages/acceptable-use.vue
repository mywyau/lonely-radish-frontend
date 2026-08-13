<script setup lang="ts">
import {
  BadgePoundSterling,
  Ban,
  CircleAlert,
  Flag,
  HeartHandshake,
  Mail,
  Scale,
  ShieldCheck,
  UserRoundCheck,
} from '@lucide/vue'

definePageMeta({
  title: 'Acceptable Use Policy · Lonely Radish'
})
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-10 px-4 py-16">
    <header class="space-y-3">
      <h1 class="text-3xl font-semibold">
        Acceptable Use Policy
      </h1>

      <p class="text-sm text-gray-500">
        Last updated: <time datetime="2026-08-13">13 August 2026</time>
      </p>
    </header>

    <section class="space-y-4 text-gray-700">
      <p>
        Lonely Radish is for adults who want to meet people for genuine, consensual
        dating and plan dates safely. This policy explains what is and is not allowed
        when you use the service.
      </p>

      <p>
        This policy forms part of our
        <NuxtLink to="/terms-of-service" class="font-medium text-gray-900 hover:underline">
          Terms of Service
        </NuxtLink>.
        It applies to profiles, photos, messages, contact details, date proposals and
        every other interaction on Lonely Radish.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="UserRoundCheck">Adults only</FooterPageSectionHeading>

      <p class="text-gray-700">
        You must be at least 18 years old to create an account or use Lonely Radish.
        You must not misrepresent your age or create, share or request content that
        sexualises, exploits or endangers a child.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="HeartHandshake">Genuine dating only</FooterPageSectionHeading>

      <p class="text-gray-700">
        Lonely Radish must not be used to advertise, request, arrange or facilitate:
      </p>

      <ul class="list-disc space-y-2 pl-6 text-gray-700">
        <li>Prostitution, escorting or any other paid sexual service</li>
        <li>Paid companionship, transactional dating or “sugar” dating</li>
        <li>Sex trafficking, sexual exploitation or coercive activity</li>
        <li>Commercial matchmaking or introductions offered by another user</li>
      </ul>

      <p class="text-gray-700">
        A supporter membership helps fund Lonely Radish, and a business subscription pays
        for business tools. Neither is ever a payment to another user, payment for a date,
        or payment for access to a person.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Ban">Sexual and exploitative content</FooterPageSectionHeading>

      <p class="text-gray-700">
        Do not upload, send, request or link to pornography, sexually explicit material,
        content intended primarily for sexual gratification, non-consensual intimate
        imagery, or content that promotes sexual exploitation. Nudity and graphic sexual
        descriptions are not permitted.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="ShieldCheck">Safety and respect</FooterPageSectionHeading>

      <p class="text-gray-700">
        Treat other people with respect. You must not:
      </p>

      <ul class="list-disc space-y-2 pl-6 text-gray-700">
        <li>Harass, stalk, threaten, intimidate or pressure another person</li>
        <li>Promote hatred, violence, abuse or discrimination</li>
        <li>Share someone’s private information without permission</li>
        <li>Ignore a block, evade a suspension or repeatedly contact someone who has declined</li>
        <li>Encourage dangerous conduct or arrange a meeting without the other person’s consent</li>
      </ul>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="BadgePoundSterling">Honesty, fraud and solicitation</FooterPageSectionHeading>

      <p class="text-gray-700">
        Do not impersonate another person or organisation, create a misleading profile,
        operate a romance scam, send spam, or use Lonely Radish primarily to advertise
        another product or service.
      </p>

      <p class="text-gray-700">
        You must not ask other users for money, loans, gift cards, cryptocurrency,
        investments or financial account information, or use the service to facilitate
        fraud or money laundering.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Scale">Lawful use</FooterPageSectionHeading>

      <p class="text-gray-700">
        Do not use Lonely Radish to plan, promote or carry out illegal activity, sell
        illegal goods or services, infringe another person’s rights, interfere with the
        service, scrape user information, or gain unauthorised access to an account or
        restricted area.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Flag">Reporting and enforcement</FooterPageSectionHeading>

      <p class="text-gray-700">
        You can block another user and report profiles or behaviour through the safety
        controls in the app. You can also report a concern by emailing
        <a href="mailto:contact@lonelyradish.app?subject=Safety%20report" class="font-medium text-gray-900 hover:underline">
          contact@lonelyradish.app
        </a>.
        If someone is in immediate danger, contact the appropriate local emergency service.
      </p>

      <p class="text-gray-700">
        We may review reports and relevant account activity, remove content, limit features,
        suspend or permanently close accounts, and preserve or disclose information where
        required by law. Serious or repeated violations may result in permanent removal.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="CircleAlert">Changes and questions</FooterPageSectionHeading>

      <p class="text-gray-700">
        We may update this policy as the service and its safety controls develop. We will
        update the date above and provide appropriate notice when a change materially
        affects users.
      </p>

      <p class="text-gray-700">
        Questions about this policy can be sent to
        <a href="mailto:contact@lonelyradish.app" class="font-medium text-gray-900 hover:underline">
          contact@lonelyradish.app
        </a>.
      </p>
    </section>
  </main>
</template>
