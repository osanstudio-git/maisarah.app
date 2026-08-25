import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Update the document direction based on language
    const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
  };

  return {
    language: i18n.language,
    toggleLanguage,
    changeLanguage: i18n.changeLanguage,
    isRtl: i18n.language === 'ar'
  };
};
