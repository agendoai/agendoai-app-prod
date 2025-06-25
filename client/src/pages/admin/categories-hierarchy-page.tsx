import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Package,
  Grid3X3,
  ChevronDown,
  ChevronRight,
  Save,
} from "lucide-react";
import AdminLayout from "@/components/layout/admin-layout";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import AdminSidebar from "@/components/layout/admin-sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Interfaces
interface Niche {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  categories: Category[];
}

interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  nicheId: number;
  services: Service[];
}

interface Service {
  id: number;
  name: string;
  description: string | null;
  duration: number; // duração em minutos
  categoryId: number;
}

export default function CategoriesHierarchyPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);

  // Estado para itens selecionados e formulários
  const [selectedNiche, setSelectedNiche] = useState<Niche | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Estados para diálogos
  const [isNicheDialogOpen, setIsNicheDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<
    "niche" | "category" | "service"
  >("niche");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Estados para formulários
  const [nicheForm, setNicheForm] = useState({
    id: 0,
    name: "",
    description: "",
    icon: "",
  });

  const [categoryForm, setCategoryForm] = useState({
    id: 0,
    name: "",
    description: "",
    icon: "",
    color: "#38bdf8", // cor padrão
    nicheId: 0,
  });

  const [serviceForm, setServiceForm] = useState({
    id: 0,
    name: "",
    description: "",
    duration: 60,
    categoryId: 0,
  });

  // Buscar nichos, categorias e serviços
  const { data: niches = [], isLoading } = useQuery({
    queryKey: ["/api/admin/niches"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/niches");
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar nichos:", error);
        return [];
      }
    },
  });

  const { data: icons = {}, isLoading: isLoadingIcons } = useQuery({
    queryKey: ["/lucide/icons"],
    queryFn: async () => {
      try {
        const res = await fetch("https://lucide.dev/api/categories");
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar ícones:", error);
        return {};
      }
    },
  });

  // Mutações
  const nichesMutation = useMutation({
    mutationFn: async (data: typeof nicheForm) => {
      const method = data.id ? "PUT" : "POST";
      const url = data.id
        ? `/api/admin/niches/${data.id}`
        : "/api/admin/niches";

      console.log(
        "Enviando solicitação para criar/atualizar nicho:",
        url,
        data,
      );
      const res = await apiRequest(method, url, data);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Erro na resposta do servidor:", errorData);
        throw new Error(
          errorData.error || "Erro desconhecido ao processar nicho",
        );
      }

      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Nicho criado/atualizado com sucesso:", data);
      toast({
        title: nicheForm.id ? "Nicho atualizado" : "Nicho criado",
        description: `O nicho foi ${nicheForm.id ? "atualizado" : "criado"} com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/niches"] });
      setIsNicheDialogOpen(false);
      resetForms();
    },
    onError: (error: any) => {
      console.error("Erro ao processar nicho:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${nicheForm.id ? "atualizar" : "criar"} nicho: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const categoriesMutation = useMutation({
    mutationFn: async (data: typeof categoryForm) => {
      const method = data.id ? "PUT" : "POST";
      const url = data.id
        ? `/api/admin/categories/${data.id}`
        : "/api/admin/categories";

      console.log(
        "Enviando solicitação para criar/atualizar categoria:",
        url,
        data,
      );
      const res = await apiRequest(method, url, data);

      if (!res.ok) {
        try {
          const errorData = await res.json();
          console.error("Erro na resposta do servidor:", errorData);
          throw new Error(
            errorData.error || "Erro desconhecido ao processar categoria",
          );
        } catch (e) {
          console.error("Erro ao processar resposta de erro:", e);
          throw new Error(
            "Erro ao criar categoria. Verifique se já existe uma categoria com o mesmo nome neste nicho.",
          );
        }
      }

      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Categoria criada/atualizada com sucesso:", data);
      toast({
        title: categoryForm.id ? "Categoria atualizada" : "Categoria criada",
        description: `A categoria foi ${categoryForm.id ? "atualizada" : "criada"} com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/niches"] });
      setIsCategoryDialogOpen(false);
      resetForms();
    },
    onError: (error: any) => {
      console.error("Erro ao processar categoria:", error);
      if (error.message?.includes("Já existe uma categoria com o nome")) {
        setError("Já existe uma categoria cadastrada com este nome.");
      } else {
        setError(
          `Erro ao ${categoryForm.id ? "atualizar" : "criar"} categoria: ${error.message}`,
        );
      }
    },
  });

  const servicesMutation = useMutation({
    mutationFn: async (data: typeof serviceForm) => {
      // Se estivermos criando um novo serviço, remova o campo ID
      const isCreating = data.id === 0; // Verificar se é um novo serviço
      const method = isCreating ? "POST" : "PUT";
      const url = isCreating ? "/api/services" : `/api/services/${data.id}`;
      
      // Remover ID se for uma criação (não uma atualização)
      const { id, ...dataWithoutId } = data;
      const payload = isCreating ? dataWithoutId : data;

      console.log(
        "Enviando solicitação para criar/atualizar serviço:",
        url,
        payload,
      );
      const res = await apiRequest(method, url, payload);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Erro na resposta do servidor:", errorData);
        throw new Error(
          errorData.error || "Erro desconhecido ao processar serviço",
        );
      }

      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Serviço criado/atualizado com sucesso:", data);
      toast({
        title: serviceForm.id ? "Serviço atualizado" : "Serviço criado",
        description: `O serviço foi ${serviceForm.id ? "atualizado" : "criado"} com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/niches"] });
      setIsServiceDialogOpen(false);
      resetForms();
    },
    onError: (error: any) => {
      console.error("Erro ao processar serviço:", error);
      toast({
        title: "Erro",
        description: `Erro ao ${serviceForm.id ? "atualizar" : "criar"} serviço: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!deleteId) return;

      let url = "";
      switch (deleteType) {
        case "niche":
          url = `/api/admin/niches/${deleteId}`;
          break;
        case "category":
          url = `/api/admin/categories/${deleteId}`;
          break;
        case "service":
          url = `/api/services/${deleteId}`;
          break;
      }

      const res = await apiRequest("DELETE", url);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Item excluído",
        description: `O ${deleteType} foi excluído com sucesso.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/niches"] });
      setIsDeleteDialogOpen(false);
      resetForms();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir ${deleteType}: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Funções auxiliares
  const resetForms = () => {
    setNicheForm({ id: 0, name: "", description: "", icon: "" });
    setCategoryForm({
      id: 0,
      name: "",
      description: "",
      icon: "",
      color: "#38bdf8",
      nicheId: 0,
    });
    setServiceForm({
      id: 0,
      name: "",
      description: "",
      duration: 60,
      categoryId: 0,
    });
  };

  const openNicheDialog = (niche?: Niche) => {
    if (niche) {
      setNicheForm({
        id: niche.id,
        name: niche.name,
        description: niche.description || "",
        icon: niche.icon || "",
      });
    } else {
      setNicheForm({ id: 0, name: "", description: "", icon: "" });
    }
    setIsNicheDialogOpen(true);
  };

  const openCategoryDialog = (category?: Category, nicheId?: number) => {
    setError(null);
    if (category) {
      setCategoryForm({
        id: category.id,
        name: category.name,
        description: category.description || "",
        icon: category.icon || "",
        color: category.color || "#38bdf8",
        nicheId: category.nicheId,
      });
    } else if (nicheId) {
      setCategoryForm({
        id: 0,
        name: "",
        description: "",
        icon: "",
        color: "#38bdf8",
        nicheId,
      });
    }
    setIsCategoryDialogOpen(true);
  };

  const openServiceDialog = (service?: Service, categoryId?: number) => {
    if (service) {
      setServiceForm({
        id: service.id,
        name: service.name,
        description: service.description || "",
        duration: service.duration,
        categoryId: service.categoryId,
      });
    } else if (categoryId) {
      setServiceForm({
        id: 0,
        name: "",
        description: "",
        duration: 60,
        categoryId,
      });
    }
    setIsServiceDialogOpen(true);
  };

  const confirmDelete = (
    type: "niche" | "category" | "service",
    id: number,
  ) => {
    setDeleteType(type);
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleNicheSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    nichesMutation.mutate(nicheForm);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    categoriesMutation.mutate(categoryForm);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    servicesMutation.mutate(serviceForm);
  };

  // Renderização
  if (isLoading || isLoadingIcons) {
    return (
      <AdminLayout>
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6 flex items-center justify-between lg:px-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/admin/dashboard")}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">
              Gerenciar Nichos e Categorias
            </h1>
          </div>

          <Button onClick={() => openNicheDialog()} className="bg-primary">
            <Plus className="mr-2 h-4 w-4" />
            Novo Nicho
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {niches.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <Package className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-medium mb-2">
                  Nenhum nicho cadastrado
                </h3>
                <p className="text-gray-500 text-center mb-4">
                  Comece criando um nicho para organizar suas categorias e
                  serviços.
                </p>
                <Button onClick={() => openNicheDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Nicho
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>
                  Estrutura de Nichos, Categorias e Serviços
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {niches.map((niche: Niche) => (
                    <AccordionItem
                      value={`niche-${niche.id}`}
                      key={`niche-${niche.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <AccordionTrigger className="flex-1 hover:no-underline">
                          <div className="flex items-center">
                            <div className="bg-primary/10 p-2 rounded-full mr-3">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <span className="font-medium">{niche.name}</span>
                              <Badge className="ml-2 bg-primary/20 text-primary hover:bg-primary/30">
                                {niche.categories?.length || 0} categorias
                              </Badge>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <div className="flex mr-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              openNicheDialog(niche);
                            }}
                            className="h-8 w-8 mr-1"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDelete("niche", niche.id);
                            }}
                            className="h-8 w-8 text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <AccordionContent>
                        <div className="ml-10 border-l-2 border-gray-200 pl-4">
                          {/* Botão para adicionar categoria */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openCategoryDialog(undefined, niche.id)
                            }
                            className="mb-4"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar Categoria
                          </Button>

                          {niche.categories?.length > 0 ? (
                            <Accordion type="multiple" className="w-full">
                              {niche.categories.map((category: Category) => (
                                <AccordionItem
                                  value={`category-${category.id}`}
                                  key={`category-${category.id}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <AccordionTrigger className="flex-1 hover:no-underline">
                                      <div className="flex items-center">
                                        <div className="bg-primary/10 p-2 rounded-full mr-3">
                                          <Grid3X3 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                          <span className="font-medium">
                                            {category.name}
                                          </span>
                                          <Badge className="ml-2 bg-primary/20 text-primary hover:bg-primary/30">
                                            {category.services?.length || 0}{" "}
                                            serviços
                                          </Badge>
                                        </div>
                                      </div>
                                    </AccordionTrigger>

                                    <div className="flex mr-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openCategoryDialog(category);
                                        }}
                                        className="h-8 w-8 mr-1"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          confirmDelete(
                                            "category",
                                            category.id,
                                          );
                                        }}
                                        className="h-8 w-8 text-red-500"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  <AccordionContent>
                                    <div className="ml-10 border-l-2 border-gray-200 pl-4">
                                      {/* Botão para adicionar serviço */}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          openServiceDialog(
                                            undefined,
                                            category.id,
                                          )
                                        }
                                        className="mb-4"
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Adicionar Serviço
                                      </Button>

                                      {category.services?.length > 0 ? (
                                        <div className="space-y-3">
                                          {category.services.map(
                                            (service: Service) => (
                                              <div
                                                key={`service-${service.id}`}
                                                className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200"
                                              >
                                                <div className="flex items-center">
                                                  <div className="mr-3">
                                                    <h4 className="font-medium">
                                                      {service.name}
                                                    </h4>
                                                    <div className="flex items-center text-sm text-gray-500">
                                                      <span>
                                                        {service.duration} min
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>

                                                <div className="flex">
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                      openServiceDialog(service)
                                                    }
                                                    className="h-8 w-8 mr-1"
                                                  >
                                                    <Pencil className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                      confirmDelete(
                                                        "service",
                                                        service.id,
                                                      )
                                                    }
                                                    className="h-8 w-8 text-red-500"
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ),
                                          )}
                                        </div>
                                      ) : (
                                        <div className="text-center p-4 text-gray-500">
                                          Nenhum serviço cadastrado nesta
                                          categoria.
                                        </div>
                                      )}
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                            </Accordion>
                          ) : (
                            <div className="text-center p-4 text-gray-500">
                              Nenhuma categoria cadastrada neste nicho.
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modal para criar/editar nicho */}
      <Dialog open={isNicheDialogOpen} onOpenChange={setIsNicheDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {nicheForm.id ? "Editar Nicho" : "Criar Novo Nicho"}
            </DialogTitle>
            <DialogDescription>
              {nicheForm.id
                ? "Atualize as informações do nicho existente."
                : "Preencha as informações para criar um novo nicho."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleNicheSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="niche-name">Nome do Nicho *</Label>
                <Input
                  id="niche-name"
                  name="name"
                  value={nicheForm.name}
                  onChange={(e) =>
                    setNicheForm({ ...nicheForm, name: e.target.value })
                  }
                  placeholder="Ex: Beleza e Estética"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="niche-description">Descrição</Label>
                <Textarea
                  id="niche-description"
                  name="description"
                  value={nicheForm.description}
                  onChange={(e) =>
                    setNicheForm({ ...nicheForm, description: e.target.value })
                  }
                  placeholder="Descreva este nicho de mercado..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="niche-icon">Ícone *</Label>
                <Select
                  onValueChange={(e) => setNicheForm({ ...nicheForm, icon: e })}
                  defaultValue={nicheForm.icon}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um ícone" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(icons || {}).map((iconName) => (
                      <SelectItem key={iconName} value={iconName}>
                        {iconName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNicheDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={nichesMutation.isPending}>
                {nichesMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {nicheForm.id ? "Atualizar" : "Criar"} Nicho
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para criar/editar categoria */}
      <Dialog
        open={isCategoryDialogOpen}
        onOpenChange={setIsCategoryDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {categoryForm.id ? "Editar Categoria" : "Criar Nova Categoria"}
            </DialogTitle>
            <DialogDescription>
              {categoryForm.id
                ? "Atualize as informações da categoria existente."
                : "Preencha as informações para criar uma nova categoria."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCategorySubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="category-name">Nome da Categoria *</Label>
                <Input
                  id="category-name"
                  name="name"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  placeholder="Ex: Cabelo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-description">Descrição</Label>
                <Textarea
                  id="category-description"
                  name="description"
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descreva esta categoria..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category-icon">Ícone *</Label>
                  <Select
                    onValueChange={(e) =>
                      setCategoryForm({ ...categoryForm, icon: e })
                    }
                    defaultValue={categoryForm.icon}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um ícone" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(icons || {}).map((iconName) => (
                        <SelectItem key={iconName} value={iconName}>
                          {iconName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category-color">Cor *</Label>
                  <div className="flex">
                    <Input
                      id="category-color"
                      name="color"
                      type="color"
                      value={categoryForm.color}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          color: e.target.value,
                        })
                      }
                      className="w-12 p-1 h-10"
                    />
                    <Input
                      type="text"
                      value={categoryForm.color}
                      onChange={(e) =>
                        setCategoryForm({
                          ...categoryForm,
                          color: e.target.value,
                        })
                      }
                      className="ml-2 flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={categoriesMutation.isPending}>
                {categoriesMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {categoryForm.id ? "Atualizar" : "Criar"} Categoria
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para criar/editar serviço */}
      <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {serviceForm.id ? "Editar Serviço" : "Criar Novo Serviço"}
            </DialogTitle>
            <DialogDescription>
              {serviceForm.id
                ? "Atualize as informações do serviço existente."
                : "Preencha as informações para criar um novo serviço."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleServiceSubmit}>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="service-name">Nome do Serviço *</Label>
                <Input
                  id="service-name"
                  name="name"
                  value={serviceForm.name}
                  onChange={(e) =>
                    setServiceForm({ ...serviceForm, name: e.target.value })
                  }
                  placeholder="Ex: Corte de Cabelo Feminino"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-description">Descrição</Label>
                <Textarea
                  id="service-description"
                  name="description"
                  value={serviceForm.description}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descreva este serviço..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-duration">Duração (min) *</Label>
                <Input
                  id="service-duration"
                  name="duration"
                  type="number"
                  min="5"
                  step="5"
                  value={serviceForm.duration}
                  onChange={(e) =>
                    setServiceForm({
                      ...serviceForm,
                      duration: parseInt(e.target.value) || 30,
                    })
                  }
                  placeholder="30"
                  required
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsServiceDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={servicesMutation.isPending}>
                {servicesMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {serviceForm.id ? "Atualizar" : "Criar"} Serviço
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação para excluir */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              {deleteType === "niche" &&
                "Tem certeza que deseja excluir este nicho? Todas as categorias e serviços relacionados também serão excluídos."}
              {deleteType === "category" &&
                "Tem certeza que deseja excluir esta categoria? Todos os serviços relacionados também serão excluídos."}
              {deleteType === "service" &&
                "Tem certeza que deseja excluir este serviço?"}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Sim, excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
