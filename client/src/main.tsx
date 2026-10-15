import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App.js';
import './index.css';

// Register PWA service worker in production
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('[PWA] ServiceWorker registered:', reg.scope))
      .catch((err) => console.warn('[PWA] ServiceWorker failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
