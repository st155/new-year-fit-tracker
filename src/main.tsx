import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { ErrorBoundary } from "./components/error/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <StrictMode>
      <App />
    </StrictMode>
  </ErrorBoundary>
);
