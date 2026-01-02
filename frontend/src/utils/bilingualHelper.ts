/**
 * Helper function to extract English text from bilingual objects
 * Used in admin pages where only English is needed
 * @param text - Can be a string (legacy), JSON string, or bilingual object {en: string, tg: string}
 * @returns English text string
 */
export const getEnglishText = (text: string | { en: string; tg: string } | undefined | null): string => {
  if (!text) return '';
  
  // If it's a string, check if it's a JSON string
  if (typeof text === 'string') {
    // Check if it looks like a JSON string (starts with { or ")
    if (text.trim().startsWith('{') || text.trim().startsWith('"')) {
      try {
        const parsed = JSON.parse(text);
        // If parsed successfully and it's an object with language keys
        if (typeof parsed === 'object' && parsed !== null && ('en' in parsed || 'tg' in parsed)) {
          return parsed.en || '';
        }
        // If it's a plain string after parsing, return it
        if (typeof parsed === 'string') {
          return parsed;
        }
      } catch (e) {
        // Not valid JSON, treat as plain string
        return text;
      }
    }
    // Plain string (legacy format), return as-is
    return text;
  }
  
  // If it's already an object, extract English
  if (typeof text === 'object' && text !== null && 'en' in text) {
    return text.en || '';
  }
  
  return '';
};

/**
 * Helper function to extract Tigrinya text from bilingual objects
 * Used in admin pages where both languages are needed
 * @param text - Can be a string (legacy) or bilingual object {en: string, tg: string}
 * @returns Tigrinya text string
 */
export const getTigrinyaText = (text: string | { en: string; tg: string } | undefined | null): string => {
  if (!text) return '';
  if (typeof text === 'string') return ''; // If it's a string, assume no Tigrinya equivalent
  if (typeof text === 'object' && text !== null && 'tg' in text) {
    return text.tg || '';
  }
  return '';
};

/**
 * Helper function to extract text based on current language
 * Used in user-facing pages where language switching is needed
 * @param text - Can be a string (legacy), JSON string, or bilingual object {en: string, tg: string}
 * @param language - 'en' or 'tg'
 * @returns Text in the specified language
 */
export const getLocalizedText = (
  text: string | { en: string; tg: string } | undefined | null,
  language: 'en' | 'tg' = 'en'
): string => {
  if (!text) return '';
  
  // If it's a string, check if it's a JSON string
  if (typeof text === 'string') {
    // Check if it looks like a JSON string (starts with { or ")
    if (text.trim().startsWith('{') || text.trim().startsWith('"')) {
      try {
        const parsed = JSON.parse(text);
        // If parsed successfully and it's an object with language keys
        if (typeof parsed === 'object' && parsed !== null && ('en' in parsed || 'tg' in parsed)) {
          return parsed[language] || parsed.en || '';
        }
        // If it's a plain string after parsing, return it
        if (typeof parsed === 'string') {
          return parsed;
        }
      } catch (e) {
        // Not valid JSON, treat as plain string
        return text;
      }
    }
    // Plain string (legacy format), return as-is
    return text;
  }
  
  // If it's already an object, extract the language
  if (typeof text === 'object' && text !== null) {
    return text[language] || text.en || '';
  }
  
  return '';
};

