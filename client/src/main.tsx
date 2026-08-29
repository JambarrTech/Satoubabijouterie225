import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Initialize Firebase config globally for service worker
if (typeof window !== 'undefined') {
  (window as any).FIREBASE_CONFIG = {
    // @ts-ignore
    apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
    // @ts-ignore
    authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN,
    // @ts-ignore
    projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID,
    // @ts-ignore
    storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET,
    // @ts-ignore
    messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    // @ts-ignore
    appId: (import.meta as any).env.VITE_FIREBASE_APP_ID,
    // @ts-ignore
    measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
