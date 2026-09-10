import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const LANGUAGES = [
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'fr', label: 'Français', short: 'FR' },
];

export const SUPPORTED = LANGUAGES.map(l => l.code);

/**
 * Language setup.
 *
 * Detection order matters: a stored choice always beats the browser, because
 * someone who has explicitly picked a language should not have it overridden
 * on their next visit. Falls back to English when the browser reports anything
 * we do not carry.
 *
 * `fr-CM`, `fr-FR` and so on all resolve to `fr` — Cameroonian browsers
 * commonly report a region, and without this they would silently get English.
 */
i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources: {
            en: { translation: en },
            fr: { translation: fr },
        },
        fallbackLng: 'en',
        supportedLngs: SUPPORTED,
        nonExplicitSupportedLngs: true,   // fr-CM -> fr
        load: 'languageOnly',
        detection: {
            order: ['localStorage', 'navigator', 'htmlTag'],
            lookupLocalStorage: 'language',
            caches: ['localStorage'],
        },
        interpolation: { escapeValue: false }, // React already escapes
        returnEmptyString: false,              // an empty string falls back to English
    });

/** Keep the document in step, for screen readers and for search engines. */
function syncDocumentLang(lng) {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = SUPPORTED.includes(lng) ? lng : 'en';
    }
}
syncDocumentLang(i18n.resolvedLanguage);
i18n.on('languageChanged', syncDocumentLang);

export default i18n;
