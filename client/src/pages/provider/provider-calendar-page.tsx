import React from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import ProviderNavbar from "@/components/layout/provider-navbar";
import InteractiveCalendar from "@/components/calendar/interactive-calendar";
import { Helmet } from "react-helmet";

const ProviderCalendarPage = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Helmet>
        <title>Calendário | AgendoAI</title>
      </Helmet>
      
      <ProviderNavbar />
      
      <main className="flex-1 p-4 md:p-6 pb-20">
        <div className="w-full max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Meu Calendário</h1>
            <p className="text-muted-foreground">Gerencie seus agendamentos e horários</p>
          </div>
          
          <InteractiveCalendar />
        </div>
      </main>
    </div>
  );
};

export default ProviderCalendarPage;