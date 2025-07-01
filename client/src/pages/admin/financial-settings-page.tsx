import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Percent,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Ticket,
  Wallet,
  Copy,
  Tag,
  Plus,
  Users,
  Edit,
  Trash2,
  Info
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import AdminLayout from "@/components/layout/admin-layout";

// Interface para as configurações financeiras
interface FinancialSettings {
  id: number;
  // Configurações gerais
  serviceFee: number; // Valor em centavos
  fixedServiceFee: number; // Taxa de serviço fixa em valor
  minServiceFee: number; // Valor mínimo em centavos
  maxServiceFee: number; // Valor máximo em centavos
  payoutSchedule: "instant" | "daily" | "weekly" | "monthly";
  
  // Configurações do Stripe
  stripeEnabled: boolean;
  stripeLiveMode: boolean;
  stripePublicKey: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripeConnectEnabled: boolean;
  
  // Configurações do Asaas
  asaasEnabled: boolean;
  asaasLiveMode: boolean;
  asaasApiKey: string;
  asaasWebhookToken: string;
  asaasWalletId: string;
  asaasSplitEnabled: boolean;

  // Configurações de cupons de desconto
  enableCoupons: boolean;
  maxDiscountPercentage: number; // Percentual máximo de desconto permitido
  defaultExpirationDays: number; // Dias padrão para expiração de cupons
}

// Tipo para cupom de desconto
interface DiscountCoupon {
  id: number;
  code: string;
  description: string;
  discountPercentage: number;
  discountValue: number;
  startDate: string;
  endDate: string;
  maxUses: number;
  currentUses: number;
  providerId?: number;
  serviceId?: number;
  categoryId?: number;
  nicheId?: number;
  isActive: boolean;
  createdAt: string;
}

// Schema de validação Zod para configurações financeiras
const financialSettingsSchema = z.object({
  // Campo oculto para ID
  id: z.number().optional(),
  
  // Configurações gerais
  fixedServiceFee: z.preprocess(
    (val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number().min(0, "O valor da taxa deve ser maior ou igual a 0")
  ),
  minServiceFee: z.preprocess(
    (val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number().min(0, "O valor mínimo deve ser maior ou igual a 0")
  ),
  maxServiceFee: z.preprocess(
    (val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number().min(0, "O valor máximo deve ser maior ou igual a 0")
  ),
  payoutSchedule: z.enum(["instant", "daily", "weekly", "monthly"]),
  
  // Configurações do Stripe
  stripeEnabled: z.boolean(),
  stripeLiveMode: z.boolean(),
  stripePublicKey: z.string(),
  stripeSecretKey: z.string(),
  stripeWebhookSecret: z.string().optional(),
  stripeConnectEnabled: z.boolean(),
  
  // Configurações do Asaas
  asaasEnabled: z.boolean().default(false),
  asaasLiveMode: z.boolean().default(false),
  asaasApiKey: z.string(),
  asaasWebhookToken: z.string().optional(),
  asaasWalletId: z.string().optional(),
  asaasSplitEnabled: z.boolean().default(false),

  // Configurações de cupons
  enableCoupons: z.boolean().default(true),
  maxDiscountPercentage: z.preprocess(
    (val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number().min(0, "O desconto máximo deve ser maior ou igual a 0").max(100, "O desconto máximo não pode exceder 100%")
  ),
  defaultExpirationDays: z.preprocess(
    (val) => {
      const parsed = parseInt(val as string);
      return isNaN(parsed) ? 30 : parsed;
    },
    z.number().min(1, "O período de expiração deve ser de pelo menos 1 dia")
  )
})
.superRefine((data, ctx) => {
  // Verificação condicional para Stripe - apenas se estiver habilitado
  if (data.stripeEnabled) {
    if (data.stripePublicKey.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A chave pública do Stripe é obrigatória quando o Stripe está ativado",
        path: ["stripePublicKey"]
      });
    }
    
    if (data.stripeSecretKey.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A chave secreta do Stripe é obrigatória quando o Stripe está ativado",
        path: ["stripeSecretKey"]
      });
    }
  }
  
  // Verificação condicional para Asaas - apenas se estiver habilitado
  if (data.asaasEnabled) {
    if (data.asaasApiKey.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A chave API do Asaas é obrigatória quando o Asaas está ativado",
        path: ["asaasApiKey"]
      });
    }
  }
})
.refine(data => {
  return data.maxServiceFee >= data.minServiceFee;
}, {
  message: "O valor máximo da taxa deve ser maior ou igual ao valor mínimo",
  path: ["maxServiceFee"]
});

