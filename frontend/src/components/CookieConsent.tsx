import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { config } from '../config/environment';

const CONSENT_KEY = 'cookie_consent';

const loadGA = (measurementId: string) => {
  if (!measurementId || measurementId === 'G-XXXXXXXXXX') return;
  if (document.getElementById('ga4-script')) return;

  const script = document.createElement('script');
  script.async = true;
  script.id = 'ga4-script';
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  const inline = document.createElement('script');
  inline.id = 'ga4-inline';
  inline.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);} 
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(inline);
};

const removeGA = () => {
  const script = document.getElementById('ga4-script');
  if (script) script.remove();
  const inline = document.getElementById('ga4-inline');
  if (inline) inline.remove();
  // Clear dataLayer to stop further pushes
  // @ts-ignore
  window.dataLayer = [];
  // Override gtag to a no-op to prevent further sends
  // @ts-ignore
  window.gtag = function(){};
};

interface CookieConsentProps {
  measurementId?: string; // fallback if env missing
  onOpenSettingsRef?: React.MutableRefObject<(() => void) | null>;
}

const CookieConsent: React.FC<CookieConsentProps> = ({ measurementId = config.GA_MEASUREMENT_ID, onOpenSettingsRef }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<string | null>(null);

  const applyConsent = useCallback((value: 'true' | 'false') => {
    if (value === 'true') {
      // Only persist consent if user accepts
      localStorage.setItem(CONSENT_KEY, value);
      setConsent(value);
      setVisible(false);
      loadGA(measurementId || '');
    } else {
      // Remove any existing consent and hide banner temporarily
      localStorage.removeItem(CONSENT_KEY);
      setConsent('false');
      setVisible(false);
      removeGA();
    }
  }, [measurementId]);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'true') {
      // User has accepted cookies - don't show banner
      setConsent(stored);
      loadGA(measurementId || '');
    } else {
      // User has declined or no consent stored - show banner
      setConsent(stored || 'false');
      setVisible(true);
    }
  }, [measurementId]);

  useEffect(() => {
    if (onOpenSettingsRef) {
      onOpenSettingsRef.current = () => {
        setVisible(true);
      };
    }
  }, [onOpenSettingsRef]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 h-[15vh] min-h-[80px] w-full flex justify-center px-4 xs:pb-4 pb-2">
      <div className="bg-gray-900/95 backdrop-blur-xl border-t border-x border-cyan-800/50 xs:border-transparent h-full shadow-2xl shadow-cyan-500/20 w-full max-w-6xl rounded-t-2xl">
        <div className="h-full flex flex-col items-center justify-between px-2 py-2 xs:px-3 xs:py-3 sm:px-4 sm:py-4 md:px-6 md:py-4 lg:flex-row lg:px-8 lg:py-4">
          {/* Top section - Icon and Title */}
          <div className="flex items-center gap-2 xs:gap-3 mb-2 lg:mb-0 lg:flex-1">
            {/* Icon */}
            <div className="w-8 h-8 xs:w-10 xs:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-400/30 flex-shrink-0">
              <svg className="w-4 h-4 xs:w-5 xs:h-5 lg:w-6 lg:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a8 8 0 100 16 8 8 0 000-16zM8 7a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 4a1 1 0 100 2h2a1 1 0 100-2H9z"/>
              </svg>
            </div>
            
            {/* Title and subtitle */}
            <div className="text-center lg:text-left">
              <h3 className="text-white font-semibold text-sm xs:text-base lg:text-xl leading-tight">
                {t('cookie.title', 'Cookie Preferences')}
              </h3>
              <p className="text-gray-400 text-xs xs:text-sm mt-0.5">
                {t('cookie.subtitle', 'We respect your privacy')}
              </p>
            </div>
          </div>

          {/* Middle section - Message and Privacy link */}
          <div className="hidden sm:block text-center lg:text-left lg:flex-1 mb-2 lg:mb-0 px-2 lg:px-4">
            <p className="text-gray-300 text-xs xs:text-sm leading-tight mb-2">
              {t('cookie.banner_message', 'We use cookies to enhance your experience, analyze site traffic, and personalize content.')}
            </p>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open('/privacy-policy', '_blank');
              }}
              className="text-xs text-gray-400 hover:text-cyan-400 transition-colors duration-200 underline underline-offset-2"
            >
              {t('cookie.learn_more', 'Learn more')}
            </button>
          </div>

          {/* Bottom section - Actions */}
          <div className="flex flex-col xs:flex-row items-center gap-2 xs:gap-3 w-full lg:w-auto lg:flex-shrink-0">
            <div className="flex flex-row gap-2 xs:gap-3 w-full xs:w-auto">
              <button
                onClick={() => applyConsent('false')}
                className="flex-1 xs:flex-none px-3 py-2 xs:px-4 xs:py-2 lg:px-6 lg:py-3 rounded-lg xs:rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium text-xs xs:text-sm transition-all duration-200 border border-gray-700 hover:border-gray-600 hover:shadow-md whitespace-nowrap min-w-[80px]"
              >
                {t('cookie.decline', 'Decline')}
              </button>
              <button
                onClick={() => applyConsent('true')}
                className="flex-1 xs:flex-none px-3 py-2 xs:px-4 xs:py-2 lg:px-6 lg:py-3 rounded-lg xs:rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium text-xs xs:text-sm transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/35 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap min-w-[80px]"
              >
                {t('cookie.accept', 'Accept')}
              </button>
            </div>
          </div>
        </div>

        {/* Decorative top accent */}
        <div className="h-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 xs:hidden"></div>
      </div>
    </div>
  );
};

export default CookieConsent;


