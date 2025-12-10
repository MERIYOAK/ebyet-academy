import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

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

const CookieConsent: React.FC<CookieConsentProps> = ({ measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID, onOpenSettingsRef }) => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [consent, setConsent] = useState<string | null>(null);

  const applyConsent = useCallback((value: 'true' | 'false') => {
    localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
    setVisible(false);
    if (value === 'true') {
      loadGA(measurementId || '');
    } else {
      removeGA();
    }
  }, [measurementId]);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored === 'true' || stored === 'false') {
      setConsent(stored);
      if (stored === 'true') loadGA(measurementId || '');
    } else {
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
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 xxs:px-4 pb-3 xxs:pb-4">
      <div className="max-w-4xl mx-auto bg-gray-900/95 text-white rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
        <div className="p-4 xxs:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm xxs:text-base">
              {t('cookie.banner_message', 'We use cookies to enhance your experience. Do you accept?')}
            </p>
          </div>
          <div className="flex items-center gap-3 self-center sm:self-auto">
            <button
              onClick={() => applyConsent('false')}
              className="px-4 xxs:px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all duration-200 shadow-lg hover:shadow-xl active:translate-y-px"
            >
              {t('cookie.decline', 'Decline')}
            </button>
            <button
              onClick={() => applyConsent('true')}
              className="px-4 xxs:px-5 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white transition-all duration-200 shadow-[0_10px_25px_-5px_rgba(16,185,129,0.6)] hover:shadow-[0_12px_28px_-6px_rgba(16,185,129,0.7)] active:translate-y-px"
            >
              {t('cookie.accept', 'Accept')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;


