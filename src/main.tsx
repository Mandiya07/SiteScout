import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';

// Capture beforeinstallprompt globally before React components mount
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    (window as unknown as { __deferredPWAInstallPrompt?: Event }).__deferredPWAInstallPrompt = e;
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

// Register Workbox PWA Service Worker for installability and full offline caching
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: true,
      onRegisteredSW(swUrl) {
        console.log('[PWA] Workbox Service Worker registered:', swUrl);
      },
      onOfflineReady() {
        console.log('[PWA] App shell and assets cached for offline use');
        window.dispatchEvent(new CustomEvent('sitescout:pwa-offline-ready'));
      },
      onRegisterError(err) {
        console.info('[PWA] Service Worker registration bypassed:', err?.message || err);
      },
    });
  } catch (e) {
    console.info('[PWA] Service Worker unavailable:', e);
  }
}
