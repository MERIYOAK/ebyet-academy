import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';

const MetaTagsUpdater: React.FC = () => {
  const { t, i18n } = useTranslation();

  // Memoize translations to avoid recalculating on every render
  const metaData = useMemo(() => {
    const brandName = t('brand.name');
    const pageTitle = t('meta.page_title');
    const pageDescription = t('meta.description');
    const pageKeywords = t('meta.keywords');
    const ogLocale = i18n.language === 'tg' ? 'ti_ER' : 'en_US';
    const htmlLang = i18n.language === 'tg' ? 'ti' : 'en';
    const languageName = i18n.language === 'tg' ? 'Tigrinya' : 'English';

    return {
      brandName,
      pageTitle,
      pageDescription,
      pageKeywords,
      ogLocale,
      htmlLang,
      languageName
    };
  }, [t, i18n.language]);

  // Update HTML lang attribute (minimal DOM manipulation, only when language changes)
  useEffect(() => {
    document.documentElement.lang = metaData.htmlLang;
  }, [metaData.htmlLang]);

  // Update JSON-LD structured data (only when language changes)
  useEffect(() => {
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdScript) {
      try {
        const jsonLd = JSON.parse(jsonLdScript.textContent || '{}');
        jsonLd.name = metaData.brandName;
        jsonLd.alternateName = metaData.brandName;
        jsonLd.description = metaData.pageDescription;
        jsonLdScript.textContent = JSON.stringify(jsonLd);
      } catch (e) {
        console.error('Error updating JSON-LD:', e);
      }
    }
  }, [metaData.brandName, metaData.pageDescription]);

  return (
    <Helmet>
      <title>{metaData.pageTitle}</title>
      <html lang={metaData.htmlLang} />
      <meta name="title" content={metaData.pageTitle} />
      <meta name="description" content={metaData.pageDescription} />
      <meta name="keywords" content={metaData.pageKeywords} />
      <meta name="language" content={metaData.languageName} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:title" content={metaData.pageTitle} />
      <meta property="og:description" content={metaData.pageDescription} />
      <meta property="og:locale" content={metaData.ogLocale} />
      
      {/* Twitter Card */}
      <meta name="twitter:title" content={metaData.pageTitle} />
      <meta name="twitter:description" content={metaData.pageDescription} />
    </Helmet>
  );
};

export default MetaTagsUpdater;

