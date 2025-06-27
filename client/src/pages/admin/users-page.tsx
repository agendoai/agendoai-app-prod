import React from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/admin-layout';
import UsersList from './components/users-list';
import { Users, UserPlus, TrendingUp, Shield, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

export default function UsersPage() {
  // Buscar estatísticas de usuários da API
  const { data: users, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/users');
        return await response.json();
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        return [];
      }
    }
  });

  // Calcular estatísticas a partir dos dados de usuários
  const stats = React.useMemo(() => {
    if (!users) {
      return {
        total: 0,
        active: 0,
        newThisMonth: 0,
        verified: 0
      };
    }

    const total = users.length;
    const active = users.filter((user: any) => user.isActive).length;
    const verified = users.filter((user: any) => user.isVerified).length;
    
    // Calcular novos usuários este mês
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = users.filter((user: any) => {
      const createdAt = user.createdAt;
      return createdAt && new Date(createdAt) >= firstDayOfMonth;
    }).length;

    return {
      total,
      active,
      verified,
      newThisMonth
    };
  }, [users]);

  if (statsLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col items-center justify-center space-y-4 h-64">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <p className="text-gray-600 text-lg">Carregando estatísticas...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
                <p className="text-gray-600 text-lg">Gerencie todos os usuários da plataforma</p>
              </div>
            </div>
            
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Total de Usuários</p>
                      <p className="text-2xl font-bold text-blue-900">{stats?.total?.toLocaleString() || "0"}</p>
                    </div>
                    <div className="bg-blue-500 p-3 rounded-full">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Usuários Ativos</p>
                      <p className="text-2xl font-bold text-green-900">{stats?.active?.toLocaleString() || "0"}</p>
                    </div>
                    <div className="bg-green-500 p-3 rounded-full">
                      <UserPlus className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-800">Novos este Mês</p>
                      <p className="text-2xl font-bold text-purple-900">+{stats?.newThisMonth || "0"}</p>
                    </div>
                    <div className="bg-purple-500 p-3 rounded-full">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800">Verificados</p>
                      <p className="text-2xl font-bold text-orange-900">{stats?.verified?.toLocaleString() || "0"}</p>
                    </div>
                    <div className="bg-orange-500 p-3 rounded-full">
                      <Shield className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Lista de usuários */}
          <UsersList />
        </div>
      </div>
    </AdminLayout>
  );
}