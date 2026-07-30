<script setup lang="ts">
import {
  Bell,
  Clock,
  Database,
  FileText,
  Globe,
  Mail,
  Scale,
  ShieldAlert,
  ShieldCheck,
} from '@lucide/vue'

definePageMeta({
  title: 'Law Enforcement Guidelines · Lonely Radish'
})
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-10 px-4 py-16">
    <header class="space-y-3">
      <h1 class="text-3xl font-semibold">
        Law Enforcement Guidelines
      </h1>

      <p class="text-sm text-gray-500">
        Last updated: <time datetime="2026-07-30">30 July 2026</time>
      </p>
    </header>

    <section class="space-y-4 text-gray-700">
      <p>
        These guidelines explain how authorised law enforcement and government agencies
        may request information from Lonely Radish. They are intended for officials acting
        in an official capacity and do not create additional rights to user information.
      </p>

      <p>
        Lonely Radish is operated in the United Kingdom. We assess requests under applicable
        UK law, including data protection requirements, and disclose information only where
        we are legally required or lawfully permitted to do so.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Mail">Submitting a request</FooterPageSectionHeading>

      <p class="text-gray-700">
        Send requests from an official agency email address to
        <a
          href="mailto:contact@lonelyradish.app?subject=Law%20enforcement%20request"
          class="font-medium text-gray-900 hover:underline"
        >
          contact@lonelyradish.app
        </a>
        with the subject “Law enforcement request”. Please do not send user data or
        sensitive evidence until we have confirmed an appropriate secure delivery method.
      </p>

      <p class="text-gray-700">
        This channel is not monitored continuously and we do not guarantee a particular
        response time. Requests should be submitted as early as possible.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="FileText">Information to include</FooterPageSectionHeading>

      <p class="text-gray-700">
        A request should be dated and provided on official letterhead or through another
        verifiable official process. It should include:
      </p>

      <ul class="list-disc space-y-2 pl-6 text-gray-700">
        <li>The requesting officer’s name, role, agency, badge or identification number and official contact details</li>
        <li>The legal authority and purpose for the request, with a copy of any warrant, court order or other legal process</li>
        <li>Specific account identifiers, such as an email address, Auth0 user ID or Lonely Radish profile name</li>
        <li>The precise categories of information requested and the relevant date range</li>
        <li>The requested response date and the reason for any urgency</li>
        <li>A contact who can answer follow-up questions about scope or legal authority</li>
      </ul>

      <p class="text-gray-700">
        Names, profile descriptions or photographs alone may not identify an account
        reliably. Please provide the most specific identifiers available.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="ShieldCheck">Verification and review</FooterPageSectionHeading>

      <p class="text-gray-700">
        We verify the identity and authority of the requester before disclosing information.
        This may include replying through an official agency domain, contacting the agency
        through independently published details, or requesting further documentation.
        Requests from personal email addresses will not be processed.
      </p>

      <p class="text-gray-700">
        Each request is reviewed for legal validity, necessity, proportionality and scope.
        We may ask for clarification, narrow a request, object to it, or decline it where it
        is defective, unlawful, excessively broad or seeks information we do not hold.
        A voluntary request does not itself create an obligation to disclose information.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Database">Information that may be available</FooterPageSectionHeading>

      <p class="text-gray-700">
        Depending on what is held when a valid request is received, responsive information
        may include:
      </p>

      <ul class="list-disc space-y-2 pl-6 text-gray-700">
        <li>Basic account identifiers and account status</li>
        <li>Profile information, photographs and user-provided preferences</li>
        <li>Interests, matches, date proposals, reports, blocks and related safety records</li>
        <li>Subscription status and Stripe customer or subscription identifiers</li>
        <li>Relevant technical, access or security records retained by the service</li>
      </ul>

      <p class="text-gray-700">
        We can provide only information that Lonely Radish holds and can reasonably locate.
        Availability is subject to our normal retention and deletion practices. We do not
        hold users’ full payment-card details, and authentication providers may hold some
        identity or access information separately.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Clock">Preservation requests</FooterPageSectionHeading>

      <p class="text-gray-700">
        An authorised agency may request preservation of specified account information
        while it obtains the required legal process. The request must identify the account,
        the information to preserve, the relevant period, the legal basis and the anticipated
        duration. We assess preservation requests under applicable law and cannot preserve
        information that has already been deleted or was never collected.
      </p>

      <p class="text-gray-700">
        Preservation does not by itself authorise disclosure. Appropriate legal process
        may still be required before preserved information can be supplied.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="ShieldAlert">Emergency requests</FooterPageSectionHeading>

      <p class="text-gray-700">
        If there is an imminent risk of death or serious physical harm, use the email
        address above with the subject “EMERGENCY — imminent risk”. The request must explain
        the nature of the emergency, identify the person at risk, describe the information
        required, and explain how that information could help prevent the harm. It must also
        include official contact details that we can verify.
      </p>

      <p class="text-gray-700">
        We assess emergency requests individually and may disclose limited information
        where we have a good-faith basis to believe disclosure is necessary, proportionate
        and permitted by law. Sending an email does not guarantee an immediate response.
        Anyone facing immediate danger should contact the appropriate local emergency service.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Scale">Data minimisation and secure disclosure</FooterPageSectionHeading>

      <p class="text-gray-700">
        Where disclosure is appropriate, we provide only information reasonably necessary
        for the stated lawful purpose. We may redact unrelated information and use an
        appropriate secure transfer method. Requesting agencies are responsible for
        protecting information after receiving it.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Bell">User notice</FooterPageSectionHeading>

      <p class="text-gray-700">
        We may notify an affected user before or after disclosure unless notice is prohibited
        by law or court order, would create a risk of harm, would compromise an investigation,
        or would otherwise be inappropriate under applicable law. Where a restriction on
        notice expires, we may provide notice later where it is lawful and appropriate.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="Globe">Requests from outside the UK</FooterPageSectionHeading>

      <p class="text-gray-700">
        Agencies outside the United Kingdom may need to use applicable international
        cooperation procedures or obtain legal process recognised in the UK. We may refer
        a requesting agency to the appropriate route before considering disclosure.
      </p>
    </section>

    <section class="space-y-3">
      <FooterPageSectionHeading :icon="FileText">Other requests</FooterPageSectionHeading>

      <p class="text-gray-700">
        This process is not for private disputes, civil litigants, informal background
        checks, requests from users for their own information, or general customer support.
        Users wishing to exercise a data protection right should follow the process in our
        <NuxtLink to="/privacy-notice" class="font-medium text-gray-900 hover:underline">
          Privacy Notice
        </NuxtLink>.
      </p>
    </section>
  </main>
</template>
