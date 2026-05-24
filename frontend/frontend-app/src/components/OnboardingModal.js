import React, { useState } from "react";
import { useLanguage } from "../LanguageContext";

// Versioned, user-keyed so each user gets their own flag and future flow
// changes can bump the version to show the new flow to everyone once.
const ONBOARDING_KEY_PREFIX = "onboarding-complete-v2";

function getOnboardingKey(userId) {
  return userId
    ? `${ONBOARDING_KEY_PREFIX}-${userId}`
    : ONBOARDING_KEY_PREFIX;
}

export function hasCompletedOnboarding(userId) {
  return localStorage.getItem(getOnboardingKey(userId)) === "true";
}

export function markOnboardingComplete(userId) {
  localStorage.setItem(getOnboardingKey(userId), "true");
}

// ─── Step icons ────────────────────────────────────────────────────────────────

function WelcomeIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-20 h-20" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#dcfce7" />
      <text x="32" y="42" textAnchor="middle" fontSize="28" fill="#16a34a">👋</text>
    </svg>
  );
}

function AIIcon() {
  return (
    <svg viewBox="0 0 64 64" className="w-20 h-20" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#dbeafe" />
      <text x="32" y="42" textAnchor="middle" fontSize="28" fill="#1d4ed8">🤖</text>
    </svg>
  );
}

// ─── App screenshot preview ────────────────────────────────────────────────────

function AppScreenshot({ src, alt, objectPosition = "center top" }) {
  return (
    <div className="w-full rounded-2xl overflow-hidden border border-gray-200 shadow-md">
      <img
        src={src}
        alt={alt}
        className="w-full h-40 sm:h-52 object-cover"
        style={{ objectPosition }}
      />
    </div>
  );
}

// ─── Step components ───────────────────────────────────────────────────────────

function StepWelcome({ t }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <WelcomeIcon />
      <h2 className="text-3xl font-bold text-gray-900 leading-tight">
        {t("onboarding.welcome.title")}
      </h2>
      <p className="text-xl text-gray-700 leading-relaxed max-w-sm">
        {t("onboarding.welcome.body")}
      </p>
    </div>
  );
}

function StepHowItWorks({ t }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <AIIcon />
      <h2 className="text-3xl font-bold text-gray-900 leading-tight">
        {t("onboarding.howItWorks.title")}
      </h2>
      <p className="text-xl text-gray-700 leading-relaxed max-w-sm">
        {t("onboarding.howItWorks.body1")}
      </p>
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-2xl px-5 py-4 w-full max-w-sm text-left">
        <span className="text-2xl" aria-hidden="true">💙</span>
        <span className="text-lg text-gray-700">
          {t("onboarding.howItWorks.body2")}
        </span>
      </div>
    </div>
  );
}

function StepMicTip({ t }) {
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <h2 className="text-3xl font-bold text-gray-900 leading-tight">
        {t("onboarding.micTip.title")}
      </h2>
      <AppScreenshot
        src="/onboarding/talk-screen.png"
        alt={t("onboarding.micTip.screenshotAlt")}
        objectPosition="center 70%"
      />
      <p className="text-xl text-gray-700 leading-relaxed max-w-sm">
        {t("onboarding.micTip.body")}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4">
          <span className="text-2xl" aria-hidden="true">✅</span>
          <span className="text-lg text-gray-800 text-left">
            {t("onboarding.micTip.tip1")}
          </span>
        </div>
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4">
          <span className="text-2xl" aria-hidden="true">✅</span>
          <span className="text-lg text-gray-800 text-left">
            {t("onboarding.micTip.tip2")}
          </span>
        </div>
      </div>
    </div>
  );
}

function StepReady({ t }) {
  return (
    <div className="flex flex-col items-center text-center gap-4">
      <h2 className="text-3xl font-bold text-gray-900 leading-tight">
        {t("onboarding.ready.title")}
      </h2>
      <AppScreenshot
        src="/onboarding/starters-screen.png"
        alt={t("onboarding.ready.screenshotAlt")}
        objectPosition="center 50%"
      />
      <p className="text-xl text-gray-700 leading-relaxed max-w-sm">
        {t("onboarding.ready.body")}
      </p>
    </div>
  );
}

// ─── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`block rounded-full transition-all duration-300 ${
            i === current ? "w-4 h-4 bg-green-600" : "w-3 h-3 bg-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main modal ────────────────────────────────────────────────────────────────

export function OnboardingModal({ userId, onComplete }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const TOTAL_STEPS = 4;
  const isLastStep = step === TOTAL_STEPS - 1;

  const handleComplete = () => {
    markOnboardingComplete(userId);
    onComplete();
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else handleComplete();
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const stepContent = [
    <StepWelcome key="welcome" t={t} />,
    <StepHowItWorks key="how" t={t} />,
    <StepMicTip key="mic" t={t} />,
    <StepReady key="ready" t={t} />,
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.ariaLabel")}
    >
      {/* Modal shell: full-screen on mobile, centered card on sm+.
          Outer container does NOT scroll — only the middle region does.
          Using h-full + max-h with dvh so iOS Safari URL bar doesn't clip the footer. */}
      <div className="bg-white shadow-2xl w-full max-w-md flex flex-col relative
                      h-full max-h-[100dvh] rounded-none
                      sm:h-auto sm:max-h-[90vh] sm:rounded-3xl">

        {/* Skip — absolute, padded for 44px+ touch target.
            Lives above the scroll region so it stays put while content scrolls. */}
        {!isLastStep && (
          <button
            onClick={handleComplete}
            className="absolute top-3 right-3 z-10 p-3 text-gray-400 hover:text-gray-600 text-lg font-semibold transition-colors"
            aria-label={t("onboarding.skipAriaLabel")}
          >
            {t("onboarding.skip")}
          </button>
        )}

        {/* Scrollable step content — the ONLY scroll surface.
            min-h-0 is required so flex-1 can shrink below content size and let overflow kick in.
            aria-live so screen readers announce new steps. */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-6 pt-12 pb-6 sm:px-8 sm:pt-14"
          aria-live="polite"
        >
          {stepContent[step]}
        </div>

        {/* Sticky footer: progress dots + nav buttons.
            Pinned outside the scroll area so users can always tap Next/Back.
            Top border separates it visually when content scrolls behind. */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-4 sm:px-8 sm:py-5 sm:rounded-b-3xl flex flex-col gap-4">
          <ProgressDots total={TOTAL_STEPS} current={step} />

          <div className="flex items-center gap-3">
            {step > 0 ? (
              <button
                onClick={handleBack}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-300 text-gray-700 text-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                {t("common.back")}
              </button>
            ) : (
              <div className="flex-1" aria-hidden="true" />
            )}

            <button
              onClick={handleNext}
              className="flex-1 py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-xl font-bold transition-colors shadow-lg"
              autoFocus
            >
              {isLastStep ? t("onboarding.ready.startButton") : t("common.next")}
            </button>
          </div>
        </div>

        <span className="sr-only">
          {t("onboarding.stepCounter", { current: step + 1, total: TOTAL_STEPS })}
        </span>
      </div>
    </div>
  );
}
