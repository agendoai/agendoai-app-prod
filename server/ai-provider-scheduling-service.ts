/**
 * Serviço de IA para gestão de agenda do prestador
 * 
 * Este serviço usa a API da Anthropic (Claude) para analisar padrões de agendamento,
 * fazer recomendações inteligentes para otimização da agenda,
 * identificar tendências e sugerir melhorias na gestão dos horários.
 */

import { db } from "./db";
import { appointments, users, providerSettings, providerServices, services, availability, reviews, categories } from "@shared/schema";
import { storage } from "./storage";
import { eq, and, gte, lte, desc, sql, like, count, sum, avg, isNull, isNotNull } from "drizzle-orm";
import { createLogger } from "./logger";
import { anthropicService } from "./anthropic-service";

const logger = createLogger("AIProviderScheduling");

// Verificar se o serviço Anthropic está inicializado
try {
  if (anthropicService.isInitialized()) {
    logger.info("Serviço de Gestão de Agenda com IA inicializado com sucesso (usando Anthropic Claude)");
  } else {
    logger.warn("Anthropic Claude não inicializado. Usando análise básica.");
  }
} catch (error) {
  logger.error("Erro ao inicializar serviço Anthropic:", error);
}

export interface ScheduleInsight {
  type: 'productivity' | 'timeSlot' | 'service' | 'trend' | 'suggestion';
  title: string;
  description: string;
  score: number; // 0-100 indicando importância/confiança
  metrics?: Record<string, any>; // Métricas numéricas relevantes
  tags?: string[]; // Tags relevantes para classificação
}

interface ScheduleAnalysisParams {
  providerId: number;
  dateRange?: {
    start: string;
    end: string;
  };
  includeHistorical?: boolean;
  includeAvailability?: boolean;
  includeUpcoming?: boolean;
}

/**
 * Analisa a agenda do prestador para gerar insights inteligentes
 * Retorna análises, sugestões e otimizações
 */
export async function analyzeProviderSchedule({
  providerId,
  dateRange,
  includeHistorical = true,
  includeAvailability = true,
  includeUpcoming = true
}: ScheduleAnalysisParams): Promise<ScheduleInsight[]> {
  if (!anthropicService.isInitialized()) {
    logger.warn("Anthropic não configurado. Retornando insights básicos.");
    return getBasicScheduleInsights(providerId);
  }

  try {
    logger.info(`Analisando agenda do prestador ID: ${providerId}`);

    // Período padrão: Últimos 30 dias até próximos 30 dias
    const currentDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(currentDate.getDate() - 30);
    const defaultEndDate = new Date();
    defaultEndDate.setDate(currentDate.getDate() + 30);

    const startDate = dateRange?.start ? dateRange.start : defaultStartDate.toISOString().split('T')[0];
    const endDate = dateRange?.end ? dateRange.end : defaultEndDate.toISOString().split('T')[0];

    // Coleta de dados
    const providerData = await collectProviderData(providerId, startDate, endDate, includeHistorical, includeAvailability, includeUpcoming);

    // Criar instruções para análise
    const instructions = `
    Analise os dados da agenda deste prestador de serviços para identificar padrões, tendências e oportunidades de otimização.
    
    Considere os seguintes aspectos em sua análise:
    1. Identificação de horários subutilizados ou com alta demanda
    2. Sugestões para otimizar a configuração da disponibilidade
    3. Duração ideal dos serviços e possíveis ajustes de tempo de execução
    4. Padrões de agendamento dos clientes e como aproveitá-los
    5. Sugestões para reduzir cancelamentos ou no-shows
    6. Oportunidades para aumentar o número de agendamentos ou a eficiência
    7. Horários de alta produtividade x horários de baixa demanda
    8. Previsões de demanda futura com base nos dados históricos
    
    Responda exatamente no seguinte formato JSON:
    {
      "insights": [
        {
          "type": "productivity",
          "title": "Maior produtividade nas manhãs de quarta-feira",
          "description": "Seus dados mostram que você tem 30% mais agendamentos nas quartas-feiras pela manhã em comparação com outros dias da semana no mesmo horário. Considere abrir mais slots neste período.",
          "score": 85,
          "metrics": {
            "percentageHigher": 30,
            "averageAppointments": 5
          },
          "tags": ["alta demanda", "otimização", "quarta-feira", "manhã"]
        },
        {
          "type": "suggestion",
          "title": "Reduzir tempo de execução para Serviço X",
          "description": "O tempo médio real de execução do Serviço X é de 45 minutos, mas você tem configurado 60 minutos. Ajustar para 50 minutos aumentaria sua capacidade diária em 2 slots.",
          "score": 92,
          "metrics": {
            "currentDuration": 60,
            "suggestedDuration": 50,
            "additionalCapacity": 2
          },
          "tags": ["otimização de tempo", "maior capacidade", "ajuste de serviço"]
        }
      ]
    }
    `;
    
    // Preparar os dados formatados para a análise
    const formattedData = {
      prestador: {
        nome: providerData.provider?.name || 'Não disponível',
        tipo: providerData.settings?.businessName || 'Não disponível',
        cidade: providerData.settings?.city || 'Não disponível',
        estado: providerData.settings?.state || 'Não disponível'
      },
      servicosOferecidos: providerData.providerServices.map(s => ({
        id: s.id,
        nome: s.name,
        duração: s.duration,
        tempoExecucaoPersonalizado: providerData.executionTimes.find(e => e.serviceId === s.id)?.executionTime
      })),
      disponibilidade: providerData.availability.map(a => ({
        diaSemana: a.dayOfWeek,
        início: a.startTime,
        fim: a.endTime,
        disponível: a.isAvailable
      })),
      métricas: providerData.metrics,
      agendamentosRecentes: providerData.historicalAppointments.slice(0, 10).map(a => ({
        data: a.date,
        início: a.startTime,
        fim: a.endTime,
        serviço: providerData.providerServices.find(s => s.id === a.serviceId)?.name || 'Desconhecido',
        status: a.status
      })),
      agendamentosFuturos: providerData.upcomingAppointments.slice(0, 10).map(a => ({
        data: a.appointment.date,
        início: a.appointment.startTime,
        fim: a.appointment.endTime,
        cliente: a.clientName,
        serviço: providerData.providerServices.find(s => s.id === a.appointment.serviceId)?.name || 'Desconhecido',
        status: a.appointment.status
      })),
      avaliações: providerData.reviews.slice(0, 5).map(r => ({
        avaliação: r.rating,
        comentário: r.comment,
        data: r.publishedAt
      }))
    };

    // Fazer a chamada para a API do Anthropic Claude
    const result = await anthropicService.analyzeScheduleData(formattedData, instructions);
    
    logger.info(`Insights gerados com sucesso via Anthropic Claude para o prestador ${providerId}`);
    
    if (Array.isArray(result.insights)) {
      // Ordenar insights por pontuação (do maior para o menor)
      return result.insights.sort((a: ScheduleInsight, b: ScheduleInsight) => b.score - a.score);
    }
    
    logger.warn("Formato de resposta inválido da Anthropic:", result);
    return getBasicScheduleInsights(providerId);
  } catch (error) {
    logger.error("Erro ao gerar insights da agenda:", error);
    return getBasicScheduleInsights(providerId);
  }
}

