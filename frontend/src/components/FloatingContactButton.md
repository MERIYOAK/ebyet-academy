# FloatingContactButton Component

A responsive floating action button (FAB) that provides quick access to contact options across all pages.

## Features

- **Global Component**: Visible across all pages when integrated into UserLayout
- **Responsive Design**: Works on devices down to 350px width
- **3D Styling**: Depth with shadows, gradients, and perspective
- **Wave Animation**: Subtle pulsing wave effect around the FAB
- **Smooth Animations**: Slide and fade-in effects for contact options
- **Accessibility**: Full keyboard navigation and ARIA labels
- **Mobile Optimized**: Touch-friendly with backdrop for mobile devices

## Contact Options

The FAB expands to reveal 3 contact options with official platform logos:

1. **Phone Call** - Opens phone dialer (`tel:+1234567890`) - Uses Lucide React Phone icon
2. **WhatsApp** - Opens WhatsApp chat (`https://wa.me/1234567890`) - Uses official WhatsApp logo
3. **Telegram** - Opens Telegram chat (`https://t.me/username`) - Uses official Telegram logo

## Customization

### Contact Information

Edit `frontend/src/config/contactConfig.ts` to customize:

```typescript
export const contactConfig: ContactOption[] = [
  {
    id: 'phone',
    icon: '📞',
    label: 'Call us',
    url: 'tel:+YOUR_PHONE_NUMBER',
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-600'
  },
  // Add more options...
];
```

### FAB Behavior

Configure animation delays, positioning, and sizes in the same file:

```typescript
export const fabConfig = {
  entranceDelay: 1000, // ms
  optionDelay: 100, // ms between each option animation
  // ... more options
};
```

## Integration

The component is automatically integrated into `UserLayout.tsx` and will appear on all user-facing pages.

## Responsive Breakpoints

- **Mobile (< 640px)**: 48px main button (matches ScrollToTop), 40px options, 16px from edges
- **Desktop (≥ 640px)**: 48px main button (matches ScrollToTop), 48px options, 32px from edges
- **Positioning**: Responsive - closer to corners on mobile, standard spacing on desktop

## Accessibility Features

- Keyboard navigation (Tab, Enter, Space)
- ARIA labels for screen readers ("Call", "WhatsApp", "Telegram")
- Focus states with visible rings
- Proper semantic HTML structure
- SVG icons with proper accessibility attributes

## Animation Details

- **Wave Effect**: Three layered ripple animations with different delays
- **Floating Animation**: Subtle up/down movement when not expanded
- **Entrance Animation**: Fade-in from bottom after 1 second
- **Option Animations**: Staggered appearance with configurable delays

## CSS Classes Used

- Tailwind utilities for responsive design
- Custom animations defined in `index.css`
- Gradient backgrounds and shadows for 3D effect
- Transform and transition classes for smooth animations
