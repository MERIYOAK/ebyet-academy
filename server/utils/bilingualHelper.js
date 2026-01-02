/**
 * Helper function to extract English text from bilingual objects
 * Used in backend where only English is needed (Stripe checkout, receipts, etc.)
 * @param text - Can be a string (legacy), JSON string, or bilingual object {en: string, tg: string}
 * @returns English text string
 */
function getEnglishText(text) {
  if (!text) return '';
  
  // If it's a JSON string, parse it first
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
  if (typeof text === 'object' && text !== null) {
    return text.en || '';
  }
  
  return '';
}

module.exports = {
  getEnglishText
};