/**
 * Coleta todos os dados relevantes do prestador para análise
 */
async function collectProviderData(
  providerId: number, 
  startDate: string,
  endDate: string,
  includeHistorical: boolean,
  includeAvailability: boolean,
  includeUpcoming: boolean
) {
  // Dados do prestador
  const provider = await storage.getUser(providerId);
  const settings = await storage.getProviderSettings(providerId);

  // Dados dos serviços oferecidos
  const providerServices = await storage.getServicesByProvider(providerId);
  
  // Tempos de execução personalizados
  const executionTimes = await storage.getProviderServicesByProvider(providerId);
  
  // Agendamentos passados
  let historicalAppointments = [];
  if (includeHistorical) {
    historicalAppointments = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.providerId, providerId),
        lte(appointments.date, startDate)
      ))
      .orderBy(desc(appointments.date));
  }
  
  // Agendamentos futuros
  let upcomingAppointments = [];
  if (includeUpcoming) {
    upcomingAppointments = await db.select({
      appointment: appointments,
      clientName: users.name
    })
    .from(appointments)
    .leftJoin(users, eq(appointments.clientId, users.id))
    .where(and(
      eq(appointments.providerId, providerId),
      gte(appointments.date, startDate),
      lte(appointments.date, endDate)
    ))
    .orderBy(appointments.date);
  }
  
  // Disponibilidade configurada
  let availabilityData = [];
  if (includeAvailability) {
    availabilityData = await storage.getAvailability(providerId);
  }
  
  // Métricas de agendamento
  const metrics = await calculateScheduleMetrics(providerId);
  
  // Avaliações dos clientes
  const reviews = await storage.getReviewsByProvider(providerId);
  
  return {
    provider,
    settings,
    providerServices,
    executionTimes,
    historicalAppointments,
    upcomingAppointments,
    availability: availabilityData,
    metrics,
    reviews,
  };
}

/**
 * Calcula métricas de agendamento para o prestador
 */
async function calculateScheduleMetrics(providerId: number) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
  
  const weeklyAppointmentsQuery = await db.select({
    count: count()
  })
  .from(appointments)
  .where(and(
    eq(appointments.providerId, providerId),
    gte(appointments.date, oneWeekAgo.toISOString().split('T')[0])
  ));
  
  const monthlyAppointmentsQuery = await db.select({
    count: count()
  })
  .from(appointments)
  .where(and(
    eq(appointments.providerId, providerId),
    gte(appointments.date, oneMonthAgo.toISOString().split('T')[0])
  ));
  
  const quarterlyAppointmentsQuery = await db.select({
    count: count()
  })
  .from(appointments)
  .where(and(
    eq(appointments.providerId, providerId),
    gte(appointments.date, threeMonthsAgo.toISOString().split('T')[0])
  ));
  
  // Calcular taxa de ocupação
  const availabilitySlots = await storage.getAvailability(providerId);
  
  // Contabilizar horas totais disponíveis por semana
  let totalWeeklyHours = 0;
  availabilitySlots.forEach(slot => {
    if (slot.isAvailable) {
      const startParts = slot.startTime.split(':').map(Number);
      const endParts = slot.endTime.split(':').map(Number);
      
      const startMinutes = startParts[0] * 60 + startParts[1];
      const endMinutes = endParts[0] * 60 + endParts[1];
      
      const durationHours = (endMinutes - startMinutes) / 60;
      totalWeeklyHours += durationHours;
    }
  });
  
  // Taxa de cancelamento
  const canceledAppointmentsQuery = await db.select({
    count: count()
  })
  .from(appointments)
  .where(and(
    eq(appointments.providerId, providerId),
    gte(appointments.date, oneMonthAgo.toISOString().split('T')[0]),
    eq(appointments.status, 'canceled')
  ));
  
  // Horários mais populares
  const timeDistribution = await db.select({
    hour: sql`EXTRACT(HOUR FROM ${appointments.startTime}::time)`,
    count: count()
  })
  .from(appointments)
  .where(eq(appointments.providerId, providerId))
  .groupBy(sql`EXTRACT(HOUR FROM ${appointments.startTime}::time)`)
  .orderBy(desc(sql`count`));
  
  // Dias mais populares
  const dayDistribution = await db.select({
    dayOfWeek: sql`EXTRACT(DOW FROM ${appointments.date}::date)`,
    count: count()
  })
  .from(appointments)
  .where(eq(appointments.providerId, providerId))
  .groupBy(sql`EXTRACT(DOW FROM ${appointments.date}::date)`)
  .orderBy(desc(sql`count`));
  
  return {
    appointmentCounts: {
      weekly: weeklyAppointmentsQuery[0]?.count || 0,
      monthly: monthlyAppointmentsQuery[0]?.count || 0,
      quarterly: quarterlyAppointmentsQuery[0]?.count || 0
    },
    totalWeeklyAvailableHours: totalWeeklyHours,
    cancellationRate: {
      count: canceledAppointmentsQuery[0]?.count || 0,
      rate: monthlyAppointmentsQuery[0]?.count > 0 
        ? (canceledAppointmentsQuery[0]?.count || 0) / monthlyAppointmentsQuery[0]?.count
        : 0
    },
    popularTimes: timeDistribution,
    popularDays: dayDistribution
  };
}

