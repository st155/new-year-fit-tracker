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
  console.error('Global error:', (e as ErrorEvent).error || (e as ErrorEvent).message, e);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled promise rejection:', (e as PromiseRejectionEvent).reason, e);
});
console.log('[Boot] main.tsx starting');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);
