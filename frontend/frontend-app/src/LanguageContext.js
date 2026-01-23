import React, { createContext, useContext, useState, useEffect } from 'react';

// Import translations
import en from './locales/en.json';
import es from './locales/es.json';

const translations = { en, es };

const LanguageContext = createContext();

// Detect browser language - Spanish if es/es-*, English otherwise
function detectLanguage() {
  const stored = localStorage.getItem('app-language');
  if (stored && (stored === 'es' || stored === 'en')) {
    return stored;
  }

  const browserLang = navigator.language || navigator.userLanguage || 'en';
  // Check if browser is Spanish (es, es-ES, es-MX, etc.)
  if (browserLang.startsWith('es')) {
    return 'es';
  }
  return 'en';
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(detectLanguage);

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  // Translation function with nested key support (e.g., "nav.talk")
  const t = (key, params = {}) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback to English if key not found
        value = translations['en'];
        for (const k2 of keys) {
          if (value && typeof value === 'object' && k2 in value) {
            value = value[k2];
          } else {
            // Key not found in any language, return key itself
            console.warn(`Translation missing: ${key}`);
            return key;
          }
        }
        break;
      }
    }

    // Replace parameters like {name} with actual values
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, paramName) => {
        return params[paramName] !== undefined ? params[paramName] : match;
      });
    }

    return value || key;
  };

  const value = {
    language,
    setLanguage,
    t,
    isSpanish: language === 'es'
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