/**
 * Cria o prompt para análise da agenda do prestador
 */
function createProviderAnalysisPrompt(providerData: any) {
  return `
  Analise os dados abaixo para identificar padrões, tendências e oportunidades de otimização na agenda deste prestador de serviços.

  ## Dados do Prestador
  ${JSON.stringify({
    nome: providerData.provider?.name || 'Não disponível',
    tipo: providerData.settings?.businessName || 'Não disponível',
    cidade: providerData.settings?.city || 'Não disponível',
    estado: providerData.settings?.state || 'Não disponível'
  }, null, 2)}
  
  ## Serviços Oferecidos
  ${JSON.stringify(providerData.providerServices.map(s => ({
    id: s.id,
    nome: s.name,
    duração: s.duration,
    tempoExecucaoPersonalizado: providerData.executionTimes.find(e => e.serviceId === s.id)?.executionTime
  })), null, 2)}
  
  ## Disponibilidade Configurada
  ${JSON.stringify(providerData.availability.map(a => ({
    diaSemana: a.dayOfWeek,
    início: a.startTime,
    fim: a.endTime,
    disponível: a.isAvailable
  })), null, 2)}
  
  ## Métricas de Agendamento
  ${JSON.stringify(providerData.metrics, null, 2)}
  
  ## Agendamentos Recentes (${providerData.historicalAppointments.length})
  ${JSON.stringify(providerData.historicalAppointments.slice(0, 10).map(a => ({
    data: a.date,
    início: a.startTime,
    fim: a.endTime,
    serviço: providerData.providerServices.find(s => s.id === a.serviceId)?.name || 'Desconhecido',
    status: a.status
  })), null, 2)}
  
  ## Agendamentos Futuros (${providerData.upcomingAppointments.length})
  ${JSON.stringify(providerData.upcomingAppointments.slice(0, 10).map(a => ({
    data: a.appointment.date,
    início: a.appointment.startTime,
    fim: a.appointment.endTime,
    cliente: a.clientName,
    serviço: providerData.providerServices.find(s => s.id === a.appointment.serviceId)?.name || 'Desconhecido',
    status: a.appointment.status
  })), null, 2)}
  
  ## Avaliações dos Clientes
  ${JSON.stringify(providerData.reviews.slice(0, 5).map(r => ({
    avaliação: r.rating,
    comentário: r.comment,
    data: r.publishedAt
  })), null, 2)}
  
  Com base nestes dados, forneça insights valiosos sobre a gestão da agenda deste prestador. Para cada insight, classifique o tipo (produtividade, slot de tempo, serviço, tendência ou sugestão), forneça título, descrição detalhada, pontuação de importância (0-100) e métricas relevantes.

  Considere os seguintes aspectos em sua análise:
  1. Identificação de horários subutilizados ou com alta demanda
  2. Sugestões para otimizar a configuração da disponibilidade
  3. Duração ideal dos serviços e possíveis ajustes de tempo de execução
  4. Padrões de agendamento dos clientes e como aproveitá-los
  5. Sugestões para reduzir cancelamentos ou no-shows
  6. Oportunidades para aumentar o número de agendamentos ou a eficiência
  7. Horários de alta produtividade x horários de baixa demanda
  8. Previsões de demanda futura com base nos dados históricos

  Responda no seguinte formato JSON:
  {
    "insights": [
      {
        "type": "productivity",
        "title": "Maior produtividade nas manhãs de quarta-feira",
        "description": "Seus dados mostram que você tem 30% mais agendamentos nas quartas-feiras pela manhã em comparação com outros dias da semana no mesmo horário. Considere abrir mais slots neste período.",
        "score": 85,
        "metrics": {
          "percentageHigher": 30,
          "averageAppointments": 5
        },
        "tags": ["alta demanda", "otimização", "quarta-feira", "manhã"]
      },
      {
        "type": "suggestion",
        "title": "Reduzir tempo de execução para Serviço X",
        "description": "O tempo médio real de execução do Serviço X é de 45 minutos, mas você tem configurado 60 minutos. Ajustar para 50 minutos aumentaria sua capacidade diária em 2 slots.",
        "score": 92,
        "metrics": {
          "currentDuration": 60,
          "suggestedDuration": 50,
          "additionalCapacity": 2
        },
        "tags": ["otimização de tempo", "maior capacidade", "ajuste de serviço"]
      }
    ]
  }`;
}

/**
 * Fornece insights básicos sobre a agenda quando a IA não está disponível
 */
