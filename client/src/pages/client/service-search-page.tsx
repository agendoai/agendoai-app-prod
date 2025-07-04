import ClientLayout from '@/components/layout/client-layout';
import AppHeader from '@/components/layout/app-header';
import ProviderAdvancedSearch from '@/components/provider-advanced-search';
import { Card } from '@/components/ui/card';

export default function ServiceSearchPage() {
  return (
    <ClientLayout>
      <AppHeader showUserInfo showNotificationIcon userType="client" />
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-3xl font-extrabold text-primary dark:text-white mb-6 text-center">Buscar Prestadores</h1>
        <ProviderAdvancedSearch />
        <div className="flex flex-col items-center py-6 text-neutral-500 dark:text-neutral-400">
          <svg width="64" height="64" fill="none" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#F3F4F6"/><path d="M32 20v12l8 4" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <p className="mt-2">Nenhum prestador encontrado.</p>
        </div>
      </div>
    </ClientLayout>
  );
}