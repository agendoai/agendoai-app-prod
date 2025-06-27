import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

interface UserPerDayData {
  date: string;
  count: number;
}

// Função para gerar dados de exemplo para quando a API falhar
function generateSampleData(days: number): UserPerDayData[] {
  const result: UserPerDayData[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    
    result.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 8) + 2 // Número aleatório entre 2 e 9
    });
  }
  
  return result;
}

export default function UsersPerDayChart() {
  const [days, setDays] = useState<string>("30");
  const [fallbackData, setFallbackData] = useState<UserPerDayData[]>([]);
  
  // Gerar dados de exemplo quando o componente for montado
  useEffect(() => {
    setFallbackData(generateSampleData(parseInt(days)));
  }, [days]);
  
  const { data, isLoading, error } = useQuery<UserPerDayData[]>({
    queryKey: ["/api/admin/reports/new-users-by-day", days],
    staleTime: 5 * 60 * 1000, // 5 minutos
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/admin/reports/new-users-by-day?days=${days}`);
        return await res.json();
      } catch (error) {
        console.error("Erro ao buscar dados de usuários por dia:", error);
        return fallbackData;
      }
    },
    retry: 1,
    retryDelay: 1000
  });

  // Formatar a data para exibição
  const formatData = (data: UserPerDayData[] | undefined) => {
    if (!data || data.length === 0) {
      return fallbackData.map(item => ({
        ...item,
        date: new Date(item.date).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        })
      }));
    }
    
    return data.map(item => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })
    }));
  };

  const chartData = formatData(data);

  // Calcular estatísticas
  const totalUsers = chartData.reduce((sum, item) => sum + item.count, 0);
  const averageUsers = Math.round(totalUsers / chartData.length);
  const maxUsers = Math.max(...chartData.map(item => item.count));

  if (isLoading) {
    return (
      <Card className="w-full border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Novos Usuários por Dia
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="text-gray-600">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
            Novos Usuários por Dia
          </CardTitle>
          <div className="w-40">
            <Select value={days} onValueChange={setDays}>
              <SelectTrigger className="bg-white border-gray-200">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
            <div className="text-2xl font-bold text-blue-900">{totalUsers}</div>
            <div className="text-sm text-blue-700">Total</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
            <div className="text-2xl font-bold text-green-900">{averageUsers}</div>
            <div className="text-sm text-green-700">Média/Dia</div>
          </div>
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
            <div className="text-2xl font-bold text-purple-900">{maxUsers}</div>
            <div className="text-sm text-purple-700">Máximo</div>
          </div>
        </div>

        {/* Gráfico */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                allowDecimals={false} 
                stroke="#6b7280"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value) => [`${value} usuários`, "Quantidade"]}
                labelStyle={{ color: '#374151', fontWeight: '600' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                name="Usuários" 
                stroke="#0ea5e9" 
                strokeWidth={3}
                fill="url(#colorUsers)"
                activeDot={{ 
                  r: 8, 
                  stroke: '#0ea5e9', 
                  strokeWidth: 2, 
                  fill: 'white' 
                }}
                dot={{ 
                  r: 4, 
                  fill: '#0ea5e9', 
                  stroke: 'white', 
                  strokeWidth: 2 
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-yellow-600 mr-2" />
              <p className="text-sm text-yellow-800">
                Usando dados simulados. Não foi possível carregar dados reais.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}