async function getBasicScheduleInsights(providerId: number): Promise<ScheduleInsight[]> {
  try {
    const provider = await storage.getUser(providerId);
    const settings = await storage.getProviderSettings(providerId);
    const providerServices = await storage.getServicesByProvider(providerId);
    const availability = await storage.getAvailability(providerId);

    // Insights básicos sem usar IA
    const insights: ScheduleInsight[] = [];
    
    // Insight sobre horários de trabalho
    const workingDays = availability.filter(a => a.isAvailable).map(a => a.dayOfWeek);
    const uniqueDays = [...new Set(workingDays)];
    
    insights.push({
      type: 'productivity',
      title: 'Análise de dias de trabalho',
      description: `Você tem ${uniqueDays.length} dias configurados como disponíveis em sua agenda. ${uniqueDays.length < 5 ? 'Considere adicionar mais dias para aumentar a disponibilidade.' : 'Sua disponibilidade semanal parece adequada.'}`,
      score: 75,
      metrics: {
        workingDays: uniqueDays.length,
        totalDays: 7
      },
      tags: ['disponibilidade', 'configuração básica']
    });
    
    // Insight sobre serviços
    insights.push({
      type: 'service',
      title: 'Portfólio de serviços',
      description: `Você oferece ${providerServices.length} serviços diferentes. ${providerServices.length < 3 ? 'Considere adicionar mais opções para atrair mais clientes.' : 'Seu portfólio de serviços parece diversificado.'}`,
      score: 70,
      metrics: {
        servicesCount: providerServices.length
      },
      tags: ['serviços', 'portfólio']
    });
    
    // Insight sobre tempo médio de serviços
    const averageDuration = providerServices.reduce((acc, service) => acc + service.duration, 0) / providerServices.length;
    
    insights.push({
      type: 'timeSlot',
      title: 'Análise de duração de serviços',
      description: `A duração média dos seus serviços é de ${averageDuration.toFixed(0)} minutos. ${averageDuration > 60 ? 'Considere verificar se é possível otimizar alguns processos para reduzir o tempo de execução.' : 'A duração média parece adequada para o tipo de serviços oferecidos.'}`,
      score: 65,
      metrics: {
        averageDuration: averageDuration
      },
      tags: ['duração', 'eficiência']
    });
    
    return insights;
  } catch (error) {
    logger.error("Erro ao gerar insights básicos:", error);
    
    // Retornar um conjunto mínimo de insights genéricos em caso de erro
    return [
      {
        type: 'suggestion',
        title: 'Configure sua disponibilidade',
        description: 'Certifique-se de configurar corretamente sua disponibilidade para cada dia da semana para maximizar as chances de agendamento.',
        score: 90,
        tags: ['configuração', 'básico']
      },
      {
        type: 'productivity',
        title: 'Analise seus horários mais produtivos',
        description: 'Identifique quais horários do dia você tem mais agendamentos e considere ajustar sua disponibilidade para priorizar esses períodos.',
        score: 85,
        tags: ['produtividade', 'otimização']
      }
    ];
  }
}

/**
 * Analisa e sugere ajustes nos tempos de execução dos serviços
 * com base em dados históricos de agendamentos
 */
export async function analyzeServiceExecutionTimes(
  providerId: number
): Promise<{ serviceId: number, currentTime: number, suggestedTime: number, confidence: number }[]> {
  if (!anthropicService.isInitialized()) {
    logger.warn("Anthropic não configurado. Retornando análise básica de tempos de execução.");
    return getBasicExecutionTimeAnalysis(providerId);
  }

  try {
    logger.info(`Analisando tempos de execução para o prestador ID: ${providerId}`);
    
    // Usando a referência de storage importada no topo do arquivo
    
    // Obter serviços do prestador
    const providerServices = await storage.getServicesByProvider(providerId);
    
    // Obter tempos de execução personalizados configurados
    const executionTimes = await storage.getProviderServicesByProvider(providerId);
    
    // Obter histórico de agendamentos dos últimos 90 dias
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
    
    const historicalAppointments = await db.select()
      .from(appointments)
      .where(and(
        eq(appointments.providerId, providerId),
        gte(appointments.date, threeMonthsAgo.toISOString().split('T')[0])
      ))
      .orderBy(appointments.date);
    
    // Agrupar agendamentos por serviço
    const appointmentsByService = {};
    historicalAppointments.forEach(appointment => {
      if (!appointmentsByService[appointment.serviceId]) {
        appointmentsByService[appointment.serviceId] = [];
      }
      appointmentsByService[appointment.serviceId].push(appointment);
    });
    
    // Calcular duração média real de cada serviço com base nos agendamentos
    const serviceAnalysis = providerServices.map(service => {
      const serviceAppointments = appointmentsByService[service.id] || [];
      const executionTime = executionTimes.find(et => et.serviceId === service.id)?.executionTime || service.duration;
      
      // Calcular duração média baseada no espaçamento entre agendamentos
      const durations = [];
      serviceAppointments.forEach((appointment, index) => {
        if (index > 0 && serviceAppointments[index - 1].date === appointment.date) {
          const prevEnd = serviceAppointments[index - 1].endTime;
          const currentStart = appointment.startTime;
          
          if (prevEnd && currentStart) {
            const prevEndParts = prevEnd.split(':').map(Number);
            const currentStartParts = currentStart.split(':').map(Number);
            
            const prevEndMinutes = prevEndParts[0] * 60 + prevEndParts[1];
            const currentStartMinutes = currentStartParts[0] * 60 + currentStartParts[1];
            
            if (currentStartMinutes > prevEndMinutes) {
              durations.push(currentStartMinutes - prevEndMinutes);
            }
          }
        }
      });
      
      return {
        serviceId: service.id,
        serviceName: service.name,
        duration: service.duration,
        currentExecutionTime: executionTime,
        realDurationsData: durations,
        averageRealDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
        appointmentCount: serviceAppointments.length
      };
    });
    
    // Preparar prompt para a IA
    const prompt = `
    Analise os dados de tempo de execução de serviços abaixo e sugira ajustes quando apropriado.

    ## Serviços do Prestador
    ${JSON.stringify(serviceAnalysis, null, 2)}
    
    Para cada serviço, avalie se o tempo de execução atual é adequado com base nos dados históricos.
    Se houver dados suficientes (pelo menos 5 agendamentos), sugira um novo tempo de execução que otimize a agenda.
    Considere que um tempo muito curto pode levar a atrasos, enquanto um tempo muito longo pode reduzir a capacidade.
    A sugestão deve ser prática e realista, geralmente arredondada para intervalos de 5 ou 10 minutos.

    Forneça uma pontuação de confiança (0-100) para cada sugestão, baseada na quantidade e consistência dos dados.

    Responda no seguinte formato JSON:
    {
      "executionTimeAnalysis": [
        {
          "serviceId": 1,
          "currentTime": 60,
          "suggestedTime": 50,
          "confidence": 85
        }
      ]
    }`;

    // Preparar dados formatados para a análise
    const analysisData = {
      servicos: serviceAnalysis
    };

    // Instruções para a análise
    const instructions = `
    Analise os dados de tempo de execução de serviços e sugira ajustes quando apropriado.
    
    Para cada serviço, avalie se o tempo de execução atual é adequado com base nos dados históricos.
    Se houver dados suficientes (pelo menos 5 agendamentos), sugira um novo tempo de execução que otimize a agenda.
    Considere que um tempo muito curto pode levar a atrasos, enquanto um tempo muito longo pode reduzir a capacidade.
    A sugestão deve ser prática e realista, geralmente arredondada para intervalos de 5 ou 10 minutos.
    
    Forneça uma pontuação de confiança (0-100) para cada sugestão, baseada na quantidade e consistência dos dados.
    
    Responda no seguinte formato JSON:
    {
      "executionTimeAnalysis": [
        {
          "serviceId": 1,
          "currentTime": 60,
          "suggestedTime": 50,
          "confidence": 85
        }
      ]
    }`;

    try {
      // Fazer a chamada para a API do Anthropic Claude
      const result = await anthropicService.analyzeScheduleData(analysisData, instructions);
      
      logger.info(`Análise de tempos de execução gerada com sucesso via Anthropic Claude para o prestador ${providerId}`);
      
      if (Array.isArray(result.executionTimeAnalysis)) {
        return result.executionTimeAnalysis;
      }
      
      logger.warn("Formato de resposta inválido da Anthropic:", result);
      return getBasicExecutionTimeAnalysis(providerId);
    } catch (err) {
      logger.error("Erro ao processar resposta do Anthropic:", err);
      return getBasicExecutionTimeAnalysis(providerId);
    }
  } catch (error) {
    logger.error("Erro ao analisar tempos de execução:", error);
    return getBasicExecutionTimeAnalysis(providerId);
  }
}

