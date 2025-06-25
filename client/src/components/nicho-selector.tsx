import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  AlertCircle, 
  Car, 
  Scissors, 
  Home,
  ShowerHead,
  Utensils,
  Wrench,
  Heart,
  Shirt,
  Brush,
  PenTool,
  BarChart,
  Baby,
  Sparkles,
  Check,
  ArrowRight
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Defina a interface do tipo Especialidade (antigo Nicho)
interface Specialty {
  id: number;
  name: string;
  description?: string;
  icon?: string;
}

interface EspecialidadeSelectorProps {
  niches: Specialty[] | undefined;
  isLoading: boolean;
  onNicheSelect: (nicheId: number) => void;
  selectedNicheId: number | null;
}

export function NichoSelector({ niches, isLoading, onNicheSelect, selectedNicheId }: EspecialidadeSelectorProps) {
  // Estado para gerenciar a busca de nichos - iniciamos com string vazia para não pré-selecionar
  const [searchTerm, setSearchTerm] = useState('');
  
  // Removido o efeito de busca automática de "estética automotiva"
  // Agora o usuário precisa selecionar explicitamente um nicho

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Escolha a especialidade</CardTitle>
          <CardDescription>Carregando especialidades disponíveis...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!niches?.length) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Escolha a especialidade</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Não foi possível carregar as especialidades. Por favor, tente novamente mais tarde.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Filtrar nichos com base no termo de busca
  const filteredNiches = searchTerm.trim() === '' 
    ? niches 
    : niches.filter(niche => 
        niche.name.toLowerCase().includes(searchTerm.toLowerCase()));
  
  // Função para retornar o ícone apropriado com base no nome do nicho
  const getNicheIcon = (nicheName: string) => {
    const name = nicheName.toLowerCase();
    const iconSize = "h-6 w-6";
    
    if (name.includes('estética automotiva') || name.includes('carro')) {
      return <Car className={iconSize} />;
    } else if (name.includes('beleza') || name.includes('cabelo')) {
      return <Scissors className={iconSize} />;
    } else if (name.includes('casa') || name.includes('domiciliar')) {
      return <Home className={iconSize} />;
    } else if (name.includes('limpeza')) {
      return <ShowerHead className={iconSize} />;
    } else if (name.includes('alimentação') || name.includes('comida')) {
      return <Utensils className={iconSize} />;
    } else if (name.includes('reparo') || name.includes('conserto')) {
      return <Wrench className={iconSize} />;
    } else if (name.includes('saúde')) {
      return <Heart className={iconSize} />;
    } else if (name.includes('vestuário') || name.includes('roupa')) {
      return <Shirt className={iconSize} />;
    } else if (name.includes('arte')) {
      return <Brush className={iconSize} />;
    } else if (name.includes('design')) {
      return <PenTool className={iconSize} />;
    } else if (name.includes('consultoria')) {
      return <BarChart className={iconSize} />;
    } else if (name.includes('infantil') || name.includes('criança')) {
      return <Baby className={iconSize} />;
    } else {
      return <Sparkles className={iconSize} />;
    }
  };

  // Cores para os botões rápidos (4 cores diferentes)
  const buttonColors = [
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-green-100 text-green-800 border-green-200", 
    "bg-purple-100 text-purple-800 border-purple-200",
    "bg-amber-100 text-amber-800 border-amber-200"
  ];

  // Nichos populares para exibir como botões de acesso rápido
  // Usar os primeiros 6 nichos ou menos, se houver menos nichos disponíveis
  const popularNiches = niches.slice(0, Math.min(6, niches.length));

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle>Escolha a especialidade</CardTitle>
        <CardDescription>
          Qual é a especialidade do serviço que você precisa?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Campo de busca */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar especialidade..."
            className="pl-9 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Resultados de pesquisa quando um termo é buscado */}
        {searchTerm.trim() !== '' && filteredNiches.length > 0 && (
          <div>
            <div className="text-sm font-medium mb-2 text-primary">Resultados da busca</div>
            <div className="space-y-2">
              {filteredNiches.map((niche) => (
                <Button
                  key={niche.id}
                  variant="outline"
                  className="justify-start py-4 px-3 text-left h-auto w-full bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                  onClick={() => onNicheSelect(niche.id)}
                >
                  <div className="flex items-center">
                    {getNicheIcon(niche.name)}
                    <span>{niche.name}</span>
                  </div>
                </Button>
              ))}
              
              {selectedNicheId && (
                <Button 
                  className="w-full mt-4" 
                  onClick={() => onNicheSelect(selectedNicheId)}
                >
                  <div className="flex items-center justify-center">
                    <span>Continuar</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Botões de acesso rápido - só mostrar se não estiver pesquisando */}
        {searchTerm.trim() === '' && (
          <div>
            <div className="text-sm font-medium mb-2 text-muted-foreground">Especialidades populares</div>
            <div className="grid grid-cols-2 gap-4">
              {popularNiches.map((niche, index) => (
                <button
                  key={niche.id}
                  className={`border rounded-xl p-4 flex flex-col items-center text-center ${buttonColors[index % buttonColors.length]} transition-all hover:shadow-md`}
                  onClick={() => onNicheSelect(niche.id)}
                >
                  <div className="w-16 h-16 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center mb-2">
                    {getNicheIcon(niche.name)}
                  </div>
                  <span className="text-sm font-medium">{niche.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Dropdown para todas as especialidades - só mostrar se não estiver pesquisando */}
        {searchTerm.trim() === '' && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-muted-foreground">Todas as especialidades</div>
            <Select 
              onValueChange={(value) => onNicheSelect(Number(value))} 
              value={selectedNicheId?.toString() || ""}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma especialidade" />
              </SelectTrigger>
              <SelectContent>
                {filteredNiches.map((niche) => (
                  <SelectItem key={niche.id} value={niche.id.toString()}>
                    <div className="flex items-center">
                      {getNicheIcon(niche.name)}
                      <span>{niche.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedNicheId && (
              <Button 
                className="w-full mt-4" 
                onClick={() => onNicheSelect(selectedNicheId)}
              >
                <div className="flex items-center justify-center">
                    <span>Continuar</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}