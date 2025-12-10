# Internationalization (i18n) Implementation Guide

This project uses `react-i18next` for multi-language support with Tigrinya as the primary language and English as secondary.

## 🚀 Quick Start

### 1. **Language Configuration**
- **Primary Language**: Tigrinya (`tg`)
- **Secondary Language**: English (`en`)
- **Default Language**: Tigrinya
- **Storage**: Language preference is saved in `localStorage`

### 2. **Translation Files**
- **Tigrinya**: `src/locales/tg/translation.json`
- **English**: `src/locales/en/translation.json`

### 3. **Using Translations in Components**

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('home.hero_title')}</h1>
      <p>{t('home.hero_subtitle')}</p>
      <button>{t('common.submit')}</button>
    </div>
  );
};
```

### 4. **Language Toggler Component**
The `LanguageToggler` component is already integrated into the navbar and provides:
- Globe icon with dropdown
- Language selection (ትግርኛ / English)
- Persistent language storage
- Responsive design

## 📁 File Structure

```
src/
├── i18n.ts                    # i18n configuration
├── locales/
│   ├── tg/
│   │   └── translation.json   # Tigrinya translations
│   └── en/
│       └── translation.json   # English translations
├── components/
│   ├── LanguageToggler.tsx    # Language switcher component
│   ├── nav/
│   │   └── UserNavbar.tsx     # Navbar with translations
│   └── Footer.tsx             # Footer with translations
└── pages/
    └── HomePage.tsx           # Example page with translations
```

## 🔧 Translation Keys Structure

### Navbar
```json
{
  "navbar": {
    "home": "መነሻ",
    "courses": "ኮርሶች",
    "about": "ብዛትና",
    "contact": "ኣድራሻ",
    "login": "እተው",
    "register": "ዝመዝገብ"
  }
}
```

### Footer
```json
{
  "footer": {
    "contact_info": "ኣድራሻ ሓበሬታ",
    "address": "ኣድራሻ: ኣስመራ, ኤርትራ",
    "phone": "ስልኪ: +291 1 123456",
    "email": "ኢመይል: info@example.com"
  }
}
```

### Pages
```json
{
  "home": {
    "hero_title": "ናብ ምምሃር እትመርሕ መራኸቢ እያ",
    "hero_subtitle": "ብተምሃሮትና ምስ ሓደስቲ ቴክኖሎጂታት"
  },
  "courses": {
    "page_title": "ኮርሶች",
    "search_placeholder": "ኮርስ ደልዪ..."
  }
}
```

### Common
```json
{
  "common": {
    "loading": "ይጽዓን...",
    "error": "ጌጋ ኣጋጢሙ",
    "success": "ዕውትና",
    "submit": "ስደድ"
  }
}
```

## 🎯 Adding New Translations

### 1. **Add to Translation Files**
Add new keys to both `tg/translation.json` and `en/translation.json`:

```json
{
  "new_section": {
    "title": "ኣርእስቲ",
    "description": "መግለጺ"
  }
}
```

### 2. **Use in Component**
```tsx
const { t } = useTranslation();

return (
  <div>
    <h2>{t('new_section.title')}</h2>
    <p>{t('new_section.description')}</p>
  </div>
);
```

## 🔄 Language Switching

### Programmatic Language Change
```tsx
import { changeLanguage } from '../i18n';

// Change to English
changeLanguage('en');

// Change to Tigrinya
changeLanguage('tg');
```

### Get Current Language
```tsx
import { getCurrentLanguage } from '../i18n';

const currentLang = getCurrentLanguage(); // Returns 'tg' or 'en'
```

## 📱 Responsive Design

The language toggler is fully responsive:
- **Desktop**: Shows language name with globe icon
- **Mobile**: Shows only globe icon in mobile menu
- **Touch-friendly**: Large touch targets for mobile devices

## 🎨 Styling

The language toggler uses Tailwind CSS classes:
- Hover effects
- Focus states for accessibility
- Smooth transitions
- Consistent with navbar design

## 🔒 Admin Panel

**Important**: The admin panel remains in English only. No translations are needed for admin functionality.

## 🚀 Best Practices

1. **Use Nested Keys**: Organize translations in logical sections
2. **Consistent Naming**: Use descriptive, consistent key names
3. **Fallback Handling**: Always provide fallback text for missing translations
4. **Context**: Consider cultural context when translating
5. **Testing**: Test both languages thoroughly

## 🐛 Troubleshooting

### Common Issues

1. **Translation Not Showing**
   - Check if the key exists in both translation files
   - Verify the key path is correct
   - Ensure `useTranslation` hook is imported

2. **Language Not Persisting**
   - Check localStorage for `i18nextLng` key
   - Verify the language change function is called

3. **Component Not Updating**
   - Ensure the component re-renders when language changes
   - Check if the translation key is used correctly

### Debug Mode
Enable debug mode in `i18n.ts`:
```tsx
debug: true, // Set to true for development debugging
```

## 📚 Additional Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [Tigrinya Language Resources](https://en.wikipedia.org/wiki/Tigrinya_language)
