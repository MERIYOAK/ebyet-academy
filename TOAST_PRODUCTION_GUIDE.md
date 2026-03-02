# Toast Notifications - Production Guide

## 🔔 Overview

This guide covers how toast notifications work in production and how to debug them if they're not working.

## 🚀 Features

### Enhanced Toast Component
- **Production Debug Mode**: Built-in debugging for production environments
- **Multiple Types**: Success, Error, Warning notifications
- **Auto-dismiss**: Configurable duration with manual close option
- **Accessibility**: ARIA labels and screen reader support
- **Responsive**: Works on all screen sizes
- **High Z-Index**: Ensures visibility over other content

### Debug Capabilities
- **Console Logging**: All toast events logged in production
- **Persistent Mode**: Toasts can be set to persist for testing
- **Health Checks**: Built-in health monitoring
- **Test Suite**: Automated testing functions

## 🔧 Production Setup

### 1. Enhanced Toast Component
The toast component automatically detects production mode and enables debugging:

```typescript
// Auto-detects production mode
const isProduction = import.meta.env.PROD;
const debugToast = localStorage.getItem('debug-toast');
```

### 2. Debug Mode Activation
Enable debug mode in production:

```javascript
// Method 1: Browser Console
localStorage.setItem('debug-toast', 'true');

// Method 2: Toast Service
window.toastService.enableDebugMode();

// Method 3: Toggle
window.toggleDebugMode();
```

### 3. Console Logging
In production, all toast events are logged:

```javascript
console.log('🔔 Toast [success]: Course created successfully', {
  timestamp: '2026-03-02T02:30:00.000Z',
  persist: false,
  duration: 5000
});
```

## 🧪 Testing in Production

### Quick Test
Load the testing script in your production site:

```javascript
// Load the test script
const script = document.createElement('script');
script.src = '/toast-test.js';
document.head.appendChild(script);

// Or run directly in console
fetch('/toast-test.js')
  .then(response => response.text())
  .then(code => eval(code));
```

### Test Functions
Once loaded, you can use these functions:

```javascript
// Test all toast types
testToastNotifications();

// Check system health
checkToastHealth();

// Enable/disable debug mode
toggleDebugMode();

// Simulate real scenarios
simulateRealWorldScenarios();
```

## 🔍 Troubleshooting

### Toast Not Showing?

1. **Check Console Logs**
   ```javascript
   // Look for 🔔 emoji in console
   checkToastHealth();
   ```

2. **Enable Debug Mode**
   ```javascript
   localStorage.setItem('debug-toast', 'true');
   location.reload(); // Refresh page
   ```

3. **Verify Toast Component**
   ```javascript
   // Check if Toast component is loaded
   console.log('Toast component:', typeof Toast);
   ```

4. **Test Manual Toast**
   ```javascript
   // Manual test
   window.dispatchEvent(new CustomEvent('show-toast', {
     detail: {
       message: 'Test notification',
       type: 'success',
       duration: 3000
     }
   }));
   ```

### Common Issues

#### Issue: Toasts appear but disappear immediately
**Solution**: Check if `persist` is set to `false` and duration is reasonable

#### Issue: No console logs in production
**Solution**: Enable debug mode with `localStorage.setItem('debug-toast', 'true')`

#### Issue: Toasts not visible on mobile
**Solution**: Check z-index and mobile responsiveness

#### Issue: Toasts not triggering from API calls
**Solution**: Verify the event listener is properly set up

## 📱 Mobile Considerations

### Responsive Design
- **Fixed positioning**: `fixed top-4 right-4`
- **Max width**: `max-w-sm` for mobile
- **Touch-friendly**: Larger close button on mobile
- **Backdrop blur**: Works on modern browsers

### Mobile Testing
```javascript
// Test mobile-specific behavior
window.dispatchEvent(new CustomEvent('show-toast', {
  detail: {
    message: 'Mobile test notification',
    type: 'success',
    duration: 5000
  }
}));
```

## 🌐 Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Fallbacks
- **No CustomEvent**: Uses alternative event system
- **No localStorage**: Disables debug mode
- **No backdrop-blur**: Uses solid background

## 📊 Performance

### Optimizations
- **Lazy loading**: Toast component loads only when needed
- **Event debouncing**: Prevents spam
- **Memory management**: Proper cleanup
- **CSS animations**: Hardware accelerated

### Monitoring
```javascript
// Performance monitoring
const performance = {
  toastCount: 0,
  averageDuration: 0,
  errorRate: 0
};

// Track performance metrics
window.toastService.getStats();
```

## 🔐 Security

### Safe Defaults
- **No XSS**: Messages are properly escaped
- **No eval():** Uses safe event dispatching
- **Content Security**: Compatible with CSP headers

### Production Safety
- **Debug mode off by default**: Must be explicitly enabled
- **Limited persistence**: Only for testing
- **No sensitive data**: Only logs toast content

## 🎯 Best Practices

### For Developers
1. **Test in development first** before production
2. **Use meaningful messages** for better UX
3. **Set appropriate durations** (3-5 seconds typical)
4. **Handle errors gracefully** with fallback messages

### For Production
1. **Monitor toast frequency** to detect spam
2. **Check console logs** for debugging
3. **Use debug mode** for troubleshooting
4. **Test on real devices** before deployment

## 📞 Support

### Debug Commands
```javascript
// Quick debug checklist
checkToastHealth();
toggleDebugMode();
testToastNotifications();
```

### Getting Help
1. Check browser console for 🔔 emoji logs
2. Enable debug mode and retry
3. Test with the provided test suite
4. Check network tab for any errors

---

**Last Updated**: March 2, 2026
**Version**: 2.0
**Environment**: Production Ready
