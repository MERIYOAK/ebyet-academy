import { config } from './environment';

export interface ContactOption {
  id: string;
  icon: string;
  label: string;
  url: string;
  color: string;
  hoverColor: string;
  iconComponent?: string; // For SVG icons
}

export const contactConfig: ContactOption[] = [
  {
    id: 'phone',
    icon: '📞',
    label: 'Call',
    url: `tel:${config.SUPPORT_PHONE}`,
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-600',
    iconComponent: 'phone'
  },
  {
    id: 'whatsapp',
    icon: '📱',
    label: 'WhatsApp',
    url: `https://wa.me/${config.SUPPORT_WHATSAPP.replace(/[^\d]/g, '')}`,
    color: 'bg-green-600',
    hoverColor: 'hover:bg-green-700',
    iconComponent: 'whatsapp'
  },
  {
    id: 'telegram',
    icon: '✈️',
    label: 'Telegram',
    url: `https://t.me/${config.SUPPORT_TELEGRAM}`,
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    iconComponent: 'telegram'
  },
];

// Configuration for FAB behavior
export const fabConfig = {
  // Animation delays
  entranceDelay: 1000, // ms
  optionDelay: 100, // ms between each option animation
  
  // Positioning
  bottom: '1rem', // 16px from bottom on mobile
  left: '1rem', // 16px from left on mobile
  bottomDesktop: '2rem', // 32px from bottom on desktop (aligned with ScrollToTop)
  leftDesktop: '2rem', // 32px from left on desktop
  
  // Sizes
  mainButtonSize: {
    mobile: '3rem', // 48px (matches ScrollToTop)
    desktop: '3rem' // 48px (matches ScrollToTop)
  },
  optionButtonSize: {
    mobile: '2.5rem', // 40px
    desktop: '3rem' // 48px
  },
  
  // Spacing between options
  optionSpacing: {
    mobile: '3.5rem', // 56px
    desktop: '4.5rem' // 72px
  }
};
