import React from "react";

export const AppIcon = () => (
  <div className="h-12 w-12 rounded-xl grid place-items-center bg-green-600 text-white">
    <span className="font-extrabold text-2xl">A</span>
  </div>
);

export const UserIcon = () => (
  <svg className="w-6 h-6 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

export const MicIcon = ({ size = 32, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className={className}>
    <rect x="9" y="2" width="6" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M5 11a7 7 0 0 0 14 0" stroke="currentColor" strokeWidth="2" />
    <path d="M12 19v3" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const StopIcon = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </svg>
);

export const BookIcon = ({ className = "" }) => (
  <svg className={`w-8 h-8 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v15H6.5A2.5 2.5 0 0 1 4 14.5v-10A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

export const ChartIcon = ({ className = "" }) => (
  <svg className={`w-8 h-8 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20V10"/>
    <path d="M18 20V4"/>
    <path d="M6 20v-4"/>
  </svg>
);

export const AdminIcon = ({ className = "" }) => (
  <svg className={`w-8 h-8 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path d="M2 17l10 5 10-5"/>
    <path d="M2 12l10 5 10-5"/>
  </svg>
);

export const CheckIcon = () => (
  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

export const NextStepIcon = () => (
  <svg className="w-6 h-6 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
  </svg>
);
