import React from "react";
import Navbar from "./navbar";

/**
 * Layout padrão para páginas de cliente
 * 
 * Este componente encapsula o layout básico de todas as páginas do cliente,
 * incluindo a barra de navegação inferior padronizada
 */
interface ClientLayoutProps {
  children: React.ReactNode;
  hideNavbar?: boolean;
}

export default function ClientLayout({ children, hideNavbar = false }: ClientLayoutProps) {
  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      {children}
      {!hideNavbar && <Navbar />}
    </div>
  );
}