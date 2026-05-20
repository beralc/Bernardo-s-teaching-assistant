import React from "react";

/**
 * PrivacyPolicy.js
 *
 * Standalone page accessible at /privacy (no login required).
 * Written in plain, accessible language for participants aged 50+.
 * Complies with EU GDPR 2016/679 and Spanish Organic Law 3/2018 (LOPDGDD).
 *
 * Study reference: 663_CE_20260312_35_HUM (UCM Ethics Committee)
 */
export function PrivacyPolicy() {
  return (
    <div className="bg-gray-50 min-h-screen text-gray-900">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <a
          href="/"
          className="text-green-700 font-bold text-lg hover:underline flex items-center gap-2"
          aria-label="Back to home"
        >
          &#8592; Back to App
        </a>
        <span className="text-gray-500 text-sm">Privacy Policy</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Title */}
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            Privacy Policy
          </h1>
          <p className="text-base text-gray-500">
            Last updated: May 2026 &mdash; Study reference:{" "}
            <strong>663_CE_20260312_35_HUM</strong>
          </p>
        </div>

        {/* Section 1 */}
        <Section title="1. Who is responsible for this study?">
          <p>
            This application is used as part of a PhD research project conducted
            by:
          </p>
          <InfoBox>
            <strong>Bernardo Morales Mateo</strong>
            <br />
            PhD Candidate &mdash; Applied Linguistics
            <br />
            Universidad Complutense de Madrid (UCM), Spain
            <br />
            Email:{" "}
            <a
              href="mailto:bernardm@ucm.es"
              className="text-green-700 underline"
            >
              bernardm@ucm.es
            </a>
          </InfoBox>
          <p>
            The study has been reviewed and approved by the UCM Ethics Committee
            (Comit&eacute; de &Eacute;tica de la Investigaci&oacute;n) under
            reference <strong>663_CE_20260312_35_HUM</strong>.
          </p>
        </Section>

        {/* Section 2 */}
        <Section title="2. What data do we collect?">
          <p>We collect only the information needed for the research:</p>
          <ul className="list-disc ml-6 space-y-2 text-gray-800">
            <li>
              <strong>Profile information</strong> &mdash; your first name,
              surname, age, country, native language, and English level. You
              provide this when you register.
            </li>
            <li>
              <strong>Conversation data</strong> &mdash; the text and audio of
              your English practice sessions with the AI assistant.
            </li>
            <li>
              <strong>Usage logs</strong> &mdash; when you use the app, how long
              each session lasts, and which topics you practise.
            </li>
            <li>
              <strong>Technical data</strong> &mdash; your email address (used
              only for account access) and account creation date.
            </li>
          </ul>
          <p className="mt-3 text-gray-700">
            We do <strong>not</strong> collect payment information, location
            data, or any sensitive personal data beyond what is listed above.
          </p>
        </Section>

        {/* Section 3 */}
        <Section title="3. Why do we collect this data?">
          <p>Your data is used <strong>solely</strong> for:</p>
          <ul className="list-disc ml-6 space-y-2 text-gray-800">
            <li>
              Providing you with personalised English practice through the AI
              assistant.
            </li>
            <li>
              Academic research into how adults aged 50 and over learn English
              with AI tools (PhD thesis at UCM).
            </li>
            <li>Tracking your own learning progress within the app.</li>
          </ul>
          <p className="mt-3 text-gray-700">
            Your data will <strong>never</strong> be sold, shared for commercial
            purposes, or used for advertising.
          </p>
        </Section>

        {/* Section 4 */}
        <Section title="4. Who receives your data?">
          <p>Your data is processed by two external services:</p>
          <div className="space-y-4 mt-2">
            <InfoBox>
              <strong>Supabase Inc.</strong> (United States / EU region)
              <br />
              Stores your account information, profile, and conversation
              history in a secure database. Supabase is compliant with GDPR and
              processes data under Standard Contractual Clauses.
              <br />
              <a
                href="https://supabase.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 underline"
              >
                Supabase Privacy Policy
              </a>
            </InfoBox>
            <InfoBox>
              <strong>OpenAI LLC</strong> (United States)
              <br />
              Processes your voice audio in real-time to power the AI
              conversation assistant. Audio is sent to OpenAI&rsquo;s API and
              is not stored by OpenAI for training purposes under the API usage
              terms.
              <br />
              <a
                href="https://openai.com/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-700 underline"
              >
                OpenAI Privacy Policy
              </a>
            </InfoBox>
          </div>
          <p className="mt-3 text-gray-700">
            No other third parties receive your personal data.
          </p>
        </Section>

        {/* Section 5 */}
        <Section title="5. How long do we keep your data?">
          <p>
            Your data will be kept for a <strong>maximum of 5 years</strong>{" "}
            from the date your account is created, as required by the UCM
            Ethics Committee approval.
          </p>
          <p className="mt-2 text-gray-700">
            After that period, all personal data will be permanently deleted or
            anonymised so it can no longer be linked to you.
          </p>
          <p className="mt-2 text-gray-700">
            You can also request deletion of your data at any time &mdash; see
            Section 6 below.
          </p>
        </Section>

        {/* Section 6 */}
        <Section title="6. Your rights under GDPR">
          <p>
            Under EU Regulation 2016/679 (GDPR) and Spanish Organic Law 3/2018
            (LOPDGDD), you have the following rights:
          </p>
          <ul className="list-disc ml-6 space-y-2 text-gray-800 mt-2">
            <li>
              <strong>Right of access</strong> &mdash; you can ask us to send
              you a copy of all the data we hold about you. Use the
              &ldquo;Download My Data&rdquo; button in your account settings.
            </li>
            <li>
              <strong>Right to rectification</strong> &mdash; you can correct
              any inaccurate information in your profile at any time via account
              settings.
            </li>
            <li>
              <strong>Right to erasure (&ldquo;right to be
              forgotten&rdquo;)</strong> &mdash; you can permanently delete your
              account and all associated data. Use the &ldquo;Delete My Account
              &amp; Data&rdquo; button in your account settings.
            </li>
            <li>
              <strong>Right to data portability</strong> &mdash; you can
              download your data in a machine-readable format (JSON) using the
              &ldquo;Download My Data&rdquo; button.
            </li>
            <li>
              <strong>Right to object</strong> &mdash; you can object to the
              processing of your data for research purposes at any time by
              contacting us at{" "}
              <a
                href="mailto:bernardm@ucm.es"
                className="text-green-700 underline"
              >
                bernardm@ucm.es
              </a>
              .
            </li>
            <li>
              <strong>Right to withdraw consent</strong> &mdash; you gave your
              consent when you registered. You can withdraw it at any time by
              deleting your account, with no negative consequences.
            </li>
          </ul>
          <p className="mt-4 text-gray-700">
            To exercise any of these rights, you can use the in-app tools in
            your account settings, or contact us directly:
          </p>
          <InfoBox>
            <strong>Bernardo Morales Mateo</strong>
            <br />
            Email:{" "}
            <a
              href="mailto:bernardm@ucm.es"
              className="text-green-700 underline"
            >
              bernardm@ucm.es
            </a>
            <br />
            UCM Ethics Committee reference: 663_CE_20260312_35_HUM
          </InfoBox>
          <p className="mt-3 text-gray-700">
            If you believe your data protection rights have not been respected,
            you also have the right to lodge a complaint with the Spanish Data
            Protection Authority (
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 underline"
            >
              AEPD &mdash; www.aepd.es
            </a>
            ).
          </p>
        </Section>

        {/* Section 7 */}
        <Section title="7. Legal basis for processing">
          <p>
            The legal basis for processing your personal data is your{" "}
            <strong>informed and freely given consent</strong>, provided when
            you registered for this study (Article 6(1)(a) GDPR, and Article
            9(2)(a) for any research-related data).
          </p>
          <p className="mt-2 text-gray-700">
            Processing for scientific research purposes is additionally
            supported by Article 89 GDPR and Spanish Law 3/2018.
          </p>
        </Section>

        {/* Section 8 */}
        <Section title="8. Security">
          <p>
            Your data is stored in a password-protected, encrypted Supabase
            database. Access is restricted to the researcher and the database
            administrator. All connections use HTTPS encryption.
          </p>
        </Section>

        {/* Section 9 */}
        <Section title="9. Changes to this policy">
          <p>
            If we need to make significant changes to this Privacy Policy, we
            will notify you by email and ask for your consent again if required.
          </p>
        </Section>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-8 text-sm text-gray-500 space-y-1">
          <p>Governed by EU Regulation 2016/679 (GDPR) and Spanish Organic Law 3/2018 (LOPDGDD).</p>
          <p>UCM Ethics Committee approval reference: 663_CE_20260312_35_HUM</p>
          <p>
            Contact:{" "}
            <a href="mailto:bernardm@ucm.es" className="text-green-700 underline">
              bernardm@ucm.es
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small layout helpers                                                  */
/* ------------------------------------------------------------------ */

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-2xl font-bold text-gray-900 border-b border-gray-200 pb-2">
        {title}
      </h2>
      <div className="text-lg text-gray-800 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

function InfoBox({ children }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-base text-gray-800 leading-relaxed">
      {children}
    </div>
  );
}
