import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.tsx';
import './index.css';
import './i18n'; // Import i18n configuration

// Global error handler for browser extension conflicts
window.addEventListener('error', (event) => {
  if (event.message && event.message.includes('disconnected port object')) {
    console.warn('⚠️ Browser extension conflict detected, ignoring error:', event.message);
    event.preventDefault();
    return false;
  }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && event.reason.message && event.reason.message.includes('disconnected port object')) {
    console.warn('⚠️ Browser extension conflict detected, ignoring promise rejection:', event.reason.message);
    event.preventDefault();
    return false;
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </StrictMode>
);
