import React from "react";
import { useLanguage } from "../LanguageContext";

/**
 * PrivacyPolicy.js
 *
 * Standalone page accessible at /privacy (no login required).
 * Fully translated via the app's language system (EN/ES).
 * Complies with EU GDPR 2016/679 and Spanish Organic Law 3/2018 (LOPDGDD).
 *
 * Study reference: 663_CE_20260312_35_HUM (UCM Ethics Committee)
 */
export function PrivacyPolicy() {
  const { t } = useLanguage();

  return (
    <div className="bg-gray-50 min-h-screen text-gray-900">
      {/* Header bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <a
          href="/"
          className="text-green-700 font-bold text-lg hover:underline flex items-center gap-2"
          aria-label={t("privacy.backToApp")}
        >
          &#8592; {t("privacy.backToApp")}
        </a>
        <span className="text-gray-500 text-sm">{t("privacy.headerLabel")}</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Title */}
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            {t("privacy.title")}
          </h1>
          <p className="text-base text-gray-500">
            {t("privacy.lastUpdated")}{" "}
            <strong>663_CE_20260312_35_HUM</strong>
          </p>
        </div>

        {/* Section 1 */}
        <Section title={t("privacy.s1title")}>
          <p>{t("privacy.s1p1")}</p>
          <InfoBox>
            <strong>Bernardo Morales Mateo</strong>
            <br />
            {t("privacy.s1role")}
            <br />
            {t("privacy.s1institution")}
            <br />
            Email:{" "}
            <a href="mailto:bernardm@ucm.es" className="text-green-700 underline">
              bernardm@ucm.es
            </a>
          </InfoBox>
          <p>
            {t("privacy.s1p2")}{" "}
            <strong>663_CE_20260312_35_HUM</strong>.
          </p>
        </Section>

        {/* Section 2 */}
        <Section title={t("privacy.s2title")}>
          <p>{t("privacy.s2intro")}</p>
          <ul className="list-disc ml-6 space-y-2 text-gray-800">
            <li><strong>{t("privacy.s2item1title")}</strong> &mdash; {t("privacy.s2item1")}</li>
            <li><strong>{t("privacy.s2item2title")}</strong> &mdash; {t("privacy.s2item2")}</li>
            <li><strong>{t("privacy.s2item3title")}</strong> &mdash; {t("privacy.s2item3")}</li>
            <li><strong>{t("privacy.s2item4title")}</strong> &mdash; {t("privacy.s2item4")}</li>
          </ul>
          <p className="mt-3 text-gray-700">{t("privacy.s2note")}</p>
        </Section>

        {/* Section 3 */}
        <Section title={t("privacy.s3title")}>
          <p>{t("privacy.s3intro")}</p>
          <ul className="list-disc ml-6 space-y-2 text-gray-800">
            <li>{t("privacy.s3item1")}</li>
            <li>{t("privacy.s3item2")}</li>
            <li>{t("privacy.s3item3")}</li>
          </ul>
          <p className="mt-3 text-gray-700">{t("privacy.s3note")}</p>
        </Section>

        {/* Section 4 */}
        <Section title={t("privacy.s4title")}>
          <p>{t("privacy.s4intro")}</p>
          <div className="space-y-4 mt-2">
            <InfoBox>
              <strong>Supabase Inc.</strong> (United States / EU region)
              <br />
              {t("privacy.s4supabase")}
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
              {t("privacy.s4openai")}
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
          <p className="mt-3 text-gray-700">{t("privacy.s4note")}</p>
        </Section>

        {/* Section 5 */}
        <Section title={t("privacy.s5title")}>
          <p>{t("privacy.s5p1")}</p>
          <p className="mt-2 text-gray-700">{t("privacy.s5p2")}</p>
          <p className="mt-2 text-gray-700">{t("privacy.s5p3")}</p>
        </Section>

        {/* Section 6 */}
        <Section title={t("privacy.s6title")}>
          <p>{t("privacy.s6intro")}</p>
          <ul className="list-disc ml-6 space-y-2 text-gray-800 mt-2">
            <li><strong>{t("privacy.s6r1title")}</strong> &mdash; {t("privacy.s6r1")}</li>
            <li><strong>{t("privacy.s6r2title")}</strong> &mdash; {t("privacy.s6r2")}</li>
            <li><strong>{t("privacy.s6r3title")}</strong> &mdash; {t("privacy.s6r3")}</li>
            <li><strong>{t("privacy.s6r4title")}</strong> &mdash; {t("privacy.s6r4")}</li>
            <li>
              <strong>{t("privacy.s6r5title")}</strong> &mdash; {t("privacy.s6r5")}{" "}
              <a href="mailto:bernardm@ucm.es" className="text-green-700 underline">
                bernardm@ucm.es
              </a>.
            </li>
            <li><strong>{t("privacy.s6r6title")}</strong> &mdash; {t("privacy.s6r6")}</li>
          </ul>
          <p className="mt-4 text-gray-700">{t("privacy.s6contact")}</p>
          <InfoBox>
            <strong>Bernardo Morales Mateo</strong>
            <br />
            Email:{" "}
            <a href="mailto:bernardm@ucm.es" className="text-green-700 underline">
              bernardm@ucm.es
            </a>
            <br />
            UCM Ethics Committee reference: 663_CE_20260312_35_HUM
          </InfoBox>
          <p className="mt-3 text-gray-700">
            {t("privacy.s6aepd")}{" "}
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 underline"
            >
              www.aepd.es
            </a>
          </p>
        </Section>

        {/* Section 7 */}
        <Section title={t("privacy.s7title")}>
          <p>{t("privacy.s7p1")}</p>
          <p className="mt-2 text-gray-700">{t("privacy.s7p2")}</p>
        </Section>

        {/* Section 8 */}
        <Section title={t("privacy.s8title")}>
          <p>{t("privacy.s8p1")}</p>
        </Section>

        {/* Section 9 */}
        <Section title={t("privacy.s9title")}>
          <p>{t("privacy.s9p1")}</p>
        </Section>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-8 text-sm text-gray-500 space-y-1">
          <p>{t("privacy.footerLaw")}</p>
          <p>{t("privacy.footerRef")}</p>
          <p>
            {t("privacy.footerContact")}{" "}
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
