import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Plus, MapPin, Home, Briefcase, Trash2, Check, Edit, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Tipo de endereço
interface Address {
  id: string;
  type: "home" | "work" | "other";
  name: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
  userId: number;
}

interface AddressFormData extends Omit<Address, "id" | "isDefault" | "userId"> {}

export default function AddressesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Estado para controlar o modal e os diálogos
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Estado para o formulário de endereço
  const [addressForm, setAddressForm] = useState<AddressFormData>({
    type: "home",
    name: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    zipCode: ""
  });
  
  // Buscar endereços do usuário
  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["/api/user/addresses"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/user/addresses");
        if (!response.ok) {
          throw new Error("Falha ao carregar endereços");
        }
        return await response.json();
      } catch (error) {
        console.error("Erro ao buscar endereços:", error);
        return [];
      }
    }
  });
  
  // Mutation para adicionar endereço
  const addAddressMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const response = await apiRequest("POST", "/api/user/addresses", data);
      if (!response.ok) {
        throw new Error("Falha ao adicionar endereço");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/addresses"] });
      toast({
        title: "Endereço adicionado",
        description: "Seu novo endereço foi adicionado com sucesso.",
      });
      resetAndCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para atualizar endereço
  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: AddressFormData }) => {
      const response = await apiRequest("PUT", `/api/user/addresses/${id}`, data);
      if (!response.ok) {
        throw new Error("Falha ao atualizar endereço");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/addresses"] });
      toast({
        title: "Endereço atualizado",
        description: "Seu endereço foi atualizado com sucesso.",
      });
      resetAndCloseDialog();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para excluir endereço
  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/user/addresses/${id}`);
      if (!response.ok) {
        throw new Error("Falha ao remover endereço");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/addresses"] });
      toast({
        title: "Endereço removido",
        description: "Seu endereço foi removido com sucesso.",
      });
      setDeleteDialogOpen(false);
      setSelectedAddressId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Mutation para definir endereço padrão
  const setDefaultAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PUT", `/api/user/addresses/${id}/default`);
      if (!response.ok) {
        throw new Error("Falha ao definir endereço padrão");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/addresses"] });
      toast({
        title: "Endereço padrão atualizado",
        description: "Seu endereço padrão foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddressForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAddressTypeChange = (value: "home" | "work" | "other") => {
    setAddressForm(prev => ({ ...prev, type: value }));
  };
  
  const handleSaveAddress = () => {
    // Validar campos obrigatórios
    if (!addressForm.name || !addressForm.street || !addressForm.number || 
        !addressForm.neighborhood || !addressForm.city || !addressForm.state || !addressForm.zipCode) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    if (isEditing && selectedAddressId) {
      updateAddressMutation.mutate({ id: selectedAddressId, data: addressForm });
    } else {
      addAddressMutation.mutate(addressForm);
    }
  };
  
  const handleEditAddress = (address: Address) => {
    setIsEditing(true);
    setSelectedAddressId(address.id);
    setAddressForm({
      type: address.type,
      name: address.name,
      street: address.street,
      number: address.number,
      complement: address.complement || "",
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode
    });
    setAddressDialogOpen(true);
  };
  
  const handleDeleteAddress = () => {
    if (selectedAddressId) {
      deleteAddressMutation.mutate(selectedAddressId);
    }
  };
  
  const confirmDeleteAddress = (id: string) => {
    setSelectedAddressId(id);
    setDeleteDialogOpen(true);
  };
  
  const handleSetDefaultAddress = (id: string) => {
    setDefaultAddressMutation.mutate(id);
  };
  
  const resetAndCloseDialog = () => {
    setAddressDialogOpen(false);
    setIsEditing(false);
    setSelectedAddressId(null);
    setAddressForm({
      type: "home",
      name: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: ""
    });
  };
  
  const handleAddNewAddress = () => {
    setIsEditing(false);
    setSelectedAddressId(null);
    setAddressForm({
      type: "home",
      name: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: ""
    });
    setAddressDialogOpen(true);
  };
  
  const goBack = () => {
    setLocation("/client/profile");
  };
  
  // Função para obter o ícone do tipo de endereço
  const getAddressTypeIcon = (type: string) => {
    switch (type) {
      case "home":
        return <Home className="h-5 w-5 text-primary" />;
      case "work":
        return <Briefcase className="h-5 w-5 text-primary" />;
      default:
        return <MapPin className="h-5 w-5 text-primary" />;
    }
  };
  
  // Função para obter o nome do tipo de endereço
  const getAddressTypeName = (type: string) => {
    switch (type) {
      case "home":
        return "Casa";
      case "work":
        return "Trabalho";
      default:
        return "Outro";
    }
  };
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center">
        <button onClick={goBack} className="mr-2">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">Meus Endereços</h1>
      </div>
      
      <div className="p-4">
        <p className="text-neutral-600 mb-6">
          Gerencie seus endereços para facilitar seus agendamentos.
        </p>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Lista de endereços */}
            <div className="space-y-4 mb-6">
              {addresses.length === 0 ? (
                <div className="text-center py-6 border rounded-lg border-dashed border-neutral-300">
                  <MapPin className="h-10 w-10 mx-auto text-neutral-400 mb-2" />
                  <p className="text-neutral-600">Você ainda não tem endereços cadastrados.</p>
                  <p className="text-sm text-neutral-500 mb-4">Adicione um endereço para facilitar seus agendamentos.</p>
                </div>
              ) : (
                addresses.map((address) => (
                  <Card key={address.id} className="border border-neutral-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between">
                        <div className="flex items-start">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                            {getAddressTypeIcon(address.type)}
                          </div>
                          <div>
                            <div className="flex items-center">
                              <p className="font-medium">{address.name}</p>
                              {address.isDefault && (
                                <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                                  Padrão
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-neutral-500">
                              {address.street}, {address.number} 
                              {address.complement && ` - ${address.complement}`}
                            </p>
                            <p className="text-sm text-neutral-500">
                              {address.neighborhood}, {address.city} - {address.state}
                            </p>
                            <p className="text-sm text-neutral-500">
                              CEP: {address.zipCode}
                            </p>
                            
                            <div className="flex mt-2 gap-2">
                              {!address.isDefault && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleSetDefaultAddress(address.id)}
                                  disabled={setDefaultAddressMutation.isPending}
                                  className="h-7 px-2 text-xs"
                                >
                                  Definir como padrão
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditAddress(address)}
                                className="h-7 px-2 text-xs"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => confirmDeleteAddress(address.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            {/* Botão para adicionar endereço */}
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleAddNewAddress}
            >
              <Plus className="mr-2 h-4 w-4" />
              Adicionar novo endereço
            </Button>
          </>
        )}
      </div>
      
      {/* Modal para adicionar/editar endereço */}
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Editar endereço" : "Adicionar endereço"}</DialogTitle>
            <DialogDescription>
              {isEditing 
                ? "Edite as informações do seu endereço."
                : "Adicione um novo endereço para facilitar seus agendamentos."
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tipo de endereço</Label>
              <RadioGroup 
                value={addressForm.type} 
                onValueChange={(v) => handleAddressTypeChange(v as "home" | "work" | "other")}
                className="flex space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="home" id="home" />
                  <Label htmlFor="home" className="cursor-pointer">Casa</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="work" id="work" />
                  <Label htmlFor="work" className="cursor-pointer">Trabalho</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="cursor-pointer">Outro</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="name">Nome do endereço</Label>
              <Input
                id="name"
                name="name"
                value={addressForm.name}
                onChange={handleAddressChange}
                placeholder="Ex: Casa, Trabalho, Casa dos pais"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input
                id="zipCode"
                name="zipCode"
                value={addressForm.zipCode}
                onChange={handleAddressChange}
                placeholder="00000-000"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="street">Rua</Label>
                <Input
                  id="street"
                  name="street"
                  value={addressForm.street}
                  onChange={handleAddressChange}
                  placeholder="Nome da rua"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="number">Número</Label>
                <Input
                  id="number"
                  name="number"
                  value={addressForm.number}
                  onChange={handleAddressChange}
                  placeholder="Número"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="complement">Complemento (opcional)</Label>
              <Input
                id="complement"
                name="complement"
                value={addressForm.complement}
                onChange={handleAddressChange}
                placeholder="Apto, Bloco, Sala, etc."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input
                id="neighborhood"
                name="neighborhood"
                value={addressForm.neighborhood}
                onChange={handleAddressChange}
                placeholder="Bairro"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  name="city"
                  value={addressForm.city}
                  onChange={handleAddressChange}
                  placeholder="Cidade"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  name="state"
                  value={addressForm.state}
                  onChange={handleAddressChange}
                  placeholder="Estado"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={resetAndCloseDialog}
              disabled={addAddressMutation.isPending || updateAddressMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveAddress}
              disabled={addAddressMutation.isPending || updateAddressMutation.isPending}
            >
              {(addAddressMutation.isPending || updateAddressMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Atualizando..." : "Adicionando..."}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  {isEditing ? "Atualizar endereço" : "Adicionar endereço"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmação para excluir endereço */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover endereço</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este endereço? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteAddressMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAddress}
              disabled={deleteAddressMutation.isPending}
            >
              {deleteAddressMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removendo...
                </>
              ) : (
                "Remover endereço"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}