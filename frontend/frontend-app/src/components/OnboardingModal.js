import React, { useState } from "react";
import { useLanguage } from "../LanguageContext";

// Versioned, user-keyed so each user gets their own flag.
// Bump the version suffix (v3 → v4) to force the flow to re-show for everyone
// after a significant content change.
const ONBOARDING_KEY_PREFIX = "onboarding-complete-v3";

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

// ─── Step 1 icon ──────────────────────────────────────────────────────────────
// Wave hand rendered as an SVG path — not emoji inside <text> — for reliable
// rendering on iOS Safari.

function WaveIcon() {
  return (
    <div
      className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center"
      aria-hidden="true"
    >
      {/* Hand-wave SVG path */}
      <svg
        viewBox="0 0 48 48"
        className="w-14 h-14"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Palm */}
        <path
          d="M20 36c-1 0-2-.5-2.5-1.5L11 22a2 2 0 0 1 3.6-1.7l3.4 7V12a2 2 0 0 1 4 0v12h1V10a2 2 0 0 1 4 0v14h1V13a2 2 0 0 1 4 0v14l.5-2a2 2 0 0 1 3.9 1l-2 8c-1 4-4.7 6-8.4 6H20z"
          fill="#16a34a"
        />
        {/* Sleeve cuff hint */}
        <path
          d="M14 20.5c-.6-1.1-.4-2.5.6-3.3"
          stroke="#15803d"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

// ─── App screenshot preview ────────────────────────────────────────────────────
// objectPosition lets us crop the right area of each screenshot.

function AppScreenshot({ src, alt, objectPosition = "center top" }) {
  return (
    <div className="w-full rounded-2xl overflow-hidden border-2 border-gray-300 shadow-md">
      <img
        src={src}
        alt={alt}
        className="w-full h-44 sm:h-56 object-cover"
        style={{ objectPosition }}
        loading="eager"
      />
    </div>
  );
}

// ─── Reassurance callout ───────────────────────────────────────────────────────
// Used on Step 2 to address the two primary fears: "what if it doesn't
// understand me?" and "what if I make mistakes?"

function ReassuranceCallout({ text }) {
  return (
    <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 w-full max-w-sm text-left">
      {/* Heart rendered as a styled span, not inside SVG, for iOS reliability */}
      <span className="text-2xl leading-none mt-0.5" aria-hidden="true">
        💚
      </span>
      <span className="text-lg text-gray-700 leading-snug">{text}</span>
    </div>
  );
}

// ─── Step components ───────────────────────────────────────────────────────────
// Each step is self-contained. No local state, no navigation logic.
// Props: { t } — the translation function from useLanguage().

function StepWelcome({ t }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <WaveIcon />
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
      <h2 className="text-3xl font-bold text-gray-900 leading-tight">
        {t("onboarding.howItWorks.title")}
      </h2>
      {/* Show the actual app screen — the user sees the exact button they
          will press. More powerful than any illustration. */}
      <AppScreenshot
        src="/onboarding/talk-screen.png"
        alt={t("onboarding.howItWorks.screenshotAlt")}
        objectPosition="center 55%"
      />
      <p className="text-xl text-gray-700 leading-relaxed max-w-sm">
        {t("onboarding.howItWorks.body")}
      </p>
      {/* Addresses "what if it doesn't understand me?" and "what if I make
          mistakes?" — the two fears most common in this user group. */}
      <ReassuranceCallout text={t("onboarding.howItWorks.reassurance")} />
    </div>
  );
}

function StepReady({ t }) {
  return (
    <div className="flex flex-col items-center text-center gap-5">
      <h2 className="text-3xl font-bold text-gray-900 leading-tight">
        {t("onboarding.ready.title")}
      </h2>
      {/* Show the Starters screen so the user is not surprised by it later */}
      <AppScreenshot
        src="/onboarding/starters-screen.png"
        alt={t("onboarding.ready.screenshotAlt")}
        objectPosition="center 25%"
      />
      <p className="text-xl text-gray-700 leading-relaxed max-w-sm">
        {t("onboarding.ready.body")}
      </p>
    </div>
  );
}

