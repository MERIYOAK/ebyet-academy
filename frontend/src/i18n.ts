import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import tgTranslation from './locales/tg/translation.json';
import enTranslation from './locales/en/translation.json';


// Get stored language from localStorage or default to Tigrinya
const getStoredLanguage = (): string => {
  const stored = localStorage.getItem('i18nextLng');
  if (stored && (stored === 'tg' || stored === 'en')) {
    return stored;
  }
  return 'tg'; // Default to Tigrinya
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tg: {
        translation: tgTranslation
      },
      en: {
        translation: enTranslation
      }
    },
    lng: getStoredLanguage(), // Default language
    fallbackLng: 'tg', // Fallback to Tigrinya if translation is missing
    debug: true, // Set to true for development debugging
    reloadOnPrerender: true, // Reload resources on prerender
    saveMissing: false, // Don't save missing keys

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      // Order and from where user language should be detected
      order: ['localStorage', 'navigator', 'htmlTag'],

      // Keys or params to lookup language from
      lookupLocalStorage: 'i18nextLng',
      lookupFromPathIndex: 0,
      lookupFromSubdomainIndex: 0,

      // Cache user language on
      caches: ['localStorage'],
      excludeCacheFor: ['cimode'], // Languages to not persist (cookie, localStorage)

      // Optional expire and domain for set cookie
      cookieMinutes: 10,
      cookieDomain: 'myDomain',

      // Optional htmlTag with lang attribute, the default is:
      htmlTag: document.documentElement,

      // Optional set cookie options, reference:[MDN Set-Cookie docs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
      cookieOptions: { path: '/', sameSite: 'strict' }
    },

    react: {
      useSuspense: false, // This is important for SSR
    }
  });

// Function to change language and store in localStorage
export const changeLanguage = (language: 'tg' | 'en') => {
  i18n.changeLanguage(language);
  localStorage.setItem('i18nextLng', language);
};

// Function to get current language
export const getCurrentLanguage = (): 'tg' | 'en' => {
  return i18n.language as 'tg' | 'en';
};

// Function to get language display name
export const getLanguageDisplayName = (language: 'tg' | 'en'): string => {
  const key = language === 'tg' ? 'language.tigrinya' : 'language.english';
  return i18n.t(key);
};

export default i18n;
