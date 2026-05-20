import React from "react";
import { TIER_LIMITS } from "../config/constants";
import { StopIcon } from "./icons";

export function ListeningView({ onStop, cardTheme, subtleText, fontSizes, liveTranscript, usageRemaining, userTier, isAdmin, elapsedSeconds }) {
  const formatElapsedTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <section aria-label="Listening to your speech" className="flex flex-col gap-6 h-full">
      {isAdmin ? (
        <div className="bg-green-50 dark:bg-green-900/30 border-2 border-green-600 dark:border-green-700 rounded-xl p-2 shadow-md">
          <p className="text-sm text-center font-extrabold text-gray-900 dark:text-green-100">
            ✨ Unlimited (Admin) • Time: {formatElapsedTime(elapsedSeconds)}
          </p>
        </div>
      ) : usageRemaining !== -1 && usageRemaining <= 2 ? (
        <div className="bg-orange-100 dark:bg-orange-900 border border-orange-300 dark:border-orange-700 rounded-xl p-3">
          <p className="text-sm font-semibold text-orange-800 dark:text-orange-100">
            ⚠️ Only {usageRemaining} {usageRemaining === 1 ? 'minute' : 'minutes'} remaining • Elapsed: {formatElapsedTime(elapsedSeconds)}
          </p>
        </div>
      ) : usageRemaining !== -1 && usageRemaining > 2 ? (
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-2">
          <p className="text-xs text-center text-blue-700 dark:text-blue-200">
            {usageRemaining} min remaining ({TIER_LIMITS[userTier].name}) • Elapsed: {formatElapsedTime(elapsedSeconds)}
          </p>
        </div>
      ) : null}

      <div className={`flex-1 flex flex-col justify-center items-center text-center rounded-3xl border p-8 ${cardTheme}`}>
        <h2 className={`${fontSizes.xxxl} font-bold mb-2`}>I'm listening...</h2>
        <p className={`${subtleText} ${fontSizes.lg} mb-8`}>Your words will appear below.</p>
        <button
          onClick={onStop}
          className="w-48 h-48 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl"
          aria-label="Stop speaking"
        >
          <StopIcon />
        </button>
      </div>
      <div className={`rounded-3xl border p-5 ${cardTheme}`} aria-live="polite">
        <div className={`${subtleText} mb-2 ${fontSizes.base} font-semibold`}>Live Transcript</div>
        <p className={`leading-relaxed ${fontSizes.xxl} min-h-[3em]`}>{liveTranscript}</p>
      </div>
    </section>
  );
}
