import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

// Register service worker for installable PWA support in standalone top-level windows
if ('serviceWorker' in navigator && window.self === window.top) {
  window.addEventListener('load', () => {
    try {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered successfully on scope:', reg.scope);
        })
        .catch((err) => {
          // Gracefully log as info/warning in restricted environments (e.g. sandbox or disabled browser state)
          console.info('[PWA] Service Worker registration bypassed:', err?.message || err);
        });
    } catch (e) {
      console.info('[PWA] Service Worker unavailable:', e);
    }
  });
}
