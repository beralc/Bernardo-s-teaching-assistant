import React, { useState } from 'react';
import { useLanguage } from '../LanguageContext';

const TOUR_KEY_PREFIX = 'app-tour-complete-v3';

export function getTourKey(userId) {
  return `${TOUR_KEY_PREFIX}-${userId}`;
}

export function hasCompletedTour(userId) {
  if (!userId) return false;
  return localStorage.getItem(getTourKey(userId)) === 'true';
}

export function markTourComplete(userId) {
  if (!userId) return;
  localStorage.setItem(getTourKey(userId), 'true');
}

// Arrow pointing upward (toward content above the card)
function ArrowUp({ align = 'center' }) {
  const justify =
    align === 'left' ? 'justify-start pl-10' :
    align === 'right' ? 'justify-end pr-10' :
    'justify-center';

  return (
    <div className={`flex ${justify} w-full animate-bounce`}>
      <div
        style={{
          width: 0, height: 0,
          borderLeft: '18px solid transparent',
          borderRight: '18px solid transparent',
          borderBottom: '28px solid white',
          filter: 'drop-shadow(0 -2px 4px rgba(0,0,0,0.15))',
        }}
      />
    </div>
  );
}

// Arrow pointing downward (toward nav tab below the card)
function ArrowDown({ align = 'left' }) {
  const justify =
    align === 'left' ? 'justify-start pl-10' :
    align === 'right' ? 'justify-end pr-10' :
    'justify-center';

  return (
    <div className={`flex ${justify} w-full animate-bounce`}>
      <div
        style={{
          width: 0, height: 0,
          borderLeft: '18px solid transparent',
          borderRight: '18px solid transparent',
          borderTop: '28px solid white',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
        }}
      />
    </div>
  );
}

function ProgressDots({ total, current }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`block rounded-full transition-all duration-300 ${
            i === current ? 'w-4 h-4 bg-green-600' : 'w-3 h-3 bg-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

export function AppTour({ userId, onComplete }) {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);

  // arrow: null | { dir: 'up'|'down', align: 'left'|'center'|'right' }
  const steps = [
    {
      arrow: null,
      emoji: '👋',
      title: t('onboarding.welcome.title'),
      body: t('onboarding.welcome.body'),
    },
    {
      arrow: { dir: 'down', align: 'left' }, // → Starters tab (bottom-left)
      emoji: '📚',
      title: t('onboarding.tour.topicsTitle'),
      body: t('onboarding.tour.topicsBody'),
    },
    {
      arrow: { dir: 'up', align: 'center' }, // → mic button (centered above)
      emoji: '🎙️',
      title: t('onboarding.tour.micTitle'),
      body: t('onboarding.tour.micBody'),
    },
    {
      arrow: null,
      emoji: '🎉',
      title: t('onboarding.ready.title'),
      body: t('onboarding.ready.body'),
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const finish = () => {
    markTourComplete(userId);
    onComplete();
  };

  const handleNext = () => (isLast ? finish() : setStep(s => s + 1));
  const handleBack = () => { if (!isFirst) setStep(s => s - 1); };

  return (
    <div className="fixed inset-0 z-50">
      {/* Dimmed overlay — no click-to-dismiss, prevents accidental dismissal */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Tour card — sits above the bottom nav bar */}
      <div className="absolute bottom-20 left-0 right-0 px-4 pointer-events-none">
        <div className="max-w-sm mx-auto pointer-events-auto flex flex-col gap-0">

          {/* Arrow above card (pointing up toward content) */}
          {current.arrow?.dir === 'up' && (
            <ArrowUp align={current.arrow.align} />
          )}

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl p-6 relative">
            {/* Skip button */}
            {!isLast && (
              <button
                onClick={finish}
                className="absolute top-4 right-5 text-gray-400 hover:text-gray-600 text-base font-semibold"
              >
                {t('onboarding.skip')}
              </button>
            )}

            {/* Content */}
            <div className="text-center mb-5">
              <span className="text-5xl" role="img" aria-hidden="true">
                {current.emoji}
              </span>
              <h2 className="text-2xl font-bold text-gray-900 mt-3 mb-2 leading-tight">
                {current.title}
              </h2>
              <p className="text-lg text-gray-600 leading-relaxed">
                {current.body}
              </p>
            </div>

            <ProgressDots total={steps.length} current={step} />

            {/* Navigation */}
            <div className="flex gap-3 mt-5">
              {!isFirst ? (
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-300 text-gray-700 text-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  {t('common.back')}
                </button>
              ) : (
                <div className="flex-1" aria-hidden="true" />
              )}
              <button
                onClick={handleNext}
                className="flex-1 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white text-lg font-bold transition-colors shadow-md"
                autoFocus
              >
                {isLast ? t('onboarding.ready.startButton') : t('common.next')}
              </button>
            </div>
          </div>

          {/* Arrow below card (pointing down toward nav tab) */}
          {current.arrow?.dir === 'down' && (
            <ArrowDown align={current.arrow.align} />
          )}
        </div>
      </div>
    </div>
  );
}
