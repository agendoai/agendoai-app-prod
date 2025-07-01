import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import ProviderLayout from "@/components/layout/provider-layout";
import type { ServiceTemplate, Category } from "../../../../shared/schema";

export default function ProviderServiceTemplatesPage() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["/api/service-templates"],
    queryFn: async () => {
      const res = await fetch("/api/service-templates");
      if (!res.ok) throw new Error("Falha ao carregar templates de serviço");
      return res.json() as Promise<ServiceTemplate[]>;
    }
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Falha ao carregar categorias");
      return res.json() as Promise<Category[]>;
    }
  });

  return (
    <ProviderLayout>
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Templates de Serviço</h1>
          <p className="text-gray-600 text-base">Visualize os templates de serviço disponíveis para facilitar o cadastro de novos serviços.</p>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block">
          <Card className="shadow-lg border-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                    <TableHead className="font-semibold text-gray-700">Categoria</TableHead>
                    <TableHead className="font-semibold text-gray-700">Duração</TableHead>
                    <TableHead className="font-semibold text-gray-700">Ativo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template: ServiceTemplate) => (
                    <TableRow key={template.id} className="hover:bg-blue-50 transition-colors">
                      <TableCell className="py-3 text-gray-900 font-medium">{template.name}</TableCell>
                      <TableCell className="py-3 text-gray-700">{categories.find((c: Category) => c.id === template.categoryId)?.name || "-"}</TableCell>
                      <TableCell className="py-3 text-gray-700">{template.duration} min</TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{template.isActive ? "Sim" : "Não"}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {templates.map((template: ServiceTemplate) => (
            <Card key={template.id} className="shadow border-0">
              <CardContent className="py-4 px-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 text-lg">{template.name}</span>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{template.isActive ? "Sim" : "Não"}</span>
                  </div>
                  <div className="text-gray-600 text-sm">
                    <span className="font-medium">Categoria: </span>{categories.find((c: Category) => c.id === template.categoryId)?.name || "-"}
                  </div>
                  <div className="text-gray-600 text-sm">
                    <span className="font-medium">Duração: </span>{template.duration} min
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ProviderLayout>
  );
} 