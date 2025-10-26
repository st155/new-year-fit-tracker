import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./index-inbody-styles.css";
// Temporarily disabled for debugging
// import { startPerformanceMonitoring } from "./lib/performance-monitor";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

// Global error logging - now in production too
window.addEventListener('error', (e) => {
  console.error('💥 [Global] Uncaught error:', (e as ErrorEvent).error);
  if ((window as any).__lastErrors) {
    (window as any).__lastErrors.push(`Error: ${e.message} at ${e.filename}:${e.lineno}`);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('💥 [Global] Unhandled promise rejection:', (e as PromiseRejectionEvent).reason);
  if ((window as any).__lastErrors) {
    (window as any).__lastErrors.push(`Promise rejection: ${e.reason}`);
  }
});

// Temporarily disabled for debugging
// if (typeof window !== 'undefined') {
//   startPerformanceMonitoring();
// }

// Wrap mounting in try-catch
try {
  console.log('🚀 [Boot] Starting React mount...');
  
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );

  // Signal that React has successfully mounted
  if (typeof window !== 'undefined') {
    (window as any).__react_mounted__ = true;
    console.log('✅ [Boot] React mounted successfully');
  }
} catch (error) {
  console.error('💥 [Boot] Failed to mount React:', error);
  if ((window as any).__lastErrors) {
    (window as any).__lastErrors.push(`Mount error: ${error}`);
  }
  throw error;
}
