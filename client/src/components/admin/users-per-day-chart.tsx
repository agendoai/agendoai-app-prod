import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
      count: Math.floor(Math.random() * 5) + 1 // Número aleatório entre 1 e 5
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

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Novos Usuários por Dia</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Novos Usuários por Dia</CardTitle>
        <div className="w-32">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger>
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
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={(value) => [`${value} usuários`, "Quantidade"]} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="count" 
                name="Usuários" 
                stroke="#0ea5e9" 
                activeDot={{ r: 8 }} 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {error && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Usando dados simulados. Não foi possível carregar dados reais.
          </div>
        )}
      </CardContent>
    </Card>
  );
}