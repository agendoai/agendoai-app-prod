import { useQuery, useMutation } from "@tanstack/react-query";
import { Review } from "@shared/schema.ts";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function useProviderReviews(providerId: number) {
  return useQuery<Review[]>({
    queryKey: ['/api/providers', providerId, 'reviews'],
    queryFn: getQueryFn(),
    enabled: !!providerId
  });
}

export function useClientReviews() {
  return useQuery<Review[]>({
    queryKey: ['/api/client/reviews'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
}

export function useCreateReview() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (reviewData: {
      providerId: number;
      appointmentId: number;
      rating: number;
      comment?: string;
      isPublic?: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/reviews", reviewData);
      return await res.json();
    },
    onSuccess: (review: Review) => {
      toast({
        title: "Avaliação enviada",
        description: "Sua avaliação foi enviada com sucesso!",
      });
      
      // Invalidar os caches relevantes
      queryClient.invalidateQueries({ queryKey: ['/api/providers', review.providerId, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/appointments'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar avaliação",
        description: error.message || "Ocorreu um erro ao enviar sua avaliação.",
        variant: "destructive",
      });
    },
  });
}

export function useUpdateReview() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      ...reviewData 
    }: { 
      id: number;
      rating?: number;
      comment?: string;
      isPublic?: boolean;
    }) => {
      const res = await apiRequest("PUT", `/api/reviews/${id}`, reviewData);
      return await res.json();
    },
    onSuccess: (review: Review) => {
      toast({
        title: "Avaliação atualizada",
        description: "Sua avaliação foi atualizada com sucesso!",
      });
      
      // Invalidar os caches relevantes
      queryClient.invalidateQueries({ queryKey: ['/api/providers', review.providerId, 'reviews'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/reviews'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar avaliação",
        description: error.message || "Ocorreu um erro ao atualizar sua avaliação.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteReview() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/reviews/${id}`);
      return await res.json();
    },
    onSuccess: (_, id) => {
      toast({
        title: "Avaliação excluída",
        description: "Sua avaliação foi excluída com sucesso!",
      });
      
      // Invalidar os caches relevantes - a providerId não estará disponível, então invalidamos todas as consultas relacionadas
      queryClient.invalidateQueries({ queryKey: ['/api/providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/reviews'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir avaliação",
        description: error.message || "Ocorreu um erro ao excluir sua avaliação.",
        variant: "destructive",
      });
    },
  });
}

export function useRespondToReview() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      response 
    }: { 
      id: number;
      response: string;
    }) => {
      const res = await apiRequest("POST", `/api/reviews/${id}/response`, { response });
      return await res.json();
    },
    onSuccess: (review: Review) => {
      toast({
        title: "Resposta enviada",
        description: "Sua resposta à avaliação foi enviada com sucesso!",
      });
      
      // Invalidar os caches relevantes
      queryClient.invalidateQueries({ queryKey: ['/api/providers', review.providerId, 'reviews'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar resposta",
        description: error.message || "Ocorreu um erro ao enviar sua resposta.",
        variant: "destructive",
      });
    },
  });
}