import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { StarRating } from "./star-rating";

// Schema de validação para o formulário de avaliação
const reviewSchema = z.object({
  rating: z.number().min(1, "Por favor, dê uma avaliação entre 1 e 5 estrelas").max(5),
  comment: z.string().optional(),
  isPublic: z.boolean().default(true)
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

type CreateReviewDialogProps = {
  trigger: React.ReactNode;
  providerId: number;
  appointmentId: number;
  onReviewCreated?: () => void;
};

export function CreateReviewDialog({ 
  trigger, 
  providerId, 
  appointmentId,
  onReviewCreated 
}: CreateReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Inicializar o formulário
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: "",
      isPublic: true
    }
  });
  
  // Mutação para criar avaliação
  const createReviewMutation = useMutation({
    mutationFn: async (data: ReviewFormValues) => {
      const response = await apiRequest("POST", `/api/appointments/${appointmentId}/reviews`, {
        ...data,
        providerId
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao criar avaliação");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Avaliação enviada com sucesso",
        description: "Obrigado por compartilhar sua experiência!",
      });
      
      // Limpar formulário e fechar dialog
      form.reset();
      setOpen(false);
      
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId, 'review'] });
      queryClient.invalidateQueries({ queryKey: ['/api/providers', providerId] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      
      // Callback opcional
      if (onReviewCreated) onReviewCreated();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar avaliação",
        description: error.message,
        variant: "destructive"
      });
    }
  });
  
  // Função de submissão do formulário
  const onSubmit = (data: ReviewFormValues) => {
    createReviewMutation.mutate(data);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Avaliar serviço</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Sua avaliação</FormLabel>
                  <FormControl>
                    <StarRating 
                      value={field.value} 
                      onChange={field.onChange}
                      size="lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Comentário (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conte-nos mais sobre sua experiência..."
                      className="min-h-[100px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Tornar esta avaliação pública
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={createReviewMutation.isPending || form.getValues().rating === 0}
              >
                {createReviewMutation.isPending ? "Enviando..." : "Enviar avaliação"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}