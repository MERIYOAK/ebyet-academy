import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Globe } from 'lucide-react';
import { changeLanguage, getCurrentLanguage, getLanguageDisplayName } from '../i18n';

const LanguageToggler: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const currentLanguage = getCurrentLanguage();

  const handleLanguageChange = (language: 'tg' | 'en') => {
    changeLanguage(language);
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center space-x-1 px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={t('language.toggle_language')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{getLanguageDisplayName(currentLanguage)}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div
            className="fixed inset-0 z-10 sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 sm:z-30">
            <div className="py-1" role="menu" aria-orientation="vertical">
              <button
                onClick={() => handleLanguageChange('tg')}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-200 ${
                  currentLanguage === 'tg' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 font-semibold'
                }`}
                role="menuitem"
              >
                {t('language.tigrinya')}
              </button>
              <button
                onClick={() => handleLanguageChange('en')}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors duration-200 ${
                  currentLanguage === 'en' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 font-semibold'
                }`}
                role="menuitem"
              >
                {t('language.english')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageToggler;
