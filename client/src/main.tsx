import { createRoot } from "react-dom/client";
import React, { StrictMode } from "react";
import App from "./App";
import "./index.css";
import "./lib/api";

// Optional: Error Boundary component
class RootErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500">Erro ao carregar a aplicação</div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento #root não encontrado no DOM");
}

createRoot(rootElement).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);

// Optional: Service Worker registration (for PWA) - DESABILITADO TEMPORARIAMENTE
console.log("🔧 Service Worker desabilitado temporariamente para debug");
/*
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    // Verificar se estamos em HTTPS antes de registrar o Service Worker
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
      navigator.serviceWorker.register("/service-worker.js")
        .then((registration) => {
          console.log('Service Worker registrado com sucesso:', registration);
        })
        .catch((error) => {
          console.error('Erro ao registrar Service Worker:', error);
        });
    } else {
      console.log('Service Worker não registrado - HTTPS necessário para produção');
    }
  });
}
*/
