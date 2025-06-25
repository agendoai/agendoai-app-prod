import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Promotion } from "@/components/promotions-carousel";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Componentes UI
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";

// Schema para validação do formulário
const promotionFormSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres").max(100, "O título deve ter no máximo 100 caracteres"),
  description: z.string().max(255, "A descrição deve ter no máximo 255 caracteres").optional().nullable(),
  discountPercentage: z.coerce.number().min(0).max(100).optional().nullable(),
  discountValue: z.coerce.number().min(0).optional().nullable(),
  serviceId: z.coerce.number().optional().nullable(),
  providerId: z.coerce.number().optional().nullable(),
  categoryId: z.coerce.number().optional().nullable(),
  nicheId: z.coerce.number().optional().nullable(),
  startDate: z.date(),
  endDate: z.date(),
  couponCode: z.string().max(50, "O código do cupom deve ter no máximo 50 caracteres").optional().nullable(),
  isActive: z.boolean().default(true),
  backgroundColor: z.string().max(20).optional().nullable(),
  textColor: z.string().max(20).optional().nullable(),
}).refine(data => {
  // Verificar se pelo menos um tipo de desconto foi fornecido
  return data.discountPercentage != null || data.discountValue != null;
}, {
  message: "Você deve fornecer um desconto percentual ou um valor fixo",
  path: ["discountPercentage"]
}).refine(data => {
  // Verificar se a data de término é posterior à data de início
  return data.endDate >= data.startDate;
}, {
  message: "A data de término deve ser posterior à data de início",
  path: ["endDate"]
});

type PromotionFormProps = {
  promotion?: Promotion;
  onSubmit: (data: any) => void;
  niches: { id: number; name: string }[];
  categories: { id: number; name: string }[];
  services: { id: number; name: string }[];
  providers: { id: number; name: string }[];
  isLoading?: boolean;
};

