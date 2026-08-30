import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Initialize Firebase config globally for service worker
if (typeof window !== "undefined") {
  (window as any).FIREBASE_CONFIG = {
    apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY || "AIzaSyB6tBRmQR69BzDMgz5yRbWgtVEVEtO6I3U",
    authDomain: (import.meta as any).env.VITE_FIREBASE_AUTH_DOMAIN || "plateformesatouba.firebaseapp.com",
    projectId: (import.meta as any).env.VITE_FIREBASE_PROJECT_ID || "plateformesatouba",
    storageBucket: (import.meta as any).env.VITE_FIREBASE_STORAGE_BUCKET || "plateformesatouba.firebasestorage.app",
    messagingSenderId: (import.meta as any).env.VITE_FIREBASE_MESSAGING_SENDER_ID || "758245641576",
    appId: (import.meta as any).env.VITE_FIREBASE_APP_ID || "1:758245641576:web:b035eddece1f23b6fc5add",
    measurementId: (import.meta as any).env.VITE_FIREBASE_MEASUREMENT_ID || "G-BT229N1P1E",
  };
}

// Register Service Worker for push notifications
if ("serviceWorker" in navigator) {
  function sendConfigToSW(reg: ServiceWorkerRegistration) {
    const fbConfig = (window as any).FIREBASE_CONFIG;
    if (fbConfig && fbConfig.apiKey && reg.active) {
      reg.active.postMessage({ type: "FIREBASE_CONFIG", config: fbConfig });
    }
  }

  navigator.serviceWorker.register("/gerant/firebase-messaging-sw.js")
    .then((registration) => {
      console.log("SW registered (gerant):", registration.scope);
      sendConfigToSW(registration);
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") {
              sendConfigToSW(registration);
            }
          });
        }
      });
    })
    .catch((error) => {
      console.error("SW registration failed (gerant):", error);
    });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data && event.data.type === "REQUEST_FIREBASE_CONFIG" && event.source) {
      const fbConfig = (window as any).FIREBASE_CONFIG;
      if (fbConfig && fbConfig.apiKey) {
        event.source.postMessage({ type: "FIREBASE_CONFIG", config: fbConfig });
      }
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);