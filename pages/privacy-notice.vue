<script setup lang="ts">
definePageMeta({
  title: 'Privacy Notice · TaroTea'
})

</script>

<template>
  <main class="max-w-3xl mx-auto px-4 py-16 space-y-10">

    <BackLink />

    <header class="space-y-3">
      <h1 class="text-3xl font-semibold">
        Privacy Notice
      </h1>

      <p class="text-sm text-gray-500">
        Last updated: {{ new Date().toLocaleDateString() }}
      </p>
    </header>

    <section class="space-y-4 text-gray-700">
      <p>
        TaroTea (“we”, “us”, “our”) respects your privacy and is committed to protecting
        your personal data. This Privacy Notice explains how we collect, use, store and
        protect your information when you use TaroTea.
      </p>

      <p>
        TaroTea is a web application for learning Cantonese. We only collect information
        that is needed to provide the service, manage accounts, process subscriptions,
        improve reliability, and support learning features.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">1. Who we are</h2>

      <p class="text-gray-700">
        TaroTea is operated as a Cantonese learning web application.
      </p>

      <p class="text-gray-700">
        If you have any questions about this notice or your data, you can contact us at:
        <br />
        <a href="mailto:contact@tarotea.co.uk" class="font-medium text-gray-900 hover:underline">
          contact@tarotea.co.uk
        </a>
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">2. What data we collect</h2>

      <p class="text-gray-700">
        We collect different types of information depending on how you use TaroTea.
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          <strong>Account information:</strong> such as your email address, user ID,
          account status and subscription status.
        </li>

        <li>
          <strong>Authentication information:</strong> login and session information
          handled through our authentication provider. We do not store your password.
        </li>

        <li>
          <strong>Learning progress:</strong> such as XP, streaks, completed quizzes,
          unlocked words, quiz answers, accuracy, and related progress data.
        </li>

        <li>
          <strong>Pronunciation and speech feature data:</strong> if you use speech or
          pronunciation features, we may process the audio you submit, transcripts,
          scores, feedback, and usage counts for those features.
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
          <strong>Preferences:</strong> such as your selected audio voice preference
          where you choose to save it.
        </li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">3. How we use your data</h2>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>To create and manage your account</li>
        <li>To log you in and keep your account secure</li>
        <li>To provide access to free and paid content</li>
        <li>To track learning progress, XP, streaks, unlocks and quiz results</li>
        <li>To provide pronunciation, audio and speech feedback features</li>
        <li>To process subscriptions, billing and account upgrades</li>
        <li>To prevent abuse, fraud or misuse of the service</li>
        <li>To debug errors, improve reliability and maintain the app</li>
        <li>To communicate important service, account or billing updates</li>
      </ul>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">4. Legal basis for processing</h2>

      <p class="text-gray-700">
        Under UK GDPR, we rely on the following legal bases:
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          <strong>Contract:</strong> to provide the TaroTea service you sign up for,
          including account access, paid features, learning progress and subscription
          management.
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
      <h2 class="text-xl font-semibold">5. Third-party services</h2>

      <p class="text-gray-700">
        We use trusted third-party providers to operate TaroTea. These providers only
        process data as needed to provide their services to us.
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          <strong>Auth0:</strong> authentication, login and account security.
        </li>

        <li>
          <strong>Stripe:</strong> payment processing, subscriptions, invoices and billing.
        </li>

        <li>
          <strong>OpenAI:</strong> speech-to-text and pronunciation-related processing,
          where you choose to use pronunciation features.
        </li>

        <li>
          <strong>Hosting, database, storage and infrastructure providers:</strong>
          to host the app, store content, deliver audio files, run background jobs,
          cache data, monitor reliability and protect the service.
        </li>
      </ul>

      <p class="text-gray-700">
        Some providers may process data outside the United Kingdom. Where this happens,
        we rely on appropriate safeguards required by data protection law.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">6. Cookies and similar technologies</h2>

      <p class="text-gray-700">
        TaroTea uses cookies and similar technologies to operate the app, keep users
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
                Used for login, authentication, session management, security and access
                to account features.
              </td>
              <td class="py-2 pr-4">
                Authentication/session cookies
              </td>
            </tr>

            <tr class="border-b border-gray-100 align-top">
              <td class="py-2 pr-4">
                Preference cookies
              </td>
              <td class="py-2 pr-4">
                Used to remember choices you make in the app, such as your preferred
                audio voice.
              </td>
              <td class="py-2 pr-4">
                <code class="rounded bg-gray-100 px-1 py-0.5">audio-voice</code>
              </td>
            </tr>

            <tr class="align-top">
              <td class="py-2 pr-4">
                Analytics or advertising cookies
              </td>
              <td class="py-2 pr-4">
                We do not currently use advertising cookies. If we introduce optional
                analytics or advertising cookies in future, we will ask for consent where
                required.
              </td>
              <td class="py-2 pr-4">
                Not currently used
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="text-gray-700">
        The <code class="rounded bg-gray-100 px-1 py-0.5">audio-voice</code> preference
        stores whether you selected male or female audio playback. It is used only to
        keep your chosen audio voice across pages and is not used for advertising,
        analytics or tracking across other websites.
      </p>

      <p class="text-gray-700">
        You can change your audio voice preference using the audio voice switch in the
        app. You can also delete cookies through your browser settings.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">7. Data retention</h2>

      <p class="text-gray-700">
        We keep personal data only for as long as needed for the purposes described in
        this notice.
      </p>

      <ul class="list-disc pl-6 space-y-2 text-gray-700">
        <li>
          Account data is kept while your account is active.
        </li>

        <li>
          Learning progress is kept while your account is active so we can provide
          progress tracking, XP, streaks and unlocked content.
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
      <h2 class="text-xl font-semibold">8. Your rights</h2>

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
        <a href="mailto:contact@tarotea.co.uk" class="font-medium text-gray-900 hover:underline">
          contact@tarotea.co.uk
        </a>
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">9. Account deletion</h2>

      <p class="text-gray-700">
        You may request deletion of your TaroTea account at any time. When an account is
        deleted, we aim to remove account information, learning progress and related app
        data from active systems, subject to any information we must keep for legal,
        billing, security or fraud-prevention reasons.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">10. Security</h2>

      <p class="text-gray-700">
        We use reasonable technical and organisational measures to protect your personal
        data, including authentication controls, access controls, secure third-party
        providers and operational monitoring. No online service can be guaranteed to be
        completely secure, but we work to protect your data and reduce risks.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">11. Children</h2>

      <p class="text-gray-700">
        TaroTea is not intended for children under 13. If you believe a child has provided
        us with personal data, please contact us so we can review and take appropriate
        action.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">12. Complaints</h2>

      <p class="text-gray-700">
        If you have concerns about how we handle your data, please contact us first so we
        can try to help. You also have the right to complain to the UK Information
        Commissioner’s Office.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">13. Changes to this notice</h2>

      <p class="text-gray-700">
        We may update this Privacy Notice from time to time. Any significant changes will
        be reflected on this page. The “Last updated” date above shows when this notice
        was most recently changed.
      </p>
    </section>

    <section class="space-y-3">
      <h2 class="text-xl font-semibold">14. Contact</h2>

      <p class="text-gray-700">
        If you have any questions about this Privacy Notice, please contact:
        <br />
        <a href="mailto:contact@tarotea.co.uk" class="font-medium text-gray-900 hover:underline">
          contact@tarotea.co.uk
        </a>
      </p>
    </section>

  </main>
</template>