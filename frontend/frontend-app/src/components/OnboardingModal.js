import React, { useState } from "react";
import { useLanguage } from "../LanguageContext";

// localStorage key — versioned so future flow changes can reset the flag
const ONBOARDING_KEY = "onboarding-complete-v1";

/**
 * Returns true if this user has already completed onboarding.
 * Called in App.js to decide whether to mount the modal.
 */
export function hasCompletedOnboarding() {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

/**
 * Marks onboarding as complete and persists it to localStorage.
 * Extracted so tests and future flows can call it directly.
 */
export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

// ─── Step icons — inline SVG, no external dependency ──────────────────────────

function WelcomeIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="w-20 h-20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill="#dcfce7" />
      <text x="32" y="42" textAnchor="middle" fontSize="28" fill="#16a34a">
        👋
      </text>
    </svg>
  );
}

function HowItWorksIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="w-20 h-20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill="#dbeafe" />
      <text x="32" y="42" textAnchor="middle" fontSize="28" fill="#1d4ed8">
        💬
      </text>
    </svg>
  );
}

function MicTipIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="w-20 h-20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill="#fef9c3" />
      <text x="32" y="42" textAnchor="middle" fontSize="28" fill="#a16207">
        🎧
      </text>
    </svg>
  );
}

function ReadyIcon() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="w-20 h-20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="30" fill="#dcfce7" />
      <text x="32" y="42" textAnchor="middle" fontSize="28" fill="#16a34a">
        🚀
      </text>
    </svg>
  );
}

// ─── Individual step components ────────────────────────────────────────────────

function StepWelcome({ t }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <WelcomeIcon />
      <h2 className="text-3xl font-bold text-gray-900 leading-tight">
        {t("onboarding.welcome.title")}
      </h2>
      <p className="text-xl text-gray-600 leading-relaxed max-w-sm">
        {t("onboarding.welcome.body")}
      </p>
    </div>
  );
}

function StepHowItWorks({ t }) {
  const steps = [
    {
      icon: "📚",
      label: t("onboarding.howItWorks.step1"),
    },
    {
      icon: "🎙️",
      label: t("onboarding.howItWorks.step2"),
    },
    {
      icon: "🗣️",
      label: t("onboarding.howItWorks.step3"),
    },
  ];

  return (
    <div className="flex flex-col items-center text-center gap-5">
      <HowItWorksIcon />
      <h2 className="text-3xl font-bold text-gray-900 leading-tight">
        {t("onboarding.howItWorks.title")}
      </h2>
      <ol className="flex flex-col gap-4 w-full max-w-sm text-left">
        {steps.map((step, index) => (
          <li
            key={index}
            className="flex items-center gap-4 bg-blue-50 rounded-2xl px-5 py-4"
          >
            {/* Step number badge */}
            <span className="flex-shrink-0 w-9 h-9 rounded-full bg-blue-600 text-white text-lg font-bold flex items-center justify-center">
              {index + 1}
            </span>
            <span className="text-xl text-gray-800 leading-snug">
              {step.icon} {step.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StepMicTip({ t }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <MicTipIcon />
      <h2 className="text-3xl font-bold text-gray-900 leading-tight">
        {t("onboarding.micTip.title")}
      </h2>
      <p className="text-xl text-gray-600 leading-relaxed max-w-sm">
        {t("onboarding.micTip.body")}
      </p>
      {/* Visual tip callout */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4">
          <span className="text-2xl" aria-hidden="true">
            ✅
          </span>
          <span className="text-lg text-gray-800 text-left">
            {t("onboarding.micTip.tip1")}
          </span>
        </div>
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4">
          <span className="text-2xl" aria-hidden="true">
            ✅
          </span>
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
    <div className="flex flex-col items-center text-center gap-5">
      <ReadyIcon />
      <h2 className="text-3xl font-bold text-gray-900 leading-tight">
        {t("onboarding.ready.title")}
      </h2>
      <p className="text-xl text-gray-600 leading-relaxed max-w-sm">
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
            i === current
              ? "w-4 h-4 bg-green-600"
              : "w-3 h-3 bg-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main modal component ──────────────────────────────────────────────────────

/**
 * OnboardingModal — 4-step first-login walkthrough.
 *
 * Props:
 *   onComplete: () => void  — called when the user finishes or skips
 */
export function OnboardingModal({ onComplete }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const TOTAL_STEPS = 4;

  const handleComplete = () => {
    markOnboardingComplete();
    onComplete();
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  };

  const isLastStep = step === TOTAL_STEPS - 1;

  // Map step index to its content component
  const stepContent = [
    <StepWelcome key="welcome" t={t} />,
    <StepHowItWorks key="how" t={t} />,
    <StepMicTip key="mic" t={t} />,
    <StepReady key="ready" t={t} />,
  ];

  return (
    // Overlay — clicking outside does nothing; user must use buttons (intentional
    // UX: prevents accidental dismissal by a user who is not familiar with modals)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.ariaLabel")}
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col gap-6 p-8 relative">

        {/* Skip button — visible on all steps except the last */}
        {!isLastStep && (
          <button
            onClick={handleComplete}
            className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 text-lg font-semibold transition-colors"
            aria-label={t("onboarding.skipAriaLabel")}
          >
            {t("onboarding.skip")}
          </button>
        )}

        {/* Step content */}
        <div className="min-h-[340px] flex flex-col justify-center">
          {stepContent[step]}
        </div>

        {/* Progress dots */}
        <ProgressDots total={TOTAL_STEPS} current={step} />

        {/* Navigation buttons */}
        <div className="flex items-center gap-3">
          {/* Back button — hidden on step 0 */}
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="flex-1 py-4 rounded-2xl border-2 border-gray-300 text-gray-700 text-xl font-semibold hover:bg-gray-50 transition-colors"
            >
              {t("common.back")}
            </button>
          ) : (
            // Invisible placeholder keeps layout stable
            <div className="flex-1" aria-hidden="true" />
          )}

          {/* Next / Start button */}
          <button
            onClick={handleNext}
            className="flex-1 py-4 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-xl font-bold transition-colors shadow-lg"
            autoFocus
          >
            {isLastStep
              ? t("onboarding.ready.startButton")
              : t("common.next")}
          </button>
        </div>

        {/* Accessible step counter — read by screen readers, hidden visually */}
        <span className="sr-only">
          {t("onboarding.stepCounter", {
            current: step + 1,
            total: TOTAL_STEPS,
          })}
        </span>
      </div>
    </div>
  );
}