// ─── Progress dots ─────────────────────────────────────────────────────────────
// Current step dot is larger and filled green. Inactive dots are smaller and gray.
// No animation — avoids motion issues for older users.

function ProgressDots({ total, current }) {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden="true">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`block rounded-full transition-all duration-200 ${
            i === current
              ? "w-4 h-4 bg-green-600"
              : "w-3 h-3 bg-gray-400"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Flow configuration ────────────────────────────────────────────────────────
// Add or remove a step here. Update TOTAL_STEPS to match the array length.
// Do not hard-code step logic anywhere else.

function buildSteps(t) {
  return [
    <StepWelcome key="welcome" t={t} />,
    <StepHowItWorks key="how" t={t} />,
    <StepReady key="ready" t={t} />,
  ];
}

const TOTAL_STEPS = 3;

// ─── Main modal ────────────────────────────────────────────────────────────────
// Full-screen on mobile, centered card on sm+.
// Backdrop does NOT close the modal — prevents accidental dismissal by users
// unfamiliar with modal UX conventions on mobile.

export function OnboardingModal({ userId, onComplete }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  const isFirstStep = step === 0;
  const isLastStep = step === TOTAL_STEPS - 1;

  const handleComplete = () => {
    markOnboardingComplete(userId);
    onComplete();
  };

  const handleNext = () => {
    if (!isLastStep) {
      setStep((s) => s + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (!isFirstStep) setStep((s) => s - 1);
  };

  const steps = buildSteps(t);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label={t("onboarding.ariaLabel")}
    >
      {/* Modal shell:
          - Mobile: full-screen (h-full, rounded-none)
          - sm+: centered card (sm:h-auto, sm:rounded-3xl)
          The outer container does NOT scroll. Only the inner content region scrolls.
          max-h uses dvh so iOS Safari's URL bar does not clip the footer. */}
      <div
        className="
          bg-white shadow-2xl w-full max-w-md flex flex-col relative
          h-full max-h-[100dvh] rounded-none
          sm:h-auto sm:max-h-[90vh] sm:rounded-3xl
        "
      >
        {/* Skip button — visually quiet to avoid competing with Next.
            44px touch target enforced by p-3.
            Hidden on the last step so the only call to action is "Let's Start!". */}
        {!isLastStep && (
          <button
            onClick={handleComplete}
            className="absolute top-4 right-4 z-10 p-3 min-h-[52px] min-w-[80px] text-gray-500 hover:text-gray-700 text-base font-medium transition-colors"
            aria-label={t("onboarding.skipAriaLabel")}
          >
            {t("onboarding.skip")}
          </button>
        )}

        {/* Scrollable content region — the ONLY scroll surface.
            min-h-0 is required for flex-1 to allow overflow on short-screen devices.
            aria-live so screen readers announce step changes. */}
        <div
          className="flex-1 min-h-0 overflow-y-auto px-6 pt-12 pb-6 sm:px-8 sm:pt-14"
          aria-live="polite"
        >
          {steps[step]}
        </div>

        {/* Sticky footer — pinned outside the scroll region.
            Users can always reach Back/Next regardless of scroll position.
            Back is hidden (replaced by a spacer) on Step 1 so the Next button
            stays right-aligned without layout shift. */}
        <div className="shrink-0 border-t border-gray-100 bg-white px-6 py-5 sm:px-8 sm:rounded-b-3xl flex flex-col gap-4">
          <ProgressDots total={TOTAL_STEPS} current={step} />

          <div className="flex items-center gap-3">
            {!isFirstStep ? (
              <button
                onClick={handleBack}
                className="flex-1 py-4 rounded-2xl border-2 border-gray-300 text-gray-700 text-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                {t("common.back")}
              </button>
            ) : (
              /* Invisible spacer keeps Next button right-aligned on Step 1 */
              <div className="flex-1" aria-hidden="true" />
            )}

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
        </div>

        {/* Screen reader step counter */}
        <span className="sr-only">
          {t("onboarding.stepCounter", { current: step + 1, total: TOTAL_STEPS })}
        </span>
      </div>
    </div>
  );
}