/**
 * Fornece uma análise básica de tempos de execução sem usar IA
 */
async function getBasicExecutionTimeAnalysis(
  providerId: number
): Promise<{ serviceId: number, currentTime: number, suggestedTime: number, confidence: number }[]> {
  try {
    // Usando a referência de storage importada no topo do arquivo
    
    // Obter serviços do prestador
    const providerServices = await storage.getServicesByProvider(providerId);
    
    // Obter tempos de execução personalizados configurados
    const executionTimes = await storage.getProviderServicesByProvider(providerId);
    
    return providerServices.map(service => {
      const executionTime = executionTimes.find(et => et.serviceId === service.id)?.executionTime || service.duration;
      
      // Sugestão básica: mantém o mesmo tempo para maioria dos casos
      return {
        serviceId: service.id,
        currentTime: executionTime,
        suggestedTime: executionTime,
        confidence: 50 // Confiança média por não ter análise detalhada
      };
    });
  } catch (error) {
    logger.error("Erro ao gerar análise básica de tempos de execução:", error);
    return [];
  }
}

/**
 * Detecta e prevê tendências de agendamento para ajudar na tomada de decisões
 */
export async function predictSchedulingTrends(
  providerId: number,
  daysAhead: number = 30
): Promise<{ 
  trendType: string, 
  description: string, 
  confidence: number, 
  impact: 'high' | 'medium' | 'low',
  suggestedAction?: string 
}[]> {
  if (!anthropicService.isInitialized()) {
    logger.warn("Anthropic não configurado. Retornando tendências básicas.");
    return getBasicSchedulingTrends(providerId);
  }

  try {
    logger.info(`Analisando tendências de agendamento para o prestador ID: ${providerId}`);
    
    // Usando a referência de storage importada no topo do arquivo
    
    // Obter dados históricos dos últimos 90 dias
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setDate(threeMonthsAgo.getDate() - 90);
    
    const historicalAppointments = await db.select({
      appointment: appointments,
      serviceName: services.name,
      categoryName: categories.name
    })
    .from(appointments)
    .leftJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(categories, eq(services.categoryId, categories.id))
    .where(and(
      eq(appointments.providerId, providerId),
      gte(appointments.date, threeMonthsAgo.toISOString().split('T')[0])
    ))
    .orderBy(appointments.date);
    
    // Agrupar agendamentos por mês
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(today.getMonth() - 2);
    
    const appointmentsByPeriod = {
      twoMonthsAgo: historicalAppointments.filter(a => 
        new Date(a.appointment.date) >= twoMonthsAgo && 
        new Date(a.appointment.date) < lastMonth
      ),
      lastMonth: historicalAppointments.filter(a => 
        new Date(a.appointment.date) >= lastMonth && 
        new Date(a.appointment.date) < today
      ),
      currentMonth: historicalAppointments.filter(a => 
        new Date(a.appointment.date) >= today
      )
    };
    
    // Calcular métricas por período
    const metrics = {
      twoMonthsAgo: {
        total: appointmentsByPeriod.twoMonthsAgo.length,
        byService: calculateGroupMetrics(appointmentsByPeriod.twoMonthsAgo, 'serviceName'),
        byCategory: calculateGroupMetrics(appointmentsByPeriod.twoMonthsAgo, 'categoryName'),
        byDayOfWeek: calculateGroupMetrics(appointmentsByPeriod.twoMonthsAgo, a => new Date(a.appointment.date).getDay()),
        byTimeOfDay: calculateGroupMetrics(appointmentsByPeriod.twoMonthsAgo, a => {
          const hour = parseInt(a.appointment.startTime.split(':')[0]);
          if (hour < 12) return 'manhã';
          if (hour < 18) return 'tarde';
          return 'noite';
        })
      },
      lastMonth: {
        total: appointmentsByPeriod.lastMonth.length,
        byService: calculateGroupMetrics(appointmentsByPeriod.lastMonth, 'serviceName'),
        byCategory: calculateGroupMetrics(appointmentsByPeriod.lastMonth, 'categoryName'),
        byDayOfWeek: calculateGroupMetrics(appointmentsByPeriod.lastMonth, a => new Date(a.appointment.date).getDay()),
        byTimeOfDay: calculateGroupMetrics(appointmentsByPeriod.lastMonth, a => {
          const hour = parseInt(a.appointment.startTime.split(':')[0]);
          if (hour < 12) return 'manhã';
          if (hour < 18) return 'tarde';
          return 'noite';
        })
      },
      currentMonth: {
        total: appointmentsByPeriod.currentMonth.length,
        byService: calculateGroupMetrics(appointmentsByPeriod.currentMonth, 'serviceName'),
        byCategory: calculateGroupMetrics(appointmentsByPeriod.currentMonth, 'categoryName'),
        byDayOfWeek: calculateGroupMetrics(appointmentsByPeriod.currentMonth, a => new Date(a.appointment.date).getDay()),
        byTimeOfDay: calculateGroupMetrics(appointmentsByPeriod.currentMonth, a => {
          const hour = parseInt(a.appointment.startTime.split(':')[0]);
          if (hour < 12) return 'manhã';
          if (hour < 18) return 'tarde';
          return 'noite';
        })
      }
    };
    
    // Obter disponibilidade configurada
    const availability = await storage.getAvailability(providerId);
    
    // Preparar prompt para a IA
    const prompt = `
    Analise os dados de agendamentos dos últimos 3 meses e identifique tendências, mudanças de comportamento
    e faça previsões para os próximos ${daysAhead} dias.

    ## Agendamentos por Período
    ${JSON.stringify(metrics, null, 2)}
    
    ## Disponibilidade Configurada
    ${JSON.stringify(availability.map(a => ({
      diaSemana: a.dayOfWeek,
      início: a.startTime,
      fim: a.endTime,
      disponível: a.isAvailable
    })), null, 2)}
    
    Com base nestes dados, identifique tendências como:
    1. Serviços com aumento ou diminuição de demanda
    2. Mudanças nos horários ou dias preferidos pelos clientes
    3. Sazonalidades ou padrões emergentes
    4. Previsões para o próximo mês
    5. Possíveis gargalos ou oportunidades na agenda
    
    Para cada tendência identificada, forneça:
    - Tipo de tendência (serviço, horário, dia da semana, etc.)
    - Descrição detalhada do que foi observado
    - Nível de confiança na análise (0-100)
    - Impacto potencial (alto, médio, baixo)
    - Ação sugerida para o prestador

    Responda no seguinte formato JSON:
    {
      "trends": [
        {
          "trendType": "serviço",
          "description": "O serviço 'Corte Masculino' apresentou aumento de 25% na demanda no último mês comparado ao período anterior, indicando crescimento contínuo.",
          "confidence": 85,
          "impact": "high",
          "suggestedAction": "Aumentar a disponibilidade para este serviço, especialmente nas quartas e quintas-feiras, quando a demanda é maior."
        }
      ]
    }`;

    // Preparar dados formatados para a análise
    const analysisData = {
      metrics: metrics,
      disponibilidade: availability.map(a => ({
        diaSemana: a.dayOfWeek,
        início: a.startTime,
        fim: a.endTime,
        disponível: a.isAvailable
      })),
      diasPrevisao: daysAhead
    };

    // Instruções para a análise
    const instructions = `
    Analise os dados de agendamentos dos últimos 3 meses e identifique tendências, mudanças de comportamento
    e faça previsões para os próximos ${daysAhead} dias.
    
    Com base nestes dados, identifique tendências como:
    1. Serviços com aumento ou diminuição de demanda
    2. Mudanças nos horários ou dias preferidos pelos clientes
    3. Sazonalidades ou padrões emergentes
    4. Previsões para o próximo mês
    5. Possíveis gargalos ou oportunidades na agenda
    
    Para cada tendência identificada, forneça:
    - Tipo de tendência (serviço, horário, dia da semana, etc.)
    - Descrição detalhada do que foi observado
    - Nível de confiança na análise (0-100)
    - Impacto potencial (alto, médio, baixo)
    - Ação sugerida para o prestador
    
    Responda no seguinte formato JSON:
    {
      "trends": [
        {
          "trendType": "serviço",
          "description": "O serviço 'Corte Masculino' apresentou aumento de 25% na demanda no último mês comparado ao período anterior, indicando crescimento contínuo.",
          "confidence": 85,
          "impact": "high",
          "suggestedAction": "Aumentar a disponibilidade para este serviço, especialmente nas quartas e quintas-feiras, quando a demanda é maior."
        }
      ]
    }`;

    try {
      // Fazer a chamada para a API do Anthropic Claude
      const result = await anthropicService.analyzeScheduleData(analysisData, instructions);
      
      logger.info(`Análise de tendências gerada com sucesso via Anthropic Claude para o prestador ${providerId}`);
      
      if (Array.isArray(result.trends)) {
        return result.trends;
      }
      
      logger.warn("Formato de resposta inválido da Anthropic:", result);
      return getBasicSchedulingTrends(providerId);
    } catch (err) {
      logger.error("Erro ao processar resposta do Anthropic:", err);
      return getBasicSchedulingTrends(providerId);
    }
  } catch (error) {
    logger.error("Erro ao analisar tendências de agendamento:", error);
    return getBasicSchedulingTrends(providerId);
  }
}

