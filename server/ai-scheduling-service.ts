/**
 * Serviço de agendamento inteligente com IA
 * 
 * Este serviço usa a API do Anthropic Claude para analisar padrões de agendamento
 * e fazer recomendações inteligentes de horários para os clientes,
 * baseando-se em dados históricos, preferências e heurísticas.
 */

import { db } from "./db";
import { appointments, users, providerSettings, reviews } from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { createLogger } from "./logger";
import { anthropicService } from "./anthropic-service";

const logger = createLogger("AIScheduling");

export interface TimeSlotRecommendation {
  slot: {
    startTime: string;
    endTime: string;
  };
  score: number;
  reason: string;
  tags: string[];
}

interface AvailableTimeSlot {
  startTime: string;
  endTime: string;
}

interface AnalyzeScheduleParams {
  clientId: number;
  providerId: number;
  serviceId: number;
  date: string;
  availableSlots: AvailableTimeSlot[];
}

/**
 * Analisa os horários disponíveis e retorna recomendações inteligentes
 * baseadas no histórico de agendamentos, comportamento do usuário e dados contextuais
 */
export async function analyzeAndRecommendTimeSlots({
  clientId,
  providerId,
  serviceId,
  date,
  availableSlots
}: AnalyzeScheduleParams): Promise<TimeSlotRecommendation[]> {
  // Verificar se temos um serviço personalizado para este prestador
  let serviceExecutionTime: number | null = null;
  try {
    const storage = await import('./storage').then(m => m.storage);
    
    // Primeiro verificamos se existe um tempo de execução personalizado para este serviço e prestador
    const providerService = await storage.getProviderServiceByProviderAndService(providerId, serviceId);
    
    if (providerService) {
      serviceExecutionTime = providerService.executionTime;
      console.log(`Usando tempo de execução personalizado: ${serviceExecutionTime} minutos`);
    } else {
      // Se não existir personalização, obter o tempo padrão do serviço
      const service = await storage.getService(serviceId);
      if (service) {
        serviceExecutionTime = service.duration;
        console.log(`Usando tempo de execução padrão: ${serviceExecutionTime} minutos`);
      }
    }
  } catch (error) {
    console.error('Erro ao buscar informações de tempo de execução:', error);
  }
  if (!anthropicService.isInitialized()) {
    logger.warn("Anthropic não configurado. Retornando recomendações simples.");
    return getSimpleRecommendations(availableSlots, serviceExecutionTime || undefined);
  }

  try {
    logger.info(`Analisando horários para: Cliente ${clientId}, Prestador ${providerId}, Serviço ${serviceId}, Data ${date}`);

    // Buscar dados históricos
    const [clientAppointments, providerBookings, client, provider, providerReviews] = await Promise.all([
      // Agendamentos anteriores do cliente
      db.select()
        .from(appointments)
        .where(eq(appointments.clientId, clientId))
        .orderBy(desc(appointments.date)),
        
      // Agendamentos anteriores do prestador
      db.select()
        .from(appointments)
        .where(eq(appointments.providerId, providerId))
        .orderBy(desc(appointments.date)),
      
      // Dados do cliente
      db.select()
        .from(users)
        .where(eq(users.id, clientId))
        .limit(1)
        .then(results => results[0]),
      
      // Dados e configurações do prestador
      db.select({
        provider: users,
        settings: providerSettings
      })
      .from(users)
      .leftJoin(providerSettings, eq(users.id, providerSettings.providerId))
      .where(eq(users.id, providerId))
      .limit(1)
      .then(results => results[0]),
      
      // Avaliações do prestador
      db.select()
        .from(reviews)
        .where(eq(reviews.providerId, providerId))
    ]);

    // Calcular horários em que o cliente já agendou no passado
    const clientPreferences = extractClientPreferences(clientAppointments);
    
    // Calcular padrões de ocupação do prestador 
    const providerPatterns = extractProviderPatterns(providerBookings);
    
    // Contexto da relação cliente-prestador
    const relationContext = extractRelationshipContext(
      clientAppointments.filter(apt => apt.providerId === providerId)
    );

    // Instruções de sistema para o modelo Anthropic Claude
    const systemInstructions = `Você é um assistente especialista em otimização de agendamentos. Sua tarefa é analisar dados 
    e recomendar os melhores horários para um cliente agendar um serviço com um prestador.`;
    
    try {
      // Usar o serviço Anthropic para analisar os dados
      const result = await anthropicService.analyzeScheduleData({
        availableSlots,
        clientPreferences,
        providerPatterns,
        relationContext,
        clientProfile: client,
        providerProfile: provider,
        reviews: providerReviews,
        date,
        dayOfWeek: new Date(date).getDay()
      }, systemInstructions);
      
      logger.info(`Recomendações geradas com sucesso via Anthropic para Cliente ${clientId}, Prestador ${providerId}`);
      
      // Ordenar por score (do maior para o menor)
      if (Array.isArray(result.recommendations)) {
        return result.recommendations
          .sort((a: TimeSlotRecommendation, b: TimeSlotRecommendation) => b.score - a.score);
      }
      
      logger.warn("Formato de resposta inválido da IA:", result);
      return getSimpleRecommendations(availableSlots, serviceExecutionTime || undefined);
    } catch (err) {
      logger.error("Erro ao processar resposta do Anthropic:", err);
      return getSimpleRecommendations(availableSlots, serviceExecutionTime || undefined);
    }
  } catch (error) {
    logger.error("Erro ao gerar recomendações de horários:", error);
    return getSimpleRecommendations(availableSlots, serviceExecutionTime || undefined);
  }
}

