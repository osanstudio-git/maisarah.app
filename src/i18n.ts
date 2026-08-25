import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import arTranslation from './locales/ar.json';
import enTranslation from './locales/en.json';

const resources = {
  ar: {
    translation: arTranslation,
  },
  en: {
    translation: enTranslation,
  },
};

const savedLanguage = localStorage.getItem('appLanguage') || 'ar';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage, // Use saved language or default to Arabic
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safeguards from XSS
    },
  });

// Persist language changes to localStorage
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('appLanguage', lng);
});

export default i18n;
