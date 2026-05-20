import React from 'react';
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

function TourPill({ label, left }) {
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{ bottom: '68px', left, transform: 'translateX(-50%)', pointerEvents: 'none' }}
    >
      <div className="bg-white rounded-full px-3 py-1.5 shadow-lg text-sm font-semibold text-gray-800 whitespace-nowrap">
        {label}
      </div>
      {/* Arrow pointing down to the nav tab */}
      <div
        className="animate-bounce mt-1"
        style={{
          width: 0, height: 0,
          borderLeft: '7px solid transparent',
          borderRight: '7px solid transparent',
          borderTop: '10px solid white',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))',
        }}
      />
    </div>
  );
}

export function AppTour({ userId, onComplete }) {
  const { t } = useLanguage();

  const finish = () => {
    markTourComplete(userId);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50">
      {/* Dim overlay — blocks accidental taps, no click-to-dismiss */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Pill above Starters tab (1st of 3 cols → 16.67% from left) */}
      <TourPill label={`📚 ${t('onboarding.tour.startersLabel')}`} left="16.67%" />

      {/* Pill above Talk tab (2nd of 3 cols → 50% from left) */}
      <TourPill label={`🎙️ ${t('onboarding.tour.talkLabel')}`} left="50%" />

      {/* Pill above Progress tab (3rd of 3 cols → 83.33% from left) */}
      <TourPill label={`📈 ${t('onboarding.tour.progressLabel')}`} left="83.33%" />

      {/* Got it button — centered above the pills */}
      <div className="absolute" style={{ bottom: '160px', left: '50%', transform: 'translateX(-50%)' }}>
        <button
          onClick={finish}
          className="bg-green-600 hover:bg-green-700 text-white font-bold text-base px-7 py-3 rounded-full shadow-xl transition-colors"
          autoFocus
        >
          {t('onboarding.tour.gotIt')} ✓
        </button>
      </div>
    </div>
  );
}