function extractClientPreferences(clientAppointments: any[]) {
  // Lógica para extrair preferências do cliente baseado no histórico
  // como horários mais frequentes, dias da semana, etc.
  const timeDistribution: Record<string, number> = {};
  const dayDistribution: Record<number, number> = {};

  clientAppointments.forEach(apt => {
    // Extrair hora do dia (apenas hora)
    const hour = apt.startTime.split(':')[0];
    timeDistribution[hour] = (timeDistribution[hour] || 0) + 1;
    
    // Extrair dia da semana (0-6, sendo 0 domingo)
    const date = new Date(apt.date);
    const dayOfWeek = date.getDay();
    dayDistribution[dayOfWeek] = (dayDistribution[dayOfWeek] || 0) + 1;
  });

  // Calcular preferências de período do dia
  const periods = {
    manhã: 0,
    tarde: 0,
    noite: 0
  };

  Object.entries(timeDistribution).forEach(([hour, count]) => {
    const hourNum = parseInt(hour);
    if (hourNum >= 6 && hourNum < 12) {
      periods.manhã += count;
    } else if (hourNum >= 12 && hourNum < 18) {
      periods.tarde += count;
    } else {
      periods.noite += count;
    }
  });

  return {
    timeDistribution,
    dayDistribution,
    periods,
    totalAppointments: clientAppointments.length
  };
}

function extractProviderPatterns(recentAppointments: any[]) {
  // Lógica para extrair padrões do prestador como horários mais ocupados, 
  // dias mais agendados, etc.
  const timeOccupancy: Record<string, number> = {};
  const dayOccupancy: Record<number, number> = {};
  
  recentAppointments.forEach(apt => {
    // Extrair hora do dia (apenas hora)
    const hour = apt.startTime.split(':')[0];
    timeOccupancy[hour] = (timeOccupancy[hour] || 0) + 1;
    
    // Extrair dia da semana
    const date = new Date(apt.date);
    const dayOfWeek = date.getDay();
    dayOccupancy[dayOfWeek] = (dayOccupancy[dayOfWeek] || 0) + 1;
  });
  
  return {
    timeOccupancy,
    dayOccupancy,
    totalRecentAppointments: recentAppointments.length
  };
}

function extractRelationshipContext(appointments: any[]) {
  // Extrair contexto da relação entre cliente e prestador
  return {
    appointmentCount: appointments.length,
    lastAppointment: appointments.length > 0 ? appointments[0] : null,
    preferredServices: appointments.length > 0 ? [appointments[0].serviceId] : []
  };
}