/**
 * Função auxiliar para calcular métricas agrupadas
 */
function calculateGroupMetrics(data: any[], groupBy: string | Function) {
  const result = {};
  
  data.forEach(item => {
    let key;
    if (typeof groupBy === 'function') {
      key = groupBy(item);
    } else {
      key = item[groupBy];
    }
    
    if (key) {
      if (!result[key]) {
        result[key] = 0;
      }
      result[key]++;
    }
  });
  
  return result;
}

/**
 * Fornece tendências básicas sem usar IA
 */
function getBasicSchedulingTrends(providerId: number): Promise<{ 
  trendType: string, 
  description: string, 
  confidence: number, 
  impact: 'high' | 'medium' | 'low',
  suggestedAction?: string 
}[]> {
  // Retornar algumas tendências genéricas
  return Promise.resolve([
    {
      trendType: "disponibilidade",
      description: "Monitorar sua disponibilidade e taxas de ocupação é importante para otimizar a agenda.",
      confidence: 60,
      impact: "medium",
      suggestedAction: "Revise regularmente seus horários mais ocupados e considere expandir a disponibilidade nestes períodos."
    },
    {
      trendType: "serviços",
      description: "Alguns serviços podem ser mais populares que outros, afetando a distribuição de sua agenda.",
      confidence: 55,
      impact: "medium",
      suggestedAction: "Acompanhe quais serviços são mais solicitados e ajuste seus tempos de execução conforme necessário."
    },
    {
      trendType: "sazonalidade",
      description: "Diferentes períodos do ano podem afetar a demanda por seus serviços.",
      confidence: 50,
      impact: "medium",
      suggestedAction: "Prepare-se para possíveis variações sazonais na demanda, ajustando sua disponibilidade conforme necessário."
    }
  ]);
}