// Schema de validação para cupons de desconto
const discountCouponSchema = z.object({
  id: z.number().optional(),
  code: z.string()
    .min(3, "O código precisa ter pelo menos 3 caracteres")
    .max(20, "O código não pode ter mais de 20 caracteres")
    .regex(/^[A-Z0-9]+$/, "O código deve conter apenas letras maiúsculas e números"),
  description: z.string().min(3, "A descrição precisa ter pelo menos 3 caracteres"),
  discountPercentage: z.preprocess(
    (val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number().min(0, "O percentual deve ser maior ou igual a 0").max(100, "O percentual não pode exceder 100%")
  ),
  discountValue: z.preprocess(
    (val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number().min(0, "O valor deve ser maior ou igual a 0")
  ),
  startDate: z.date(),
  endDate: z.date(),
  maxUses: z.preprocess(
    (val) => {
      const parsed = parseInt(val as string);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number().min(0, "O número máximo de usos deve ser maior ou igual a 0")
  ),
  providerId: z.number().optional().nullable(),
  serviceId: z.number().optional().nullable(),
  categoryId: z.number().optional().nullable(),
  nicheId: z.number().optional().nullable(),
  isActive: z.boolean().default(true),
})
.refine(data => {
  // Verifica se pelo menos um desconto está definido
  return data.discountPercentage > 0 || data.discountValue > 0;
}, {
  message: "É necessário definir um valor de desconto percentual ou fixo",
  path: ["discountPercentage"]
})
.refine(data => {
  // Verifica se a data de término é posterior à data de início
  return data.endDate >= data.startDate;
}, {
  message: "A data de término deve ser igual ou posterior à data de início",
  path: ["endDate"]
});

export default function FinancialSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("payment-providers");
  const [showTestStripeAlert, setShowTestStripeAlert] = useState(false);
  const [testStripeResult, setTestStripeResult] = useState<{success: boolean, message: string} | null>(null);
  const [showTestAsaasAlert, setShowTestAsaasAlert] = useState(false);
  const [testAsaasResult, setTestAsaasResult] = useState<{success: boolean, message: string} | null>(null);
  const [openCouponDialog, setOpenCouponDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<DiscountCoupon | null>(null);
  
  // Form setup com React Hook Form para configurações financeiras
  const form = useForm<z.infer<typeof financialSettingsSchema>>({
    resolver: zodResolver(financialSettingsSchema),
    defaultValues: {
      // Configurações gerais
      fixedServiceFee: 5,
      minServiceFee: 2,
      maxServiceFee: 50,
      payoutSchedule: "weekly",
      
      // Configurações do Stripe
      stripeEnabled: false,
      stripeLiveMode: false,
      stripePublicKey: "",
      stripeSecretKey: "",
      stripeWebhookSecret: "",
      stripeConnectEnabled: false,
      
      // Configurações do Asaas
      asaasEnabled: false,
      asaasLiveMode: false,
      asaasApiKey: "",
      asaasWebhookToken: "",
      asaasWalletId: "",
      asaasSplitEnabled: false,

      // Configurações de cupons
      enableCoupons: true,
      maxDiscountPercentage: 50,
      defaultExpirationDays: 30,
    }
  });

  // Form para cupons de desconto
  const couponForm = useForm<z.infer<typeof discountCouponSchema>>({
    resolver: zodResolver(discountCouponSchema),
    defaultValues: {
      code: "",
      description: "",
      discountPercentage: 0,
      discountValue: 0,
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
      maxUses: 100,
      isActive: true,
      providerId: null,
      serviceId: null,
      categoryId: null,
      nicheId: null,
    }
  });

  // Consultar configurações existentes
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/admin/financial-settings"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/financial-settings");
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar configurações financeiras:", error);
        return undefined;
      }
    }
  });

  // Consultar cupons existentes
  const { data: coupons, isLoading: isLoadingCoupons } = useQuery({
    queryKey: ["/api/admin/coupons"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/coupons");
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar cupons:", error);
        return [];
      }
    }
  });

  // Consultar niches para o formulário de cupons
  const { data: niches } = useQuery({
    queryKey: ["/api/niches"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/niches");
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar niches:", error);
        return [];
      }
    }
  });

  // Consultar categorias para o formulário de cupons
  const { data: categories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/categories");
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
        return [];
      }
    }
  });

  // Consultar serviços para o formulário de cupons
  const { data: services } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/services");
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
        return [];
      }
    }
  });

  // Consultar prestadores para o formulário de cupons
  const { data: providers } = useQuery({
    queryKey: ["/api/users?userType=provider"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/users?userType=provider");
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar prestadores:", error);
        return [];
      }
    }
  });

  // Mutação para salvar configurações financeiras
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      try {
        // Determinar a URL e método corretos com base na existência do ID
        const id = newSettings.id || settings?.id;
        const url = id 
          ? `/api/admin/financial-settings/${id}` 
          : "/api/admin/financial-settings";
        
        const method = id ? "PATCH" : "POST";
        console.log(`Enviando ${method} para ${url} com dados:`, newSettings);
        
        // Garantir que temos os dados formatados corretamente
        const res = await apiRequest(method, url, newSettings);
        
        // Verificar se temos resposta com erro
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          console.error("Resposta de erro do servidor:", errorData);
          throw new Error(errorData?.error || `Erro ${res.status}: ${res.statusText}`);
        }
        
        // Retornar dados da resposta
        return await res.json();
      } catch (error) {
        console.error("Erro na requisição:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Configurações salvas",
        description: "As configurações financeiras foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/financial-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao salvar configurações: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  });

  // Mutation para testar a conexão com o Stripe
  const testStripeConnectionMutation = useMutation({
    mutationFn: async () => {
      // Capturar valores atuais do formulário antes de enviar
      const stripeSecretKey = form.getValues().stripeSecretKey;
      const stripeLiveMode = form.getValues().stripeLiveMode;
      
      // Salvar as configurações primeiro, para garantir que estão atualizadas no servidor
      if (settings?.id) {
        try {
          const formData = form.getValues();
          const formattedData = {
            ...formData,
            id: settings.id,
            fixedServiceFee: Math.round(parseFloat(formData.fixedServiceFee.toString()) * 100),
            serviceFee: Math.round(parseFloat(formData.fixedServiceFee.toString()) * 100),
            minServiceFee: Math.round(parseFloat(formData.minServiceFee.toString()) * 100),
            maxServiceFee: Math.round(parseFloat(formData.maxServiceFee.toString()) * 100),
            stripeSecretKey,
            stripeLiveMode
          };
          
          await saveSettingsMutation.mutateAsync(formattedData);
        } catch (error) {
          console.error("Erro ao salvar configurações antes do teste Stripe:", error);
          // Continuar com o teste mesmo se o salvamento falhar
        }
      }
      
      const res = await apiRequest("POST", "/api/admin/financial-settings/test-stripe", {
        stripeSecretKey,
        stripeLiveMode
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setTestStripeResult({
        success: data.success,
        message: data.message || (data.success ? "Conexão estabelecida com sucesso!" : "Falha na conexão")
      });
      setShowTestStripeAlert(true);
    },
    onError: (error: any) => {
      setTestStripeResult({
        success: false,
        message: `Erro ao testar conexão: ${error.message}`
      });
      setShowTestStripeAlert(true);
    }
  });
  
  // Mutation para testar a conexão com o Asaas
  const testAsaasConnectionMutation = useMutation({
    mutationFn: async () => {
      // Capturar valores atuais do formulário antes de enviar
      const asaasApiKey = form.getValues().asaasApiKey;
      const asaasLiveMode = form.getValues().asaasLiveMode;
      
      // Salvar as configurações primeiro, para garantir que estão atualizadas no servidor
      if (settings?.id) {
        try {
          const formData = form.getValues();
          const formattedData = {
            ...formData,
            id: settings.id,
            fixedServiceFee: Math.round(parseFloat(formData.fixedServiceFee.toString()) * 100),
            serviceFee: Math.round(parseFloat(formData.fixedServiceFee.toString()) * 100),
            minServiceFee: Math.round(parseFloat(formData.minServiceFee.toString()) * 100),
            maxServiceFee: Math.round(parseFloat(formData.maxServiceFee.toString()) * 100),
            asaasApiKey,
            asaasLiveMode
          };
          
          await saveSettingsMutation.mutateAsync(formattedData);
        } catch (error) {
          console.error("Erro ao salvar configurações antes do teste Asaas:", error);
          // Continuar com o teste mesmo se o salvamento falhar
        }
      }
      
      const res = await apiRequest("POST", "/api/admin/financial-settings/test-asaas", {
        asaasApiKey,
        asaasLiveMode
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setTestAsaasResult({
        success: data.success,
        message: data.message || (data.success ? "Conexão estabelecida com sucesso!" : "Falha na conexão")
      });
      setShowTestAsaasAlert(true);
    },
    onError: (error: any) => {
      setTestAsaasResult({
        success: false,
        message: `Erro ao testar conexão: ${error.message}`
      });
      setShowTestAsaasAlert(true);
    }
  });

  // Mutation para salvar cupom
  const saveCouponMutation = useMutation({
    mutationFn: async (couponData: any) => {
      try {
        // Formatar os dados para envio
        const formattedData = {
          ...couponData,
          discountPercentage: couponData.discountPercentage * 100, // Converter para centavos
          discountValue: couponData.discountValue * 100, // Converter para centavos
          startDate: couponData.startDate.toISOString(),
          endDate: couponData.endDate.toISOString(),
        };

        const method = couponData.id ? "PATCH" : "POST";
        const url = couponData.id ? `/api/admin/coupons/${couponData.id}` : "/api/admin/coupons";
        
        const res = await apiRequest(method, url, formattedData);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || `Erro ${res.status}: ${res.statusText}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Erro ao salvar cupom:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Cupom salvo",
        description: "O cupom de desconto foi salvo com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      setOpenCouponDialog(false);
      setEditingCoupon(null);
      couponForm.reset({
        code: "",
        description: "",
        discountPercentage: 0,
        discountValue: 0,
        startDate: new Date(),
        endDate: new Date(new Date().setDate(new Date().getDate() + 30)),
        maxUses: 100,
        isActive: true,
        providerId: null,
        serviceId: null,
        categoryId: null,
        nicheId: null,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao salvar cupom: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  });

  // Mutation para excluir cupom
  const deleteCouponMutation = useMutation({
    mutationFn: async (couponId: number) => {
      try {
        const res = await apiRequest("DELETE", `/api/admin/coupons/${couponId}`);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || `Erro ${res.status}: ${res.statusText}`);
        }
        
        return true;
      } catch (error) {
        console.error("Erro ao excluir cupom:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Cupom excluído",
        description: "O cupom de desconto foi excluído com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao excluir cupom: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  });

  // Função para salvar as configurações financeiras
  const onSubmit = async (data: z.infer<typeof financialSettingsSchema>) => {
    try {
      // Converter valores para centavos (R$)
      const serviceFeeValue = Math.round(parseFloat(data.fixedServiceFee.toString()) * 100);
      
      // Garantir que todos os campos estão presentes e com os valores corretos
      const formattedData = {
        ...data,
        id: settings?.id, // Garantir que o ID esteja presente
        fixedServiceFee: serviceFeeValue,
        serviceFee: serviceFeeValue, // Adicionando o campo serviceFee para compatibilidade
        minServiceFee: Math.round(parseFloat(data.minServiceFee.toString()) * 100),
        maxServiceFee: Math.round(parseFloat(data.maxServiceFee.toString()) * 100),
        maxDiscountPercentage: Math.round(parseFloat(data.maxDiscountPercentage.toString())),
        defaultExpirationDays: Math.round(parseFloat(data.defaultExpirationDays.toString())),
        
        // Garantir que as configurações booleanas estão presentes
        stripeEnabled: !!data.stripeEnabled,
        stripeLiveMode: !!data.stripeLiveMode,
        stripeConnectEnabled: !!data.stripeConnectEnabled,
        
        asaasEnabled: !!data.asaasEnabled,
        asaasLiveMode: !!data.asaasLiveMode,
        asaasSplitEnabled: !!data.asaasSplitEnabled,

        enableCoupons: !!data.enableCoupons,
        
        // Garantir que string vazias sejam enviadas como vazias e não undefined
        stripePublicKey: data.stripePublicKey || '',
        stripeSecretKey: data.stripeSecretKey || '',
        stripeWebhookSecret: data.stripeWebhookSecret || '',
        
        asaasApiKey: data.asaasApiKey || '',
        asaasWebhookToken: data.asaasWebhookToken || '',
        asaasWalletId: data.asaasWalletId || '',
        
        // Garantir a seleção de programação de pagamento
        payoutSchedule: data.payoutSchedule || 'weekly'
      };
      
      // Enviar os dados formatados
      await saveSettingsMutation.mutateAsync(formattedData);
    } catch (error) {
      console.error("Erro ao formatar/enviar dados:", error);
    }
  };

  // Função para abrir diálogo de criação de cupom de desconto
  const handleCreateCoupon = () => {
    setEditingCoupon(null);
    couponForm.reset({
      code: "",
      description: "",
      discountPercentage: 0,
      discountValue: 0,
      startDate: new Date(),
      endDate: new Date(new Date().setDate(new Date().getDate() + form.getValues().defaultExpirationDays || 30)),
      maxUses: 100,
      isActive: true,
      providerId: null,
      serviceId: null,
      categoryId: null,
      nicheId: null,
    });
    setOpenCouponDialog(true);
  };

  // Função para abrir diálogo de edição de cupom de desconto
  const handleEditCoupon = (coupon: DiscountCoupon) => {
    setEditingCoupon(coupon);
    couponForm.reset({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountPercentage: coupon.discountPercentage / 100, // Converter de centavos para reais
      discountValue: coupon.discountValue / 100, // Converter de centavos para reais
      startDate: new Date(coupon.startDate),
      endDate: new Date(coupon.endDate),
      maxUses: coupon.maxUses,
      isActive: coupon.isActive,
      providerId: coupon.providerId || null,
      serviceId: coupon.serviceId || null,
      categoryId: coupon.categoryId || null,
      nicheId: coupon.nicheId || null,
    });
    setOpenCouponDialog(true);
  };

  // Função para salvar cupom de desconto
  const handleSaveCoupon = (data: z.infer<typeof discountCouponSchema>) => {
    saveCouponMutation.mutate(data);
  };

  // Função para excluir cupom de desconto
  const handleDeleteCoupon = (couponId: number) => {
    if (confirm("Tem certeza de que deseja excluir este cupom de desconto?")) {
      deleteCouponMutation.mutate(couponId);
    }
  };

  // Função para gerar código aleatório para cupom
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    couponForm.setValue('code', code);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/admin/dashboard")}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-semibold">Configurações Financeiras</h1>
          </div>
        </div>

        <Tabs
          defaultValue="payment-providers"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="payment-providers">
              <CreditCard className="h-4 w-4 mr-2" />
              <span>Gateways de Pagamento</span>
            </TabsTrigger>
            <TabsTrigger value="fees">
              <Percent className="h-4 w-4 mr-2" />
              <span>Taxas e Pagamentos</span>
            </TabsTrigger>
            <TabsTrigger value="coupons">
              <Ticket className="h-4 w-4 mr-2" />
              <span>Cupons de Desconto</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            {isLoadingSettings ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">Carregando configurações...</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                  <TabsContent value="payment-providers" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Configurações do Stripe</CardTitle>
                        <CardDescription>
                          Configure a integração com o gateway de pagamento Stripe
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="stripeEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 bg-slate-50 p-4 rounded-md">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Habilitar processamento de pagamentos via Stripe</FormLabel>
                                <FormDescription>
                                  Ative para permitir pagamentos online na plataforma
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div className={!form.watch("stripeEnabled") ? "opacity-50 pointer-events-none" : ""}>
                          <FormField
                            control={form.control}
                            name="stripeLiveMode"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 bg-amber-50 p-4 rounded-md">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Modo de produção (Live)</FormLabel>
                                  <FormDescription>
                                    Ative para processar pagamentos reais. Desative para usar o modo de teste.
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 gap-4 mt-4">
                            <FormField
                              control={form.control}
                              name="stripePublicKey"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Chave Pública (Publishable Key)</FormLabel>
                                  <FormControl>
                                    <div className="flex">
                                      <Input
                                        {...field}
                                        type="text"
                                        placeholder={form.watch("stripeLiveMode") ? "pk_live_..." : "pk_test_..."}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    {form.watch("stripeLiveMode") 
                                      ? "Chave pública de produção (começa com pk_live_)" 
                                      : "Chave pública de teste (começa com pk_test_)"}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="stripeSecretKey"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Chave Secreta (Secret Key)</FormLabel>
                                  <FormControl>
                                    <div className="flex">
                                      <Input
                                        {...field}
                                        type="password"
                                        placeholder={form.watch("stripeLiveMode") ? "sk_live_..." : "sk_test_..."}
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    {form.watch("stripeLiveMode") 
                                      ? "Chave secreta de produção (começa com sk_live_)" 
                                      : "Chave secreta de teste (começa com sk_test_)"}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="stripeWebhookSecret"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Chave de Webhook (Webhook Secret)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="password"
                                      placeholder="whsec_..."
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Usada para verificar webhooks enviados pelo Stripe
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="stripeConnectEnabled"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 bg-slate-50 p-4 rounded-md">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>Habilitar Stripe Connect</FormLabel>
                                    <FormDescription>
                                      Permite aos prestadores receberem pagamentos diretamente em suas contas Stripe
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />

                            <div className="flex justify-end mt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => testStripeConnectionMutation.mutate()}
                                disabled={testStripeConnectionMutation.isPending}
                                className="flex items-center"
                              >
                                {testStripeConnectionMutation.isPending ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Testando...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Testar Conexão
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Configurações do Asaas</CardTitle>
                        <CardDescription>
                          Configure a integração com o gateway de pagamento Asaas
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="asaasEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 bg-slate-50 p-4 rounded-md">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Habilitar processamento de pagamentos via Asaas</FormLabel>
                                <FormDescription>
                                  Ative para permitir pagamentos online na plataforma usando Asaas
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div className={!form.watch("asaasEnabled") ? "opacity-50 pointer-events-none" : ""}>
                          <FormField
                            control={form.control}
                            name="asaasLiveMode"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center space-x-3 space-y-0 bg-amber-50 p-4 rounded-md">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Modo de produção (Live)</FormLabel>
                                  <FormDescription>
                                    Ative para processar pagamentos reais. Desative para usar o modo de teste (sandbox).
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 gap-4 mt-4">
                            <FormField
                              control={form.control}
                              name="asaasApiKey"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Chave de API (API Key)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="password"
                                      placeholder="$aas_..."
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    {form.watch("asaasLiveMode") 
                                      ? "Chave de API de produção" 
                                      : "Chave de API de sandbox (teste)"}
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="asaasWebhookToken"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Token de Webhook</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="password"
                                      placeholder="Token de webhook"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Usado para verificar webhooks enviados pelo Asaas
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="asaasWalletId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>ID da Carteira (Wallet ID)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="text"
                                      placeholder="ID da carteira"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    ID da carteira para recebimento de taxa de serviço
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="asaasSplitEnabled"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0 bg-slate-50 p-4 rounded-md">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel>Habilitar Split de Pagamentos</FormLabel>
                                    <FormDescription>
                                      Permite dividir pagamentos entre a plataforma e os prestadores
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />

                            <div className="flex justify-end mt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => testAsaasConnectionMutation.mutate()}
                                disabled={testAsaasConnectionMutation.isPending}
                                className="flex items-center"
                              >
                                {testAsaasConnectionMutation.isPending ? (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Testando...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Testar Conexão
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="fees" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Taxas e Pagamentos</CardTitle>
                        <CardDescription>
                          Configure as taxas da plataforma e as regras de pagamento aos prestadores
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <FormField
                              control={form.control}
                              name="fixedServiceFee"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Taxa de Serviço (R$)</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center">
                                      <Input
                                        {...field}
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        className="pr-10"
                                      />
                                      <DollarSign className="h-4 w-4 text-muted-foreground -ml-8" />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Valor fixo cobrado como taxa de serviço para cada prestador
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="minServiceFee"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Taxa Mínima (R$)</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center">
                                      <Input
                                        {...field}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="pr-10"
                                      />
                                      <DollarSign className="h-4 w-4 text-muted-foreground -ml-8" />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Valor mínimo cobrado
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="maxServiceFee"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Taxa Máxima (R$)</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center">
                                      <Input
                                        {...field}
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="pr-10"
                                      />
                                      <DollarSign className="h-4 w-4 text-muted-foreground -ml-8" />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Valor máximo cobrado
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>

                        <Separator />

                        <div>
                          <FormField
                            control={form.control}
                            name="payoutSchedule"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Frequência de Pagamentos aos Prestadores</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  value={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Selecione a frequência de pagamentos" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="instant">Instantâneo (após a transação)</SelectItem>
                                    <SelectItem value="daily">Diariamente</SelectItem>
                                    <SelectItem value="weekly">Semanalmente</SelectItem>
                                    <SelectItem value="monthly">Mensalmente</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Define quando os prestadores receberão os pagamentos pelos serviços concluídos
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="coupons" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Configurações de Cupons de Desconto</CardTitle>
                        <CardDescription>
                          Configure as regras para criação e uso de cupons de desconto na plataforma
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="enableCoupons"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 bg-slate-50 p-4 rounded-md">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Habilitar Sistema de Cupons</FormLabel>
                                <FormDescription>
                                  Permite a criação e uso de cupons de desconto na plataforma
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div className={!form.watch("enableCoupons") ? "opacity-50 pointer-events-none" : ""}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <FormField
                              control={form.control}
                              name="maxDiscountPercentage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Desconto Máximo Permitido (%)</FormLabel>
                                  <FormControl>
                                    <div className="flex items-center">
                                      <Input
                                        {...field}
                                        type="number"
                                        step="1"
                                        min="0"
                                        max="100"
                                        className="pr-10"
                                      />
                                      <Percent className="h-4 w-4 text-muted-foreground -ml-8" />
                                    </div>
                                  </FormControl>
                                  <FormDescription>
                                    Percentual máximo permitido para cupons de desconto
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="defaultExpirationDays"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Validade Padrão (dias)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="1"
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Período de validade padrão para novos cupons em dias
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="flex justify-between items-center">
                      <h2 className="text-xl font-semibold">Cupons Ativos</h2>
                      <Button
                        onClick={handleCreateCoupon}
                        disabled={!form.watch("enableCoupons")}
                        className="flex items-center"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Cupom
                      </Button>
                    </div>

                    {isLoadingCoupons ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">Carregando cupons...</p>
                      </div>
                    ) : coupons && coupons.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Código</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Desconto</TableHead>
                            <TableHead>Validade</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {coupons.map((coupon: DiscountCoupon) => {
                            const isExpired = new Date(coupon.endDate) < new Date();
                            const isActive = coupon.isActive && !isExpired;
                            
                            return (
                              <TableRow key={coupon.id}>
                                <TableCell className="font-mono font-semibold">
                                  {coupon.code}
                                </TableCell>
                                <TableCell>{coupon.description}</TableCell>
                                <TableCell>
                                  {coupon.discountPercentage > 0 ? (
                                    <span>{coupon.discountPercentage / 100}%</span>
                                  ) : (
                                    <span>R$ {(coupon.discountValue / 100).toFixed(2)}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span>Início: {new Date(coupon.startDate).toLocaleDateString('pt-BR')}</span>
                                    <span>Fim: {new Date(coupon.endDate).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {isActive ? (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                      Ativo
                                    </Badge>
                                  ) : isExpired ? (
                                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                      Expirado
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                      Inativo
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditCoupon(coupon)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteCoupon(coupon.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                      <Card className="bg-slate-50">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                          <p className="text-muted-foreground text-center">
                            Nenhum cupom de desconto cadastrado.
                          </p>
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={handleCreateCoupon}
                            disabled={!form.watch("enableCoupons")}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Criar Primeiro Cupom
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <div className="flex justify-end mt-6">
                    <Button
                      type="submit"
                      disabled={saveSettingsMutation.isPending}
                      className="flex items-center"
                    >
                      {saveSettingsMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Salvar Configurações
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </Tabs>
      </div>

      {/* Alerta de teste de conexão com Stripe */}
      <AlertDialog open={showTestStripeAlert} onOpenChange={setShowTestStripeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              {testStripeResult?.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              Teste de Conexão Stripe
            </AlertDialogTitle>
            <AlertDialogDescription>
              {testStripeResult?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Fechar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alerta de teste de conexão com Asaas */}
      <AlertDialog open={showTestAsaasAlert} onOpenChange={setShowTestAsaasAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              {testAsaasResult?.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
              )}
              Teste de Conexão Asaas
            </AlertDialogTitle>
            <AlertDialogDescription>
              {testAsaasResult?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Fechar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de criação/edição de cupom */}
      <Dialog open={openCouponDialog} onOpenChange={setOpenCouponDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? "Editar Cupom" : "Criar Novo Cupom de Desconto"}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon
                ? "Edite as informações do cupom de desconto"
                : "Preencha os campos para criar um novo cupom de desconto"}
            </DialogDescription>
          </DialogHeader>

          <Form {...couponForm}>
            <form onSubmit={couponForm.handleSubmit(handleSaveCoupon)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <div className="space-y-4">
                  <FormField
                    control={couponForm.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código do Cupom</FormLabel>
                        <FormControl>
                          <div className="flex">
                            <Input
                              {...field}
                              className="uppercase"
                              placeholder="CUPOM10"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="ml-2"
                              onClick={generateRandomCode}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Código que será utilizado pelos clientes para aplicar o desconto
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={couponForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Desconto primeira compra"
                          />
                        </FormControl>
                        <FormDescription>
                          Descrição interna para identificação do cupom
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={couponForm.control}
                      name="discountPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desconto Percentual (%)</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Input
                                {...field}
                                type="number"
                                step="1"
                                min="0"
                                max={form.getValues().maxDiscountPercentage || 100}
                                className="pr-10"
                              />
                              <Percent className="h-4 w-4 text-muted-foreground -ml-8" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={couponForm.control}
                      name="discountValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Desconto Fixo (R$)</FormLabel>
                          <FormControl>
                            <div className="flex items-center">
                              <Input
                                {...field}
                                type="number"
                                step="0.01"
                                min="0"
                                className="pr-10"
                              />
                              <DollarSign className="h-4 w-4 text-muted-foreground -ml-8" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={couponForm.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número Máximo de Usos</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="0"
                          />
                        </FormControl>
                        <FormDescription>
                          Quantas vezes este cupom pode ser utilizado (0 = ilimitado)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={couponForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Cupom Ativo</FormLabel>
                          <FormDescription>
                            Quando desativado, o cupom não poderá ser utilizado mesmo durante o período de validade
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={couponForm.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Início</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Selecione uma data</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={couponForm.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data de Término</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className="w-full pl-3 text-left font-normal"
                                >
                                  {field.value ? (
                                    format(field.value, "dd/MM/yyyy")
                                  ) : (
                                    <span>Selecione uma data</span>
                                  )}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Aplicação (opcional)</Label>
                    <FormDescription>
                      Restrinja o cupom para ser usado apenas em determinados contextos.
                      Se nenhuma opção for selecionada, o cupom será válido para todos os serviços.
                    </FormDescription>
                  </div>

                  <FormField
                    control={couponForm.control}
                    name="nicheId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nicho</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Todos os nichos" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Todos os nichos</SelectItem>
                            {niches?.map((niche: any) => (
                              <SelectItem key={niche.id} value={niche.id.toString()}>
                                {niche.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Limite o cupom a um nicho específico
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={couponForm.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Todas as categorias" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Todas as categorias</SelectItem>
                            {categories?.map((category: any) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Limite o cupom a uma categoria específica
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={couponForm.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serviço</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Todos os serviços" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Todos os serviços</SelectItem>
                            {services?.map((service: any) => (
                              <SelectItem key={service.id} value={service.id.toString()}>
                                {service.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Limite o cupom a um serviço específico
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={couponForm.control}
                    name="providerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prestador</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Todos os prestadores" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Todos os prestadores</SelectItem>
                            {providers?.map((provider: any) => (
                              <SelectItem key={provider.id} value={provider.id.toString()}>
                                {provider.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Limite o cupom a um prestador específico
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenCouponDialog(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saveCouponMutation.isPending}
                >
                  {saveCouponMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingCoupon ? "Atualizar" : "Criar"}
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// Função auxiliar para formatação de data
function format(date: Date, format: string): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return format.replace('dd', day).replace('MM', month).replace('yyyy', year);
}