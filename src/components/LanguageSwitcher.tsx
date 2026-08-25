import React from 'react';
import { Globe } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

const LanguageSwitcher = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-700"
      aria-label="Toggle Language"
    >
      <Globe size={20} className="text-brand-dark" />
      <span className="text-sm font-medium hidden sm:inline-block">
        {language === 'ar' ? 'English' : 'العربية'}
      </span>
    </button>
  );
};

export default LanguageSwitcher;