export default function PromotionForm({
  promotion,
  onSubmit,
  niches,
  categories,
  services,
  providers,
  isLoading = false,
}: PromotionFormProps) {
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    promotion?.discountPercentage ? "percentage" : "fixed"
  );

  // Configurar formulário com valores padrão
  const form = useForm<z.infer<typeof promotionFormSchema>>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      title: promotion?.title || "",
      description: promotion?.description || "",
      discountPercentage: promotion?.discountPercentage || null,
      discountValue: promotion?.discountValue ? promotion.discountValue / 100 : null, // Converter centavos para reais no formulário
      serviceId: promotion?.serviceId || null,
      providerId: promotion?.providerId || null,
      categoryId: promotion?.categoryId || null,
      nicheId: promotion?.nicheId || null,
      startDate: promotion?.startDate ? new Date(promotion.startDate) : new Date(),
      endDate: promotion?.endDate ? new Date(promotion.endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default: 30 dias
      couponCode: promotion?.couponCode || "",
      isActive: promotion?.isActive ?? true,
      backgroundColor: promotion?.backgroundColor || "#4F46E5", // Cor padrão
      textColor: promotion?.textColor || "#FFFFFF", // Cor padrão
    },
  });

  const handleSubmit = (data: z.infer<typeof promotionFormSchema>) => {
    // Se for desconto fixo, converter para centavos
    if (discountType === "fixed" && data.discountValue) {
      data.discountValue = Math.round(data.discountValue * 100);
    }

    // Se for desconto percentual, limpar o valor fixo
    if (discountType === "percentage") {
      data.discountValue = null;
    } else {
      data.discountPercentage = null;
    }

    onSubmit(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Título */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Título da promoção</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Oferta especial" {...field} />
                </FormControl>
                <FormDescription>
                  Nome curto e atrativo para a promoção
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Código do cupom */}
          <FormField
            control={form.control}
            name="couponCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do cupom (opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: DESCONTO20" {...field} />
                </FormControl>
                <FormDescription>
                  Código para o cliente usar ao fazer o agendamento
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Descrição */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva a promoção em detalhes"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Detalhes sobre a promoção que serão exibidos para o cliente
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Tipo de desconto */}
        <div className="space-y-4">
          <Label>Tipo de desconto</Label>
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="percentage"
                value="percentage"
                checked={discountType === "percentage"}
                onChange={() => setDiscountType("percentage")}
                className="h-4 w-4"
              />
              <Label htmlFor="percentage">Desconto percentual (%)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                id="fixed"
                value="fixed"
                checked={discountType === "fixed"}
                onChange={() => setDiscountType("fixed")}
                className="h-4 w-4"
              />
              <Label htmlFor="fixed">Valor fixo (R$)</Label>
            </div>
          </div>
        </div>

        {/* Desconto percentual ou valor fixo */}
        {discountType === "percentage" ? (
          <FormField
            control={form.control}
            name="discountPercentage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Percentual de desconto</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 10"
                    min={0}
                    max={100}
                    {...field}
                    value={field.value === null ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value === "" ? null : parseInt(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Percentual de desconto (0-100%)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="discountValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do desconto (R$)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Ex: 50.00"
                    step="0.01"
                    min={0}
                    {...field}
                    value={field.value === null ? "" : field.value}
                    onChange={(e) => {
                      const value = e.target.value === "" ? null : parseFloat(e.target.value);
                      field.onChange(value);
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Valor fixo do desconto em reais
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Data de início */}
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de início</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Data em que a promoção começa a valer
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Data de término */}
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data de término</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP", { locale: ptBR })
                        ) : (
                          <span>Selecione uma data</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => {
                        const startDate = form.getValues("startDate");
                        return (
                          date <
                          new Date(
                            new Date(startDate).setHours(0, 0, 0, 0)
                          )
                        );
                      }}
                      initialFocus
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Data em que a promoção expira
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Nicho */}
          <FormField
            control={form.control}
            name="nicheId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nicho (opcional)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                  value={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um nicho" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Nenhum (todos os nichos)</SelectItem>
                    {niches.map((niche) => (
                      <SelectItem key={niche.id} value={niche.id.toString()}>
                        {niche.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Para limitar a promoção a um nicho específico
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categoria */}
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoria (opcional)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                  value={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Nenhuma (todas as categorias)</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Para limitar a promoção a uma categoria específica
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Serviço */}
          <FormField
            control={form.control}
            name="serviceId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serviço (opcional)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                  value={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um serviço" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Nenhum (todos os serviços)</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Para limitar a promoção a um serviço específico
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Prestador */}
          <FormField
            control={form.control}
            name="providerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prestador (opcional)</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                  value={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um prestador" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">Nenhum (todos os prestadores)</SelectItem>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id.toString()}>
                        {provider.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Para limitar a promoção a um prestador específico
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cor de fundo */}
          <FormField
            control={form.control}
            name="backgroundColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cor de fundo</FormLabel>
                <div className="flex gap-2 items-center">
                  <FormControl>
                    <Input
                      type="color"
                      {...field}
                      value={field.value || "#4F46E5"}
                      className="w-12 h-10 p-1"
                    />
                  </FormControl>
                  <Input
                    type="text"
                    {...field}
                    value={field.value || "#4F46E5"}
                    className="flex-1"
                  />
                </div>
                <FormDescription>
                  Cor de fundo do card da promoção
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Cor do texto */}
          <FormField
            control={form.control}
            name="textColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cor do texto</FormLabel>
                <div className="flex gap-2 items-center">
                  <FormControl>
                    <Input
                      type="color"
                      {...field}
                      value={field.value || "#FFFFFF"}
                      className="w-12 h-10 p-1"
                    />
                  </FormControl>
                  <Input
                    type="text"
                    {...field}
                    value={field.value || "#FFFFFF"}
                    className="flex-1"
                  />
                </div>
                <FormDescription>
                  Cor do texto no card da promoção
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Status ativo */}
        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Ativar promoção</FormLabel>
                <FormDescription>
                  Quando ativa, a promoção ficará visível para os clientes
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Botões */}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" type="button" onClick={() => window.history.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvando..." : promotion ? "Atualizar" : "Criar"}
          </Button>
        </div>
      </form>
    </Form>
  );
}