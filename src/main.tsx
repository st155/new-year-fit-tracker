import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./index-inbody-styles.css";
import { startPerformanceMonitoring } from "./lib/performance-monitor";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// Global error logging for critical errors only
if (import.meta.env.DEV) {
  window.addEventListener('error', (e) => {
    console.error('💥 [Global] Uncaught error:', (e as ErrorEvent).error);
  });

  window.addEventListener('unhandledrejection', (e) => {
    console.error('💥 [Global] Unhandled promise rejection:', (e as PromiseRejectionEvent).reason);
  });
}

// Start performance monitoring
if (typeof window !== 'undefined') {
  startPerformanceMonitoring();
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
