import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./index-inbody-styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// Global error logging to diagnose white screen
window.addEventListener('error', (e) => {
  console.error('💥 [Global] Uncaught error:', {
    error: (e as ErrorEvent).error,
    message: (e as ErrorEvent).message,
    filename: (e as ErrorEvent).filename,
    lineno: (e as ErrorEvent).lineno,
    colno: (e as ErrorEvent).colno,
    timestamp: new Date().toISOString()
  });
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('💥 [Global] Unhandled promise rejection:', {
    reason: (e as PromiseRejectionEvent).reason,
    promise: (e as PromiseRejectionEvent).promise,
    timestamp: new Date().toISOString()
  });
});

console.log('🚀 [Boot] main.tsx starting', {
  timestamp: new Date().toISOString(),
  environment: import.meta.env.MODE,
  url: window.location.href
});

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
