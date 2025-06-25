import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingStep, UserOnboardingProgress } from "@shared/schema.ts";

interface OnboardingProgressData {
  progress: UserOnboardingProgress[];
  completionPercentage: number;
}

export function useOnboarding() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Buscar etapas de onboarding para o tipo de usuário atual
  const { 
    data: steps, 
    isLoading: isLoadingSteps,
    error: stepsError
  } = useQuery<OnboardingStep[]>({
    queryKey: ["/api/onboarding/steps", user?.userType],
    queryFn: async () => {
      const res = await apiRequest(
        "GET", 
        `/api/onboarding/steps?userType=${user?.userType}`
      );
      return res.json();
    },
    enabled: !!user?.userType,
  });

  // Buscar progresso atual do usuário
  const { 
    data: progressData, 
    isLoading: isLoadingProgress,
    error: progressError
  } = useQuery<OnboardingProgressData>({
    queryKey: ["/api/onboarding/progress"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/onboarding/progress");
      return res.json();
    },
    enabled: !!user,
  });

  // Mutation para atualizar progresso
  const updateProgressMutation = useMutation({
    mutationFn: async (data: { stepId: number; status: string }) => {
      const res = await apiRequest(
        "POST", 
        `/api/onboarding/progress/${data.stepId}`,
        { status: data.status }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar progresso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para marcar etapa como concluída
  const completeStepMutation = useMutation({
    mutationFn: async (stepId: number) => {
      const res = await apiRequest("POST", `/api/onboarding/complete/${stepId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao concluir etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para pular etapa
  const skipStepMutation = useMutation({
    mutationFn: async (stepId: number) => {
      const res = await apiRequest("POST", `/api/onboarding/skip/${stepId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao pular etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verificar se o onboarding está completo
  const isOnboardingComplete = progressData?.completionPercentage === 100;
  
  // Verificar se há erros de carregamento
  const isError = !!stepsError || !!progressError;
  
  // Estado de carregamento geral
  const isLoading = isLoadingSteps || isLoadingProgress;

  return {
    steps,
    progressData,
    isLoading,
    isError,
    isOnboardingComplete,
    updateProgress: updateProgressMutation.mutate,
    completeStep: completeStepMutation.mutate,
    skipStep: skipStepMutation.mutate,
    isPendingUpdate: updateProgressMutation.isPending,
    isPendingComplete: completeStepMutation.isPending,
    isPendingSkip: skipStepMutation.isPending,
  };
}