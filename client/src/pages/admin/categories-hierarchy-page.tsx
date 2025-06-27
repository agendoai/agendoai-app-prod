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
  Scissors,
  Car,
  Heart,
  Home,
  Briefcase,
  Camera,
  Music,
  Utensils,
  Dumbbell,
  Palette,
  BookOpen,
  Zap,
  Star,
  TrendingUp,
  Users,
  FolderOpen,
  Clock,
  Layers,
  Target,
  BarChart3
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

// Função para obter ícone baseado no nome
const getIconComponent = (iconName: string) => {
  const iconMap: { [key: string]: any } = {
    scissors: Scissors,
    car: Car,
    heart: Heart,
    home: Home,
    briefcase: Briefcase,
    camera: Camera,
    music: Music,
    utensils: Utensils,
    dumbbell: Dumbbell,
    palette: Palette,
    book: BookOpen,
    zap: Zap,
    star: Star,
    trending: TrendingUp,
    users: Users,
    folder: FolderOpen,
    clock: Clock,
    layers: Layers,
    target: Target,
    chart: BarChart3,
    default: Package
  };
  
  return iconMap[iconName?.toLowerCase()] || iconMap.default;
};

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Header da Página */}
        <div className="bg-white border-b border-blue-100 shadow-sm">
          <div className="container mx-auto py-8 px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation("/admin/dashboard")}
                  className="mr-4 hover:bg-blue-100"
                >
                  <ArrowLeft className="h-5 w-5 text-blue-600" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                      <Layers className="h-8 w-8 text-white" />
                    </div>
                    Hierarquia de Categorias
                  </h1>
                  <p className="text-gray-600 mt-2">
                    Organize nichos, categorias e serviços em uma estrutura hierárquica
                  </p>
                </div>
              </div>
              
              {/* Estatísticas */}
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {niches ? niches.length : 0}
                  </div>
                  <div className="text-sm text-gray-500">Nichos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {niches ? niches.reduce((acc, niche) => acc + (niche.categories?.length || 0), 0) : 0}
                  </div>
                  <div className="text-sm text-gray-500">Categorias</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {niches ? niches.reduce((acc, niche) => 
                      acc + (niche.categories?.reduce((catAcc: number, cat: Category) => catAcc + (cat.services?.length || 0), 0) || 0), 0) : 0}
                  </div>
                  <div className="text-sm text-gray-500">Serviços</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8 px-6">
          <div className="grid grid-cols-1 gap-6">
            {niches.length === 0 ? (
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50">
                <CardContent className="flex flex-col items-center justify-center p-16">
                  <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <Layers className="h-12 w-12 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Nenhum nicho cadastrado
                  </h3>
                  <p className="text-gray-600 text-center mb-8 max-w-md">
                    Comece criando um nicho para organizar suas categorias e serviços em uma estrutura hierárquica.
                  </p>
                  <Button 
                    onClick={() => openNicheDialog()} 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-lg px-8 py-3"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Criar Primeiro Nicho
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50">
                <CardHeader className="pb-4">
                  <CardTitle className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                    <Layers className="h-6 w-6 text-blue-500" />
                    Estrutura Hierárquica
                  </CardTitle>
                  <p className="text-gray-600">
                    Gerencie a hierarquia completa de nichos, categorias e serviços
                  </p>
                  <div className="mt-4 flex justify-end">
                    <Button
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-2 rounded-xl shadow flex items-center gap-2"
                      onClick={() => { setCategoryForm({ id: 0, name: '', description: '', icon: '', color: '#38bdf8', nicheId: 0 }); setIsCategoryDialogOpen(true); }}
                    >
                      <Plus className="h-5 w-5" /> Adicionar Categoria
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" className="w-full space-y-2">
                    {niches.map((niche: Niche) => {
                      const NicheIcon = getIconComponent(niche.icon || 'default');
                      return (
                        <AccordionItem
                          value={`niche-${niche.id}`}
                          key={`niche-${niche.id}`}
                          className="border-2 border-blue-100 rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex items-center justify-between p-4">
                            <AccordionTrigger className="flex-1 hover:no-underline [&[data-state=open]>div>div]:rotate-180">
                              <div className="flex items-center">
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-full mr-4 shadow-lg">
                                  <NicheIcon className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                  <span className="font-bold text-lg text-gray-900">{niche.name}</span>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0">
                                      {niche.categories?.length || 0} categorias
                                    </Badge>
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">
                                      {niche.categories?.reduce((acc: number, cat: Category) => acc + (cat.services?.length || 0), 0) || 0} serviços
                                    </Badge>
                                  </div>
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
                                className="h-10 w-10 mr-2 hover:bg-blue-100"
                              >
                                <Pencil className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmDelete("niche", niche.id);
                                }}
                                className="h-10 w-10 text-red-500 hover:bg-red-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <AccordionContent className="px-6 pb-6">
                            <div className="ml-6 border-l-2 border-blue-200 pl-6">
                              {/* Botão para adicionar categoria */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openCategoryDialog(undefined, niche.id)}
                                className="mb-6 bg-white hover:bg-blue-50 border-blue-200 text-blue-700 rounded-lg"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar Categoria
                              </Button>

                              {niche.categories?.length > 0 ? (
                                <Accordion type="multiple" className="w-full space-y-3">
                                  {niche.categories.map((category: Category) => {
                                    const CategoryIcon = getIconComponent(category.icon || 'default');
                                    return (
                                      <AccordionItem
                                        value={`category-${category.id}`}
                                        key={`category-${category.id}`}
                                        className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 hover:bg-gray-100 transition-all"
                                      >
                                        <div className="flex items-center justify-between p-4">
                                          <AccordionTrigger className="flex-1 hover:no-underline [&[data-state=open]>div>div]:rotate-180">
                                            <div className="flex items-center">
                                              <div 
                                                className="p-2 rounded-full mr-3 shadow-md"
                                                style={{ backgroundColor: category.color || "#3B82F6" }}
                                              >
                                                <CategoryIcon className="h-5 w-5 text-white" />
                                              </div>
                                              <div>
                                                <span className="font-semibold text-gray-900">{category.name}</span>
                                                <Badge className="ml-2 bg-purple-100 text-purple-700 hover:bg-purple-200 border-0">
                                                  {category.services?.length || 0} serviços
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
                                              className="h-8 w-8 mr-1 hover:bg-blue-100"
                                            >
                                              <Pencil className="h-4 w-4 text-blue-600" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                confirmDelete("category", category.id);
                                              }}
                                              className="h-8 w-8 text-red-500 hover:bg-red-100"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </div>

                                        <AccordionContent className="px-4 pb-4">
                                          <div className="ml-4 border-l-2 border-gray-300 pl-4">
                                            {/* Botão para adicionar serviço */}
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => openServiceDialog(undefined, category.id)}
                                              className="mb-4 bg-white hover:bg-gray-50 border-gray-300 text-gray-700 rounded-lg"
                                            >
                                              <Plus className="mr-2 h-4 w-4" />
                                              Adicionar Serviço
                                            </Button>

                                            {category.services?.length > 0 ? (
                                              <div className="space-y-3">
                                                {category.services.map((service: Service) => (
                                                  <div
                                                    key={`service-${service.id}`}
                                                    className="flex items-center justify-between p-4 rounded-lg bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all"
                                                  >
                                                    <div className="flex items-center">
                                                      <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-2 rounded-full mr-3">
                                                        <Clock className="h-4 w-4 text-white" />
                                                      </div>
                                                      <div>
                                                        <h4 className="font-semibold text-gray-900">
                                                          {service.name}
                                                        </h4>
                                                        <div className="flex items-center text-sm text-gray-500">
                                                          <Clock className="h-3 w-3 mr-1" />
                                                          <span>{service.duration} minutos</span>
                                                        </div>
                                                      </div>
                                                    </div>

                                                    <div className="flex">
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openServiceDialog(service)}
                                                        className="h-8 w-8 mr-1 hover:bg-blue-100"
                                                      >
                                                        <Pencil className="h-4 w-4 text-blue-600" />
                                                      </Button>
                                                      <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => confirmDelete("service", service.id)}
                                                        className="h-8 w-8 text-red-500 hover:bg-red-100"
                                                      >
                                                        <Trash2 className="h-4 w-4" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="text-center p-6 bg-gray-50 rounded-lg">
                                                <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                                <p className="text-gray-500">Nenhum serviço cadastrado nesta categoria.</p>
                                              </div>
                                            )}
                                          </div>
                                        </AccordionContent>
                                      </AccordionItem>
                                    );
                                  })}
                                </Accordion>
                              ) : (
                                <div className="text-center p-8 bg-gray-50 rounded-lg">
                                  <Grid3X3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-gray-500">Nenhuma categoria cadastrada neste nicho.</p>
                                </div>
                              )}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Modal para criar/editar nicho */}
        <Dialog open={isNicheDialogOpen} onOpenChange={setIsNicheDialogOpen}>
          <DialogContent className="backdrop-blur-md backdrop:bg-blue-100/60 border-0 shadow-2xl rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                {nicheForm.id ? <Pencil className="h-5 w-5 text-blue-500" /> : <Plus className="h-5 w-5 text-green-500" />}
                {nicheForm.id ? "Editar Nicho" : "Criar Novo Nicho"}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {nicheForm.id
                  ? "Atualize as informações do nicho existente."
                  : "Preencha as informações para criar um novo nicho."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleNicheSubmit}>
              <div className="space-y-5 py-2">
                <div className="space-y-2">
                  <Label htmlFor="niche-name" className="font-semibold text-blue-800">Nome do Nicho *</Label>
                  <Input
                    id="niche-name"
                    name="name"
                    value={nicheForm.name}
                    onChange={(e) => setNicheForm({ ...nicheForm, name: e.target.value })}
                    placeholder="Ex: Beleza e Estética"
                    className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="niche-description" className="font-semibold text-blue-800">Descrição</Label>
                  <Textarea
                    id="niche-description"
                    name="description"
                    value={nicheForm.description}
                    onChange={(e) => setNicheForm({ ...nicheForm, description: e.target.value })}
                    placeholder="Descreva este nicho de mercado..."
                    rows={3}
                    className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="niche-icon" className="font-semibold text-blue-800">Ícone *</Label>
                  <Select
                    onValueChange={(e) => setNicheForm({ ...nicheForm, icon: e })}
                    defaultValue={nicheForm.icon}
                  >
                    <SelectTrigger className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
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

              <DialogFooter className="mt-6 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNicheDialogOpen(false)}
                  className="rounded-lg border-blue-200 hover:bg-blue-100"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={nichesMutation.isPending}
                  className="rounded-lg font-semibold shadow-md bg-blue-600 hover:bg-blue-700"
                >
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
        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          {/* Overlay transparente apenas para este modal via style inline */}
          <DialogContent
            className="fixed left-1/2 top-1/2 z-50 flex w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col border-2 border-blue-100 bg-white shadow-2xl rounded-3xl p-0 overflow-hidden max-h-[90vh]"
            style={{ '--radix-dialog-overlay-background': 'transparent', '--radix-dialog-overlay-backdrop-filter': 'none', padding: 0 } as React.CSSProperties }
          >
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-400 rounded-t-3xl" />
            <div className="p-6 pt-6 overflow-y-auto max-h-[80vh]">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 rounded-xl shadow-lg">
                  <Plus className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-blue-900 leading-tight">
                    {categoryForm.id ? "Editar Categoria" : "Criar Nova Categoria"}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {categoryForm.id ? "Atualize as informações da categoria existente." : "Preencha as informações para criar uma nova categoria."}
                  </p>
                </div>
              </div>
              <form onSubmit={handleCategorySubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name" className="font-semibold text-blue-800">Nome da Categoria *</Label>
                    <Input
                      id="category-name"
                      name="name"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="Ex: Cabelo"
                      className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category-description" className="font-semibold text-blue-800">Descrição</Label>
                    <Textarea
                      id="category-description"
                      name="description"
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      placeholder="Descreva esta categoria..."
                      rows={3}
                      className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-icon" className="font-semibold text-blue-800">Ícone *</Label>
                      <Select
                        onValueChange={(e) => setCategoryForm({ ...categoryForm, icon: e })}
                        defaultValue={categoryForm.icon}
                      >
                        <SelectTrigger className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white">
                          <div className="flex items-center gap-2">
                            {categoryForm.icon && getIconComponent(categoryForm.icon) ? (
                              <span className="inline-flex items-center justify-center w-5 h-5">
                                {getIconComponent(categoryForm.icon)({ className: "w-5 h-5 text-blue-500" })}
                              </span>
                            ) : null}
                            <SelectValue placeholder="Selecione um ícone" />
                          </div>
                        </SelectTrigger>
                        {/* Força o fundo branco e sombra forte no dropdown do select de ícones */}
                        <SelectContent className="bg-white border-2 border-blue-100 shadow-2xl rounded-lg">
                          {Object.keys(icons || {}).map((iconName) => {
                            const Icon = getIconComponent(iconName);
                            return (
                              <SelectItem key={iconName} value={iconName} className="flex items-center gap-2 px-3 py-2 hover:bg-blue-50">
                                <span className="inline-flex items-center justify-center w-5 h-5">
                                  {Icon ? <Icon className="w-5 h-5 text-blue-500" /> : null}
                                </span>
                                <span className="text-gray-700">{iconName}</span>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category-color" className="font-semibold text-blue-800">Cor *</Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id="category-color"
                          name="color"
                          type="color"
                          value={categoryForm.color}
                          onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                          className="w-12 h-10 rounded-lg border-2 border-blue-200"
                        />
                        <Input
                          type="text"
                          value={categoryForm.color}
                          onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                          className="flex-1 rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-8 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCategoryDialogOpen(false)}
                    className="rounded-lg border-blue-200 hover:bg-blue-50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={categoriesMutation.isPending}
                    className="rounded-lg font-semibold shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-2 text-base"
                  >
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
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal para criar/editar serviço */}
        <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
          <DialogContent className="backdrop-blur-md backdrop:bg-blue-100/60 border-0 shadow-2xl rounded-2xl max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                {serviceForm.id ? <Pencil className="h-5 w-5 text-blue-500" /> : <Plus className="h-5 w-5 text-green-500" />}
                {serviceForm.id ? "Editar Serviço" : "Criar Novo Serviço"}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {serviceForm.id
                  ? "Atualize as informações do serviço existente."
                  : "Preencha as informações para criar um novo serviço."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleServiceSubmit}>
              <div className="space-y-5 py-2">
                <div className="space-y-2">
                  <Label htmlFor="service-name" className="font-semibold text-blue-800">Nome do Serviço *</Label>
                  <Input
                    id="service-name"
                    name="name"
                    value={serviceForm.name}
                    onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                    placeholder="Ex: Corte de Cabelo Feminino"
                    className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-description" className="font-semibold text-blue-800">Descrição</Label>
                  <Textarea
                    id="service-description"
                    name="description"
                    value={serviceForm.description}
                    onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                    placeholder="Descreva este serviço..."
                    rows={3}
                    className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-duration" className="font-semibold text-blue-800">Duração (minutos) *</Label>
                  <Input
                    id="service-duration"
                    name="duration"
                    type="number"
                    min="5"
                    step="5"
                    value={serviceForm.duration}
                    onChange={(e) => setServiceForm({ ...serviceForm, duration: parseInt(e.target.value) || 30 })}
                    placeholder="30"
                    className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsServiceDialogOpen(false)}
                  className="rounded-lg border-blue-200 hover:bg-blue-100"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={servicesMutation.isPending}
                  className="rounded-lg font-semibold shadow-md bg-blue-600 hover:bg-blue-700"
                >
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
          <DialogContent className="backdrop-blur-md backdrop:bg-red-100/60 border-0 shadow-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-700 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Confirmar exclusão
              </DialogTitle>
              <DialogDescription className="text-gray-700">
                {deleteType === "niche" &&
                  "Tem certeza que deseja excluir este nicho? Todas as categorias e serviços relacionados também serão excluídos."}
                {deleteType === "category" &&
                  "Tem certeza que deseja excluir esta categoria? Todos os serviços relacionados também serão excluídos."}
                {deleteType === "service" &&
                  "Tem certeza que deseja excluir este serviço?"}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="rounded-lg border-blue-200 hover:bg-blue-100"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="rounded-lg font-semibold shadow-md bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? "Excluindo..." : "Sim, excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