function createAnalysisPrompt({
  date,
  availableSlots,
  clientPreferences,
  providerPatterns,
  relationContext,
  clientProfile,
  providerProfile,
  reviews
}: any) {
  // Data no formato ISO
  const requestedDate = new Date(date);
  const dayOfWeek = requestedDate.getDay();
  const dayNames = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
  
  // Verificar se há duração de serviço especificada nos slots
  let serviceDuration = 30; // Valor padrão
  if (availableSlots && availableSlots.length > 0 && availableSlots[0].serviceDuration) {
    serviceDuration = availableSlots[0].serviceDuration;
  }
  
  // Criar prompt com ênfase na duração do serviço
  return `
  Analise os dados abaixo e recomende os melhores horários disponíveis para um agendamento, considerando a duração de ${serviceDuration} minutos para o serviço.
  
  ## Contexto
  - Data solicitada: ${date} (${dayNames[dayOfWeek]})
  - Duração do serviço: ${serviceDuration} minutos (MUITO IMPORTANTE considerar essa duração)
  - Horários disponíveis: ${JSON.stringify(availableSlots)}
  - Prestador: ${providerProfile?.provider?.name || 'Nome não disponível'}
  - Cliente: ${clientProfile?.name || 'Nome não disponível'}
  
  ## Histórico do Cliente
  ${JSON.stringify(clientPreferences, null, 2)}
  
  ## Padrões do Prestador
  ${JSON.stringify(providerPatterns, null, 2)}
  
  ## Relação Cliente-Prestador
  ${JSON.stringify(relationContext, null, 2)}
  
  ## Avaliações do Prestador
  ${JSON.stringify(reviews?.slice(0, 5), null, 2)}
  
  Analise todos os dados e gere um ranking dos horários disponíveis com base em:
  1. Preferências históricas do cliente
  2. Disponibilidade e tendências do prestador
  3. Dias e horários mais populares para o tipo de serviço
  4. Contexto da data solicitada (dia da semana, período)
  5. Duração adequada do serviço - esse serviço leva ${serviceDuration} minutos para ser executado
  6. Eficiência no uso do tempo (evite slots que deixem "buracos" pequenos na agenda)
  
  IMPORTANTE: Certifique-se de que os horários recomendados considerem a duração real do serviço (${serviceDuration} minutos).
  Ao recomendar um horário, leve em conta que o serviço terá término em exatamente ${serviceDuration} minutos após o início.
  
  Para cada horário disponível, atribua:
  1. Uma pontuação de 0 a 100 indicando o quão recomendado é o horário
  2. Uma explicação clara do motivo da recomendação, mencionando explicitamente o tempo de serviço na justificativa
  3. Tags relevantes como "manhã", "tarde", "noite", "horário popular", "menos ocupado", "rápido" ou "longo", etc.
  
  Responda no seguinte formato JSON:
  {
    "recommendations": [
      {
        "slot": {"startTime": "09:00", "endTime": "09:${serviceDuration}"},
        "score": 85,
        "reason": "Este horário da manhã combina com seu padrão histórico e é ideal para este serviço de ${serviceDuration} minutos.",
        "tags": ["manhã", "horário popular", "recomendado", "duração ideal"]
      }
    ]
  }`;
}

/**
 * Método avançado para gerar recomendações sem utilizar IA
 * Usado como fallback quando a API da OpenAI/Anthropic não está disponível
 * Implementa um algoritmo de pontuação mais sofisticado que considera múltiplos fatores
 * 
 * Este método utiliza heurísticas e análise estatística para fornecer recomendações
 * de qualidade mesmo sem acesso à IA, garantindo que o sistema permaneça funcional
 * em todos os cenários.
 */
