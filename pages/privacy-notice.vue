<script setup lang="ts">
import { Baby, CalendarClock, Contact, Database, FileText, Handshake, LockKeyhole, Mail, RotateCw, Scale, ShieldCheck, Trash2 } from '@lucide/vue'

definePageMeta({
  title: 'Privacy Notice · Lonely Radish'
})

</script>

<template>
  <main class="max-w-3xl mx-auto px-4 py-16 space-y-10">

    <!--  -->

    <header class="space-y-3">
      <h1 class="text-3xl font-semibold">
        Privacy Notice
      </h1>

      <p class="text-sm text-gray-500">
        Last updated: <time datetime="2026-08-13">13 August 2026</time>
      </p>
    </header>

    <section class="space-y-4 text-gray-700">
      <p>
        Lonely Radish (“we”, “us”, “our”) respects your privacy and is committed to protecting
        your personal data. This Privacy Notice explains how we collect, use, store and
        protect your information when you use Lonely Radish.
      </p>

      <p>
        Lonely Radish is a web application for casual activity-date discovery. We only collect information
        that is needed to provide the service, manage accounts, process subscriptions,
        improve reliability, and support matching, structured date-planning communication,
        safety, and date-planning features.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Contact">Who we are</FooterPageSectionHeading>

      <p class="text-gray-700">
        Lonely Radish is operated as a casual dating web application.
      </p>

      <p class="text-gray-700">
        If you have any questions about this notice or your data, you can contact us at:
        <br />
        <a href="mailto:contact@lonelyradish.app" class="font-medium text-gray-900 hover:underline">
          contact@lonelyradish.app
        </a>
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Database">What data we collect</FooterPageSectionHeading>

      <p class="text-gray-700">
        We collect different types of information depending on how you use Lonely Radish.
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          <strong>Account information:</strong> such as your email address, user ID,
          account status and subscription status.
        </li>

        <li>
          <strong>Dating profile and preference information:</strong> such as profile text,
          photos, age, gender, sexual orientation, racial or ethnic identity, activity and
          dating preferences, availability windows, optional contact details and sharing
          settings, interests, matches, and related interaction data. Some of this may be
          special-category personal data under data protection law.
        </li>

        <li>
          <strong>Communication and safety data:</strong> such as date-planning notes,
          follow-up notes, apology notes, reports, moderation signals, blocks, and
          safety-related interactions.
        </li>

        <li>
          <strong>Payment and subscription information:</strong> such as your plan,
          subscription status, billing status, and Stripe customer or subscription IDs.
          We do not store your full card details.
        </li>

        <li>
          <strong>Technical and usage data:</strong> such as page requests, error logs,
          device/browser information, timestamps, and security logs needed to operate,
          debug and protect the service.
        </li>

        <li>
          <strong>Preferences:</strong> such as your selected activity-date and notification preferences
          where you choose to save it.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="ShieldCheck">How we use your data</FooterPageSectionHeading>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>To create and manage your account</li>
        <li>To log you in and keep your account secure</li>
        <li>To provide personal features, optional supporter memberships and paid business tools</li>
        <li>To support profiles, matching, availability, structured date-planning communication and date planning</li>
        <li>To support safety, moderation, reporting, and blocking features</li>
        <li>To process subscriptions, billing and account upgrades</li>
        <li>To prevent abuse, fraud or misuse of the service</li>
        <li>To debug errors, improve reliability and maintain the app</li>
        <li>To communicate important service, account or billing updates</li>
      </ul>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Scale">Legal basis for processing</FooterPageSectionHeading>

      <p class="text-gray-700">
        Under UK GDPR, we rely on the following legal bases:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          <strong>Contract:</strong> to provide the Lonely Radish service you sign up for,
          including account access, personal features, business tools, matching, structured
          date-planning communication and subscription management.
        </li>

        <li>
          <strong>Legitimate interests:</strong> to operate, secure, debug and improve
          the app, prevent misuse, and understand how the service is performing.
        </li>

        <li>
          <strong>Legal obligation:</strong> where we need to retain billing, accounting,
          tax or compliance records.
        </li>

        <li>
          <strong>Consent:</strong> where required, such as for optional non-essential
          cookies or similar technologies if we introduce them in future.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Scale">Requests from law enforcement</FooterPageSectionHeading>

      <p class="text-gray-700">
        We may preserve or disclose personal data where required by valid legal process,
        or where disclosure is otherwise lawfully permitted, necessary and proportionate
        for a law enforcement purpose. We limit any disclosure to information relevant
        to the request.
      </p>

      <p class="text-gray-700">
        Our
        <NuxtLink to="/law-enforcement-guidelines" class="font-medium text-gray-900 hover:underline">
          Law Enforcement Guidelines
        </NuxtLink>
        explain how authorised agencies can submit, preserve and verify a request.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Handshake">Third-party services</FooterPageSectionHeading>

      <p class="text-gray-700">
        We use trusted third-party providers to operate Lonely Radish. These providers only
        process data as needed to provide their services to us.
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          <strong>Auth0:</strong> authentication and account identity.
        </li>

        <li>
          <strong>Vercel:</strong> application hosting and aggregate analytics.
        </li>

        <li>
          <strong>Supabase:</strong> database and profile-photo storage.
        </li>

        <li>
          <strong>Upstash:</strong> caching and background-job delivery through Redis and QStash.
        </li>

        <li>
          <strong>Stripe:</strong> payment processing, subscriptions, invoices and billing.
        </li>

        <li>
          <strong>Resend:</strong> transactional account and service email.
        </li>

        <li>
          <strong>OpenCage:</strong> postcode geocoding used to derive location coordinates
          and a postcode area for matching.
        </li>
      </ul>

      <p class="text-gray-700">
        Some providers may process data outside the United Kingdom. Where this happens,
        we rely on appropriate safeguards required by data protection law.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="FileText">Cookies and similar technologies</FooterPageSectionHeading>

      <p class="text-gray-700">
        Lonely Radish uses cookies and similar technologies to operate the app, keep users
        signed in, remember preferences, and protect the service. We do not use advertising
        cookies.
      </p>

      <div class="overflow-x-auto">
        <table class="w-full border-collapse text-left text-sm text-gray-700">
          <thead>
            <tr class="border-b border-gray-200">
              <th class="py-2 pr-4 font-semibold">Type</th>
              <th class="py-2 pr-4 font-semibold">Purpose</th>
              <th class="py-2 pr-4 font-semibold">Example</th>
            </tr>
          </thead>

          <tbody>
            <tr class="border-b border-gray-100 align-top">
              <td class="py-2 pr-4">
                Essential cookies
              </td>
              <td class="py-2 pr-4">
                Used for basic session continuity, security and access to account features
                when those systems are enabled.
              </td>
              <td class="py-2 pr-4">
                Session cookies
              </td>
            </tr>

            <tr class="border-b border-gray-100 align-top">
              <td class="py-2 pr-4">
                Browser storage
              </td>
              <td class="py-2 pr-4">
                Local or session storage used to remember app and journey choices on your device.
              </td>
              <td class="py-2 pr-4">
                Saved app state
              </td>
            </tr>

            <tr class="align-top">
              <td class="py-2 pr-4">
                Analytics or advertising cookies
              </td>
              <td class="py-2 pr-4">
                We do not use advertising cookies. We use aggregate page-view and product-journey
                analytics to understand whether core flows work. We do not intentionally add profile
                names, account IDs, report references, free text or dating preferences to custom
                product events. Automatic page-view analytics may process the page path.
              </td>
              <td class="py-2 pr-4">
                Aggregate usage analytics
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-gray-700">
        Browser storage is used only to keep app state and choices on your device. It is not
        used for advertising or tracking across other websites.
      </p>

      <p class="text-gray-700">
        You can change app preferences where controls are provided. You can also delete
        cookies through your browser settings.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="CalendarClock">Data retention</FooterPageSectionHeading>

      <p class="text-gray-700">
        We keep personal data only for as long as needed for the purposes described in
        this notice.
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          Account data is kept while your account is active.
        </li>

        <li>
          Profile, preference, match, date-planning communication and safety data is kept
          while your account is active, unless deleted earlier or retained where legally required.
        </li>

        <li>
          Billing and subscription records may be kept for as long as required for tax,
          accounting, legal or fraud-prevention purposes.
        </li>

        <li>
          Technical logs are kept only as long as needed for debugging, security,
          reliability and operational purposes.
        </li>

        <li>
          If you request account deletion, we will delete or anonymise personal data
          unless we need to keep limited information for legal, billing, security or
          fraud-prevention reasons.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Mail">Your rights</FooterPageSectionHeading>

      <p class="text-gray-700">
        Under UK GDPR, you may have the right to:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>Access your personal data</li>
        <li>Correct inaccurate or incomplete data</li>
        <li>Request deletion of your personal data</li>
        <li>Object to certain processing</li>
        <li>Request restriction of processing</li>
        <li>Request data portability</li>
        <li>Withdraw consent where processing is based on consent</li>
      </ul>

      <p class="text-gray-700">
        To exercise these rights, contact us at:
        <br />
        <a href="mailto:contact@lonelyradish.app" class="font-medium text-gray-900 hover:underline">
          contact@lonelyradish.app
        </a>
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Trash2">Account deletion</FooterPageSectionHeading>

      <p class="text-gray-700">
        You may request deletion of your Lonely Radish account at any time. When an account is
        deleted, we aim to remove account information, profile data, matching data and related app
        data from active systems, subject to any information we must keep for legal,
        billing, security or fraud-prevention reasons.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="LockKeyhole">Security</FooterPageSectionHeading>

      <p class="text-gray-700">
        We use reasonable technical and organisational measures to protect your personal
        data, including authentication controls, access controls, secure third-party
        providers and operational monitoring. No online service can be guaranteed to be
        completely secure, but we work to protect your data and reduce risks.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Baby">Children</FooterPageSectionHeading>

      <p class="text-gray-700">
        Lonely Radish is not intended for children under 18. If you believe a child has provided
        us with personal data, please contact us so we can review and take appropriate
        action.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Scale">Complaints</FooterPageSectionHeading>

      <p class="text-gray-700">
        If you have concerns about how we handle your data, please contact us first so we
        can try to help. You also have the right to complain to the UK Information
        Commissioner’s Office.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="RotateCw">Changes to this notice</FooterPageSectionHeading>

      <p class="text-gray-700">
        We may update this Privacy Notice from time to time. Any significant changes will
        be reflected on this page. The “Last updated” date above shows when this notice
        was most recently changed.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Mail">Contact</FooterPageSectionHeading>

      <p class="text-gray-700">
        If you have any questions about this Privacy Notice, please contact:
        <br />
        <a href="mailto:contact@lonelyradish.app" class="font-medium text-gray-900 hover:underline">
          contact@lonelyradish.app
        </a>
      </p>
    </section>

  </main>
</template>
