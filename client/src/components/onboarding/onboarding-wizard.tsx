import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CheckCircle,
  ChevronRight,
  HelpCircle,
  XCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/queryClient";
import { OnboardingStep, UserOnboardingProgress } from "@shared/schema.ts";
import { useToast } from "@/hooks/use-toast";

interface OnboardingWizardProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

interface OnboardingProgressData {
  progress: UserOnboardingProgress[];
  completionPercentage: number;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeStepId, setActiveStepId] = useState<number | null>(null);
  const [isLastStep, setIsLastStep] = useState(false);

  // Buscar etapas de onboarding para o tipo de usuário
  const { data: steps, isLoading: isLoadingSteps } = useQuery<OnboardingStep[]>({
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
    isLoading: isLoadingProgress 
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      
      // Se for a última etapa, chamar callback de conclusão
      if (isLastStep && data.completionPercentage === 100) {
        onComplete?.();
      } else {
        // Avançar para a próxima etapa se não for a última
        if (steps && activeStepId !== null) {
          const currentIndex = steps.findIndex(step => step.id === activeStepId);
          if (currentIndex < steps.length - 1) {
            setActiveStepId(steps[currentIndex + 1].id);
          } else {
            setIsLastStep(true);
          }
        }
      }
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/progress"] });
      
      // Avançar para a próxima etapa
      if (steps && activeStepId !== null) {
        const currentIndex = steps.findIndex(step => step.id === activeStepId);
        if (currentIndex < steps.length - 1) {
          setActiveStepId(steps[currentIndex + 1].id);
        } else {
          setIsLastStep(true);
          if (data.completionPercentage === 100) {
            onComplete?.();
          }
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao pular etapa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Definir a etapa ativa com base no progresso
  useEffect(() => {
    if (steps && progressData) {
      // Encontrar a primeira etapa não concluída ou em andamento
      let nextStep = steps.find(step => {
        const stepProgress = progressData.progress.find(p => p.stepId === step.id);
        return !stepProgress || stepProgress.status === 'pending' || stepProgress.status === 'in_progress';
      });

      // Se não houver próxima etapa, usar a última
      if (!nextStep && steps.length > 0) {
        nextStep = steps[steps.length - 1];
        setIsLastStep(true);
      } else {
        setIsLastStep(false);
      }

      if (nextStep) {
        setActiveStepId(nextStep.id);
        
        // Marcar etapa como em andamento se estiver pendente
        const stepProgress = progressData.progress.find(p => p.stepId === nextStep?.id);
        if (!stepProgress || stepProgress.status === 'pending') {
          updateProgressMutation.mutate({ 
            stepId: nextStep.id, 
            status: 'in_progress' 
          });
        }
      }
    }
  }, [steps, progressData]);

  // Determinar a etapa ativa
  const activeStep = steps?.find(step => step.id === activeStepId);

  // Verificar se o onboarding está completo
  const isOnboardingComplete = progressData?.completionPercentage === 100;

  if (isLoadingSteps || isLoadingProgress) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isOnboardingComplete) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Configuração Completa!</CardTitle>
          <CardDescription className="text-center">
            Você concluiu todas as etapas de configuração da sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <CheckCircle className="h-24 w-24 text-primary mx-auto mb-4" />
          <p className="text-lg">
            Sua conta está pronta para uso. Você pode começar a usar todas as funcionalidades do sistema.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => onComplete?.()}>
            Continuar para o Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Barra de progresso */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">Progresso</span>
          <span className="text-sm font-medium">
            {progressData?.completionPercentage || 0}%
          </span>
        </div>
        <Progress value={progressData?.completionPercentage || 0} className="h-2" />
      </div>

      {/* Lista de etapas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="col-span-1 space-y-2">
          {steps?.map((step) => {
            const stepProgress = progressData?.progress.find(p => p.stepId === step.id);
            const isCompleted = stepProgress?.status === 'completed';
            const isSkipped = stepProgress?.status === 'skipped';
            const isActive = step.id === activeStepId;

            return (
              <div
                key={step.id}
                className={`flex items-center p-3 rounded-md cursor-pointer transition-colors ${
                  isActive
                    ? "bg-primary/10 border border-primary"
                    : "border border-border hover:bg-accent"
                } ${isCompleted ? "opacity-70" : ""}`}
                onClick={() => setActiveStepId(step.id)}
              >
                {isCompleted ? (
                  <CheckCircle className="h-5 w-5 text-primary mr-2" />
                ) : isSkipped ? (
                  <XCircle className="h-5 w-5 text-muted-foreground mr-2" />
                ) : (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full border border-primary mr-2 text-xs">
                    {step.order}
                  </span>
                )}
                <span className={`flex-1 ${isActive ? "font-medium" : ""}`}>
                  {step.name}
                </span>
                {isActive && <ChevronRight className="h-4 w-4 text-primary" />}
              </div>
            );
          })}
        </div>

        {/* Conteúdo da etapa ativa */}
        <div className="col-span-1 md:col-span-2">
          {activeStep && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{activeStep.name}</CardTitle>
                  {activeStep.isRequired ? (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                      Obrigatório
                    </Badge>
                  ) : (
                    <Badge variant="outline">Opcional</Badge>
                  )}
                </div>
                <CardDescription>{activeStep.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose max-w-none dark:prose-invert">
                  {/* Conteúdo específico da etapa seria renderizado dinamicamente aqui */}
                  <p>
                    Siga as instruções abaixo para completar esta etapa de configuração.
                  </p>
                  
                  {/* Conteúdo dinâmico baseado no ID da etapa */}
                  <div className="mt-4 p-4 bg-accent rounded-md">
                    {/* Este exemplo apenas mostra o ID da etapa, mas você pode renderizar conteúdo específico para cada etapa */}
                    <p className="text-sm text-muted-foreground">
                      Etapa {activeStep.order}: {activeStep.name}
                    </p>
                    <p className="mt-2">
                      {activeStep.helpText || "Complete os campos necessários para esta etapa."}
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <div>
                  {!activeStep.isRequired && (
                    <Button
                      variant="outline"
                      onClick={() => skipStepMutation.mutate(activeStep.id)}
                      disabled={skipStepMutation.isPending}
                    >
                      {skipStepMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Pular esta etapa
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <HelpCircle className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">{activeStep.helpText}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button
                    onClick={() => completeStepMutation.mutate(activeStep.id)}
                    disabled={completeStepMutation.isPending}
                  >
                    {completeStepMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isLastStep ? "Concluir" : "Avançar"}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}