/**
 * Analisa a agenda do prestador e adapta os slots para um serviço específico
 * Esta função usa IA para otimizar a disponibilidade com base no serviço solicitado
 * 
 * @param providerId ID do prestador de serviço
 * @param date Data do agendamento no formato YYYY-MM-DD
 * @param serviceId ID do serviço solicitado
 * @param timeSlots Lista de slots de tempo inicialmente gerados
 * @returns Lista de slots de tempo otimizados para o serviço específico
 */
export async function adaptProviderAgendaForService(
  providerId: number,
  date: string,
  serviceId: number,
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    availabilityId?: number;
    serviceDuration?: number;
  }>
): Promise<Array<{
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availabilityId?: number;
  serviceDuration?: number;
  adaptationScore?: number;
  adaptationReason?: string;
}>> {
  try {
    logger.info(`[AI] Adaptando agenda do prestador ${providerId} para o serviço ${serviceId} na data ${date}`);
    
    if (!timeSlots.length) {
      logger.warn(`[AI] Nenhum slot disponível para adaptar`);
      return timeSlots;
    }
    
    // Buscar informações do serviço
    const service = await storage.getService(serviceId);
    if (!service) {
      logger.error(`[AI] Serviço ${serviceId} não encontrado`);
      return timeSlots;
    }
    
    // Buscar se existe um tempo de execução personalizado para este serviço
    const providerService = await storage.getProviderServiceByProviderAndService(providerId, serviceId);
    const serviceDuration = (providerService && providerService.executionTime) || service.duration || 60;
    
    logger.info(`[AI] Duração do serviço: ${serviceDuration} minutos`);
    
    // Buscar histórico de agendamentos deste serviço
    const serviceAppointments = await storage.getAppointmentsByProviderAndService(providerId, serviceId);
    
    // Buscar agendamentos do dia
    // Filtramos manualmente os agendamentos pela data, já que temos todos os agendamentos do prestador
    const providerAppointments = await storage.getProviderAppointments(providerId);
    const todayAppointments = providerAppointments.filter(appt => appt.date === date);
    
    // Se temos o Anthropic inicializado, usar IA para análise avançada
    if (anthropicService.isInitialized()) {
      try {
        // Transformar os dados para análise
        const data = {
          provider: { id: providerId },
          service: { 
            id: serviceId, 
            name: service.name, 
            duration: serviceDuration,
            category: service.categoryId
          },
          date,
          availableSlots: timeSlots,
          serviceHistory: serviceAppointments.map(appt => ({
            date: appt.date,
            startTime: appt.startTime,
            endTime: appt.endTime,
            status: appt.status
          })),
          todaySchedule: todayAppointments.map(appt => ({
            serviceId: appt.serviceId,
            startTime: appt.startTime,
            endTime: appt.endTime
          }))
        };
        
        // Criar prompt para análise do Claude
        const instructions = `
          Analise a agenda do prestador e recomende os melhores slots de tempo para este serviço específico.
          Considere a duração do serviço (${serviceDuration} minutos), o histórico de agendamentos deste serviço,
          e a agenda do dia. Atribua uma pontuação de adaptação (0-100) para cada slot disponível e forneça
          uma justificativa concisa para cada pontuação.
          
          Fatores a considerar:
          1. Tempo suficiente para realizar o serviço confortavelmente
          2. Evitar horários muito próximos de outros agendamentos (para evitar atrasos)
          3. Preferência histórica do prestador para este tipo de serviço
          4. Eficiência do prestador após realizar serviços semelhantes
          5. Otimização do dia de trabalho do prestador
          
          Responda exatamente no seguinte formato JSON:
          {
            "adaptedSlots": [
              {
                "startTime": "09:00",
                "endTime": "10:00",
                "score": 85,
                "reason": "Horário da manhã com boa margem de folga antes do próximo agendamento"
              }
            ]
          }
        `;
        
        // Análise com Claude
        const result = await anthropicService.analyzeScheduleData(data, instructions);
        
        if (result && result.adaptedSlots && Array.isArray(result.adaptedSlots)) {
          logger.info(`[AI] Análise de adaptação concluída com sucesso via Anthropic Claude: ${result.adaptedSlots.length} slots`);
          
          // Verificar se slots da IA têm os campos necessários
          const validAdaptedSlots = result.adaptedSlots.map((adaptedSlot: any) => {
            // Encontrar o slot original correspondente
            const originalSlot = timeSlots.find(slot => slot.startTime === adaptedSlot.startTime);
            
            if (!originalSlot) {
              logger.warn(`[AI] Slot ignorado: AI retornou horário (${adaptedSlot.startTime}) que não existe no conjunto original`);
              // Criar slot completo se a IA forneceu startTime e endTime válidos
              if (adaptedSlot.startTime && adaptedSlot.endTime) {
                return {
                  startTime: adaptedSlot.startTime,
                  endTime: adaptedSlot.endTime,
                  isAvailable: true,
                  serviceDuration: serviceDuration,
                  adaptationScore: adaptedSlot.score || 50,
                  adaptationReason: adaptedSlot.reason || "Horário recomendado pela IA"
                };
              }
              // Se não tem horários, ignorar
              return null;
            }
            
            // Mesclar dados do slot original com as recomendações da IA
            return {
              ...originalSlot,
              adaptationScore: adaptedSlot.score,
              adaptationReason: adaptedSlot.reason
            };
          })
          .filter((slot: any) => slot !== null)
          .sort((a: any, b: any) => (b.adaptationScore || 0) - (a.adaptationScore || 0));
          
          logger.info(`[AI] Após validação: ${validAdaptedSlots.length} slots válidos`);
          return validAdaptedSlots;
        }
      } catch (aiError) {
        logger.error('[AI] Erro na análise de IA para adaptação da agenda:', aiError);
        // Continuar com a análise básica em caso de erro
      }
    }
    
    // Fallback: análise básica se a IA não estiver disponível ou falhar
    return adaptAgendaWithBasicHeuristics(timeSlots, serviceDuration, serviceAppointments, todayAppointments);
    
  } catch (error) {
    logger.error("Erro ao adaptar agenda para serviço específico:", error);
    return timeSlots; // Retornar slots originais em caso de erro
  }
}