export async function getSimpleRecommendations(
  availableSlots: AvailableTimeSlot[],
  serviceExecutionTime?: number
): Promise<TimeSlotRecommendation[]> {
  // Lógica avançada para recomendar horários baseada em heurísticas sem IA
  console.log(`Gerando recomendações avançadas para serviço com tempo de execução: ${serviceExecutionTime || 'padrão'} minutos`);
  
  // Obter data atual para calcular as recomendações adequadamente
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay(); // 0 = Domingo, 1 = Segunda, ...
  
  // Fatores de peso para pontuação - ajustado para dar mais peso à duração do serviço
  const weights = {
    timeOfDay: 0.25,       // Peso para o período do dia
    proximity: 0.15,       // Peso para proximidade do horário atual (relevante para agendamentos no mesmo dia)
    popularity: 0.15,      // Peso para horários populares/preferidos
    convenience: 0.20,     // Peso para conveniência geral (horários redondos, etc.)
    serviceDuration: 0.25  // Novo peso específico para considerar a duração do serviço
  };
  
  // Dias úteis vs final de semana têm diferentes horários ideais
  const isWeekend = [0, 6].includes(currentDay);
  
  // Analisar os slots e atribuir pontuações
  return availableSlots.map(slot => {
    // Parse hour and minutes
    const [hourStr, minutesStr] = slot.startTime.split(':');
    const hour = parseInt(hourStr);
    const minutes = parseInt(minutesStr);
    
    // Verificar duração do serviço no próprio slot (se disponível)
    const slotServiceDuration = (slot as any).serviceDuration || serviceExecutionTime;
    
    // Pontuação e razão baseadas em diversos fatores
    let score = 70; // Pontuação base
    let reason = '';
    const tags = [];
    const factors: Record<string, number> = {};
    
    // 1. Fator: Período do dia - diferente para dias úteis e finais de semana
    let timeOfDayScore = 0;
    if (!isWeekend) {
      // Dias úteis: preferência para manhã cedo e final da tarde
      if (hour >= 7 && hour < 10) {
        timeOfDayScore = 95;
        reason = 'Manhã cedo, ótimo para começar o dia com seu compromisso.';
        tags.push('manhã', 'período ótimo');
      } else if (hour >= 10 && hour < 12) {
        timeOfDayScore = 85;
        reason = 'Final da manhã, período de alta produtividade.';
        tags.push('manhã', 'produtivo');
      } else if (hour >= 12 && hour < 14) {
        timeOfDayScore = 60;
        reason = 'Horário de almoço, conveniente se você tem uma pausa disponível.';
        tags.push('tarde', 'horário de almoço');
      } else if (hour >= 14 && hour < 16) {
        timeOfDayScore = 75;
        reason = 'Início da tarde, bom momento após o almoço.';
        tags.push('tarde', 'produtivo');
      } else if (hour >= 16 && hour < 19) {
        timeOfDayScore = 90;
        reason = 'Final da tarde/início da noite, conveniente após o expediente.';
        tags.push('tarde', 'após expediente');
      } else if (hour >= 19) {
        timeOfDayScore = 65;
        reason = 'Período noturno, opção para quem tem agenda lotada durante o dia.';
        tags.push('noite');
      } else {
        // Horários muito cedo
        timeOfDayScore = 50;
        reason = 'Início da manhã, para quem prefere horários bem cedo.';
        tags.push('manhã', 'cedo');
      }
    } else {
      // Finais de semana: preferência maior para meio da manhã e tarde
      if (hour >= 8 && hour < 11) {
        timeOfDayScore = 95;
        reason = 'Manhã de fim de semana, período tranquilo e produtivo.';
        tags.push('manhã', 'fim de semana', 'tranquilo');
      } else if (hour >= 11 && hour < 14) {
        timeOfDayScore = 75;
        reason = 'Próximo ao almoço, ideal para conciliar com outras atividades.';
        tags.push('manhã', 'almoço', 'fim de semana');
      } else if (hour >= 14 && hour < 17) {
        timeOfDayScore = 90;
        reason = 'Tarde de fim de semana, excelente período para suas atividades.';
        tags.push('tarde', 'fim de semana', 'produtivo');
      } else if (hour >= 17) {
        timeOfDayScore = 70;
        reason = 'Final da tarde de fim de semana, ainda com tempo para atividades noturnas.';
        tags.push('tarde', 'fim de semana', 'final do dia');
      } else {
        timeOfDayScore = 60;
        reason = 'Início da manhã de fim de semana, para os mais matinais.';
        tags.push('manhã', 'fim de semana', 'cedo');
      }
    }
    factors.timeOfDay = timeOfDayScore;
    
    // 2. Fator: Proximidade do horário atual (relevante para agendamentos no mesmo dia)
    let proximityScore = 80; // Valor padrão
    const hourDiff = hour - currentHour;
    
    if (hourDiff > 0 && hourDiff <= 3) {
      // Horários disponíveis nas próximas 3 horas
      proximityScore = 95 - (hourDiff * 5); // 95, 90, 85
      tags.push('próximo', 'hoje');
    } else if (hourDiff > 3 && hourDiff <= 8) {
      // Horários mais tarde no mesmo dia
      proximityScore = 80 - ((hourDiff - 3) * 2); // ~80-70
      tags.push('hoje', 'mesmo dia');
    } else if (hourDiff < 0) {
      // Horários no passado (outro dia)
      proximityScore = 75;
    }
    factors.proximity = proximityScore;
    
    // 3. Fator: Popularidade/Conveniência do horário
    let popularityScore = 75;
    
    // Horários de "rush" (alta demanda) vs. horários mais tranquilos
    if (hour === 9 || hour === 10 || hour === 15 || hour === 16) {
      popularityScore = 92;
      tags.push('horário popular', 'alta demanda');
    } else if (hour === 11 || hour === 14 || hour === 17) {
      popularityScore = 85;
      tags.push('horário popular');
    } else if (hour === 12 || hour === 13) {
      popularityScore = 65;
      tags.push('horário de almoço', 'menos procurado');
    } else if (hour < 8 || hour >= 18) {
      popularityScore = 70;
      tags.push('horário menos convencional');
    }
    factors.popularity = popularityScore;
    
    // 4. Fator: Conveniência geral
    let convenienceScore = 75;
    
    // Valorizar horários "redondos" (9:00, 10:00, etc) ou "meio" (9:30, 10:30)
    if (minutes === 0) {
      convenienceScore = 95;
      tags.push('horário cheio');
    } else if (minutes === 30) {
      convenienceScore = 90;
      tags.push('horário meio');
    } else {
      convenienceScore = 70;
      tags.push('horário quebrado');
    }
    
    // Adicionar bônus para horários que considerem a duração do serviço
    // e terminem em horários "redondos"
    if (serviceExecutionTime) {
      const endMinutes = (hour * 60 + minutes + serviceExecutionTime) % 60;
      if (endMinutes === 0 || endMinutes === 30) {
        convenienceScore += 5;
        tags.push('término adequado');
      }
    }
    factors.convenience = convenienceScore;
    
    // 5. Fator: Duração do serviço - análise específica da duração
    let serviceDurationScore = 80; // Valor padrão
    
    if (slotServiceDuration) {
      // Categorizar duração do serviço
      if (slotServiceDuration <= 30) {
        serviceDurationScore = 85; // Serviços rápidos são convenientes
        tags.push('serviço rápido');
      } else if (slotServiceDuration <= 60) {
        serviceDurationScore = 80; // Duração média
        tags.push('duração média');
      } else if (slotServiceDuration <= 90) {
        serviceDurationScore = 75; // Serviços mais longos
        tags.push('serviço longo');
      } else {
        serviceDurationScore = 70; // Serviços muito longos
        tags.push('serviço muito longo');
      }
      
      // Se o horário de início permite concluir o serviço antes do fim do dia comercial (18h)
      const endHourInMinutes = (hour * 60) + minutes + slotServiceDuration;
      const endOfBusinessDay = 18 * 60; // 18:00 em minutos
      
      if (endHourInMinutes <= endOfBusinessDay) {
        serviceDurationScore += 10;
        tags.push('termina no horário comercial');
      }
      
      // Bônus para serviços que começam e terminam em "horários agradáveis"
      // (evita começar ou terminar em horários inconvenientes)
      const endHour = Math.floor(endHourInMinutes / 60);
      if ((hour >= 8 && hour <= 17) && (endHour >= 9 && endHour <= 18)) {
        serviceDurationScore += 5;
        tags.push('horário comercial completo');
      }
    }
    
    factors.serviceDuration = serviceDurationScore;
    
    // Calcular pontuação ponderada final - incluindo o fator de duração do serviço
    score = (
      factors.timeOfDay * weights.timeOfDay +
      factors.proximity * weights.proximity +
      factors.popularity * weights.popularity +
      factors.convenience * weights.convenience +
      factors.serviceDuration * weights.serviceDuration
    );
    
    // Ajustes finais e tags adicionais
    if (score >= 87) {
      tags.push('altamente recomendado');
    } else if (score >= 80) {
      tags.push('recomendado');
    }
    
    // Se não há justificativa ainda, use uma genérica
    if (!reason) {
      reason = 'Horário disponível para agendamento.';
    }
    
    // Incluir duração do serviço na justificativa se disponível
    if (slotServiceDuration) {
      const durationHours = Math.floor(slotServiceDuration / 60);
      const durationMinutes = slotServiceDuration % 60;
      
      let durationText = '';
      if (durationHours > 0) {
        durationText += `${durationHours}h`;
        if (durationMinutes > 0) durationText += ` e ${durationMinutes}min`;
      } else {
        durationText = `${durationMinutes}min`;
      }
      
      // Formatar horário de término para exibição
      const endTimeInMinutes = (hour * 60) + minutes + slotServiceDuration;
      const endHour = Math.floor(endTimeInMinutes / 60) % 24; // Usar módulo 24 para garantir formato correto
      const endMinute = endTimeInMinutes % 60;
      const formattedEndTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      // Adicionar texto detalhado sobre a duração
      reason += ` Este serviço tem duração de ${durationText} e terminará às ${formattedEndTime}.`;
      
      // Adicionar informação contextual sobre o período do dia em que termina
      if (endHour < 12) {
        reason += " O serviço será concluído ainda pela manhã.";
      } else if (endHour < 18) {
        reason += " O serviço será concluído durante a tarde.";
      } else {
        reason += " O serviço será concluído no início da noite.";
      }
    }
    
    return {
      slot,
      score,
      reason,
      tags,
      factors // Incluir fatores para análise/depuração (opcional)
    } as TimeSlotRecommendation;
  }).sort((a, b) => b.score - a.score);
}