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
      style={{ bottom: '64px', left, transform: 'translateX(-50%)', pointerEvents: 'none' }}
    >
      <div className="bg-white rounded-full px-3 py-1.5 shadow-lg text-sm font-semibold text-gray-800 whitespace-nowrap">
        {label}
      </div>
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

export function AppTour({ userId, isAdmin, onComplete }) {
  const { t } = useLanguage();

  const finish = () => {
    markTourComplete(userId);
    onComplete();
  };

  // Tab centers as % of screen width
  // 3 cols: 16.67 / 50 / 83.33
  // 4 cols: 12.5 / 37.5 / 62.5 / 87.5
  const cols = isAdmin ? 4 : 3;
  const colWidth = 100 / cols;
  const center = (i) => `${colWidth * i - colWidth / 2}%`; // 1-indexed

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" />

      <TourPill label={`📚 ${t('onboarding.tour.startersLabel')}`} left={center(1)} />
      <TourPill label={`🎙️ ${t('onboarding.tour.talkLabel')}`}     left={center(2)} />
      <TourPill label={`📈 ${t('onboarding.tour.progressLabel')}`}  left={center(3)} />

      {/* Got it button — vertically centered in the content area */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: '80px' }}>
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
