import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from "@/components/ui/card";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { 
  Loader2, MoreHorizontal, Eye, Edit, Trash2, Search, UserCheck, UserX, Filter,
  Users, Mail, Phone, Calendar, Shield, User as UserIcon, Building, Crown
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  userType: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
}

export default function UsersList() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserType, setSelectedUserType] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({
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

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<User> }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Usuário atualizado",
        description: "As informações do usuário foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      // Verificar se é o último admin ativo
      if (selectedUser?.userType === 'admin') {
        const activeAdmins = users.filter((u: User) => u.userType === 'admin' && u.isActive);
        if (activeAdmins.length <= 1) {
          throw new Error('Não é possível excluir o último administrador ativo');
        }
      }

      const response = await apiRequest('DELETE', `/api/admin/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const toggleUserStatus = (user: User) => {
    updateUserMutation.mutate({
      id: user.id,
      data: { isActive: !user.isActive }
    });
  };

  const filteredUsers = users?.filter((user: User) => {
    if (selectedUserType && user.userType !== selectedUserType) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = (user.name || "").toLowerCase();
      const email = user.email.toLowerCase();
      const phone = (user.phone || "").toLowerCase();

      return (
        name.includes(query) || 
        email.includes(query) ||
        phone.includes(query)
      );
    }

    return true;
  });

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditUserDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'admin':
        return <Crown className="h-4 w-4" />;
      case 'provider':
        return <Building className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 border-purple-300';
      case 'provider':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300';
      default:
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300';
    }
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            <p className="text-gray-600 text-lg">Carregando usuários...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-600" />
                Lista de Usuários
              </CardTitle>
              <CardDescription className="text-gray-600">
                {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''} encontrado{filteredUsers.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email ou telefone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-[300px] border-gray-200 focus:border-blue-500"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtrar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setSelectedUserType(null)}>
                    <Users className="mr-2 h-4 w-4" />
                    Todos os tipos
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedUserType("client")}>
                    <UserIcon className="mr-2 h-4 w-4" />
                    Apenas clientes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedUserType("provider")}>
                    <Building className="mr-2 h-4 w-4" />
                    Apenas prestadores
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedUserType("admin")}>
                    <Crown className="mr-2 h-4 w-4" />
                    Apenas administradores
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
              {filteredUsers.map((user: User) => (
                <Card key={user.id} className="border border-gray-100 hover:shadow-md transition-shadow group">
                  <CardContent className="p-6">
                    {/* Header do card */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${user.isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                          <UserIcon className={`h-5 w-5 ${user.isActive ? 'text-green-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {user.name || "Sem nome"}
                          </h3>
                          <p className="text-sm text-gray-500">ID: {user.id}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(user)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Editar</span>
                          </DropdownMenuItem>
                          {user.isActive ? (
                            <DropdownMenuItem 
                              className="cursor-pointer text-red-600"
                              onClick={() => toggleUserStatus(user)}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              <span>Desativar</span>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              className="cursor-pointer text-green-600"
                              onClick={() => toggleUserStatus(user)}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              <span>Ativar</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="cursor-pointer text-red-600"
                            onClick={() => handleDelete(user)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Excluir</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Informações do usuário */}
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="truncate">{user.email}</span>
                      </div>
                      
                      {user.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          <span>{user.phone}</span>
                        </div>
                      )}

                      {user.createdAt && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          <span>Cadastrado em {new Date(user.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>

                    {/* Badges de status */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      <Badge className={`${getUserTypeColor(user.userType)} border font-medium`}>
                        {getUserTypeIcon(user.userType)}
                        <span className="ml-1">
                          {user.userType === 'admin' ? 'Administrador' :
                           user.userType === 'provider' ? 'Prestador' :
                           'Cliente'}
                        </span>
                      </Badge>
                      
                      <Badge 
                        variant={user.isActive ? "default" : "secondary"}
                        className={user.isActive 
                          ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-300" 
                          : "bg-red-100 text-red-800 hover:bg-red-100 border-red-300"
                        }
                      >
                        {user.isActive ? 'Ativo' : 'Inativo'}
                      </Badge>
                      
                      <Badge 
                        variant="outline"
                        className={user.isVerified 
                          ? "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300" 
                          : "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300"
                        }
                      >
                        <Shield className="h-3 w-3 mr-1" />
                        {user.isVerified ? 'Verificado' : 'Não verificado'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 p-4 rounded-full w-fit mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
              <p className="text-gray-500">
                {searchQuery || selectedUserType 
                  ? "Tente ajustar os filtros de busca" 
                  : "Não há usuários cadastrados no sistema"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="backdrop-blur-sm backdrop:bg-black/20">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Você tem certeza que deseja excluir o usuário <strong>{selectedUser?.name || selectedUser?.email}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedUser && deleteUserMutation.mutate(selectedUser.id)}
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}