/**
 * Implementa análise básica para adaptar a agenda sem usar IA
 * Usa heurísticas simples para otimizar slots
 */
function adaptAgendaWithBasicHeuristics(
  timeSlots: Array<{
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    availabilityId?: number;
    serviceDuration?: number;
  }>,
  serviceDuration: number,
  serviceHistory: any[],
  todayAppointments: any[]
): Array<{
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availabilityId?: number;
  serviceDuration?: number;
  adaptationScore?: number;
  adaptationReason?: string;
}> {
  logger.info(`[AI] Realizando adaptação básica de agenda para serviço de ${serviceDuration} minutos`);
  
  // Função auxiliar para converter horários para minutos
  function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  function minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
  
  // Analisar histórico para encontrar horários preferidos para este serviço
  const historicalTimeSlots = serviceHistory.map(appt => ({
    startMinutes: timeToMinutes(appt.startTime),
    endMinutes: timeToMinutes(appt.endTime)
  }));
  
  // Agrupar por períodos do dia (manhã, tarde, noite)
  const morningCount = historicalTimeSlots.filter(slot => slot.startMinutes < 12 * 60).length;
  const afternoonCount = historicalTimeSlots.filter(slot => slot.startMinutes >= 12 * 60 && slot.startMinutes < 18 * 60).length;
  const eveningCount = historicalTimeSlots.filter(slot => slot.startMinutes >= 18 * 60).length;
  
  const totalHistorical = Math.max(historicalTimeSlots.length, 1); // Evitar divisão por zero
  
  // Calcular preferências por período
  const periodPreferences = {
    morning: (morningCount / totalHistorical) * 100,
    afternoon: (afternoonCount / totalHistorical) * 100,
    evening: (eveningCount / totalHistorical) * 100
  };
  
  // Converter agendamentos de hoje para minutos para facilitar comparação
  const todayOccupied = todayAppointments.map(appt => ({
    start: timeToMinutes(appt.startTime),
    end: timeToMinutes(appt.endTime),
    serviceId: appt.serviceId
  })).sort((a, b) => a.start - b.start);
  
  // Adaptar cada slot disponível
  return timeSlots.map(slot => {
    if (!slot.isAvailable) {
      return { ...slot, adaptationScore: 0, adaptationReason: "Horário indisponível" };
    }
    
    const startMinutes = timeToMinutes(slot.startTime);
    const endMinutes = timeToMinutes(slot.endTime);
    
    // Iniciar com pontuação base
    let score = 70;
    let reasons = [];
    
    // 1. Verificar se o slot tem duração adequada
    if (endMinutes - startMinutes < serviceDuration) {
      return { 
        ...slot, 
        adaptationScore: 0, 
        adaptationReason: "Duração insuficiente para este serviço" 
      };
    }
    
    // 2. Verificar período do dia e preferências históricas
    if (startMinutes < 12 * 60) {
      // Manhã
      score += (periodPreferences.morning / 10);
      if (periodPreferences.morning > 40) {
        reasons.push("Horário da manhã tem boa frequência histórica para este serviço");
      }
    } else if (startMinutes < 18 * 60) {
      // Tarde
      score += (periodPreferences.afternoon / 10);
      if (periodPreferences.afternoon > 40) {
        reasons.push("Horário da tarde tem boa frequência histórica para este serviço");
      }
    } else {
      // Noite
      score += (periodPreferences.evening / 10);
      if (periodPreferences.evening > 40) {
        reasons.push("Horário da noite tem boa frequência histórica para este serviço");
      }
    }
    
    // 3. Verificar proximidade com outros agendamentos
    const bufferTime = 15; // 15 minutos de folga entre agendamentos
    let hasConflict = false;
    let hasCloseAppointment = false;
    
    for (const occupied of todayOccupied) {
      // Verificar sobreposição direta
      if (!(endMinutes <= occupied.start || startMinutes >= occupied.end)) {
        hasConflict = true;
        break;
      }
      
      // Verificar proximidade (menos de X minutos entre agendamentos)
      if (Math.abs(endMinutes - occupied.start) < bufferTime || 
          Math.abs(startMinutes - occupied.end) < bufferTime) {
        hasCloseAppointment = true;
      }
    }
    
    if (hasConflict) {
      return { 
        ...slot, 
        isAvailable: false,
        adaptationScore: 0, 
        adaptationReason: "Conflito com agendamento existente" 
      };
    }
    
    if (hasCloseAppointment) {
      score -= 15;
      reasons.push("Horário muito próximo de outro agendamento");
    } else {
      score += 10;
      reasons.push("Espaçamento adequado entre agendamentos");
    }
    
    // 4. Verificar se o horário termina em um momento conveniente
    const endTime = startMinutes + serviceDuration;
    const endMinute = endTime % 60;
    
    if (endMinute === 0 || endMinute === 30) {
      score += 5;
      reasons.push("Serviço termina em horário conveniente");
    }
    
    // 5. Preferir horários "redondos" para início (na hora ou meia hora)
    if (startMinutes % 60 === 0) {
      score += 8;
      reasons.push("Horário de início exato");
    } else if (startMinutes % 30 === 0) {
      score += 5;
      reasons.push("Horário de início na meia hora");
    }
    
    // Gerar uma razão final combinada
    let finalReason = reasons.length > 0 
      ? reasons[0] + (reasons.length > 1 ? `. ${reasons[1]}` : '')
      : "Horário compatível com a duração do serviço";
      
    // Incluir informação sobre duração e término
    const formattedEndTime = minutesToTime(startMinutes + serviceDuration);
    finalReason += `. Duração do serviço: ${serviceDuration} min, término previsto às ${formattedEndTime}.`;
    
    return {
      ...slot,
      adaptationScore: Math.min(Math.round(score), 100),
      adaptationReason: finalReason,
      serviceDuration // Garantir que a duração do serviço esteja no slot
    };
  }).sort((a, b) => (b.adaptationScore || 0) - (a.adaptationScore || 0));
}