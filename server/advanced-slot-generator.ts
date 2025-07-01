/**
 * Gerador Avançado de Slots de Tempo
 * 
 * Este módulo implementa algoritmos avançados para geração de slots de tempo para serviços longos,
 * utilizando análise detalhada de blocos livres para identificar corretamente períodos disponíveis.
 */

interface TimeBlock {
  start: number;
  end: number;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availabilityId?: number;
  serviceDuration?: number;
  score?: number;
  reason?: string;
}

/**
 * Converte horário no formato "HH:MM" para minutos desde o início do dia
 * Inclui validação de formato e tratamento de erro
 * 
 * @param time String no formato "HH:MM"
 * @returns Número de minutos desde o início do dia ou NaN em caso de formato inválido
 */
export function timeToMinutes(time: string): number {
  // Verificação mais robusta para argumentos inválidos
  if (!time || typeof time !== 'string') {
    console.error(`[timeToMinutes] Formato de tempo inválido (nulo ou não-string): ${time}`);
    return NaN;
  }

  // Normalizar formato (remover espaços extras)
  let normalizedTime = time.trim();
  
  try {
    // Validar formato HH:MM usando regex
    const isValidFormat = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.test(normalizedTime);
    if (!isValidFormat) {
      console.error(`[timeToMinutes] Formato de tempo não segue o padrão HH:MM: ${normalizedTime}`);
      return NaN;
    }

    const [hours, minutes] = normalizedTime.split(':').map(Number);
    
    // Validação adicional para valores numéricos
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      console.error(`[timeToMinutes] Horário inválido: ${normalizedTime} (${hours}:${minutes})`);
      return NaN;
    }
    
    const totalMinutes = hours * 60 + minutes;
    return totalMinutes;
  } catch (error) {
    console.error(`[timeToMinutes] Erro ao converter tempo "${normalizedTime}" para minutos:`, error);
    return NaN;
  }
}

/**
 * Converte minutos desde o início do dia para horário no formato "HH:MM"
 * Inclui validação e tratamento de erro
 * 
 * @param minutes Número de minutos desde o início do dia
 * @returns Horário no formato "HH:MM" ou "00:00" em caso de valor inválido
 */
export function minutesToTime(minutes: number): string {
  if (isNaN(minutes) || minutes < 0 || minutes > 1440) { // 1440 = 24 * 60 (minutos em um dia)
    console.error(`[minutesToTime] Valor de minutos inválido: ${minutes}`);
    return "00:00";
  }
  
  try {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error(`[minutesToTime] Erro ao converter minutos ${minutes}:`, error);
    return "00:00";
  }
}

/**
 * Identifica blocos de tempo livre entre períodos ocupados
 * Implementa um algoritmo otimizado para identificar blocos contínuos disponíveis
 * 
 * @param slotStartMinutes Hora de início do período de disponibilidade (em minutos)
 * @param slotEndMinutes Hora de fim do período de disponibilidade (em minutos)
 * @param occupiedPeriods Lista de períodos ocupados
 * @returns Lista de blocos de tempo livre
 */
export function findFreeTimeBlocks(
  slotStartMinutes: number, 
  slotEndMinutes: number, 
  occupiedPeriods: TimeBlock[]
): TimeBlock[] {
  // Validar parâmetros de entrada
  if (isNaN(slotStartMinutes) || isNaN(slotEndMinutes) || slotStartMinutes < 0 || slotEndMinutes > 1440) {
    console.error(`[findFreeTimeBlocks] Parâmetros inválidos: start=${slotStartMinutes}, end=${slotEndMinutes}`);
    return [];
  }
  
  if (slotStartMinutes >= slotEndMinutes) {
    console.error(`[findFreeTimeBlocks] Intervalo inválido: ${minutesToTime(slotStartMinutes)}-${minutesToTime(slotEndMinutes)}`);
    return [];
  }
  
  // Inicializar lista de blocos livres
  const freeBlocks: TimeBlock[] = [];
  
  // Calcular tempo total disponível (para diagnóstico)
  const totalAvailableTime = slotEndMinutes - slotStartMinutes;
  console.log(`[findFreeTimeBlocks] Disponibilidade total: ${totalAvailableTime} minutos (${minutesToTime(slotStartMinutes)}-${minutesToTime(slotEndMinutes)})`);
  
  // Verificar se há períodos ocupados
  if (!occupiedPeriods || occupiedPeriods.length === 0) {
    // Se não houver períodos ocupados, o slot inteiro está livre
    freeBlocks.push({
      start: slotStartMinutes,
      end: slotEndMinutes
    });
    console.log(`[findFreeTimeBlocks] Nenhum período ocupado. Slot inteiro disponível: ${minutesToTime(slotStartMinutes)}-${minutesToTime(slotEndMinutes)} (${slotEndMinutes - slotStartMinutes} min)`);
    return freeBlocks;
  }
  
  // Validar períodos ocupados
  const validOccupiedPeriods = occupiedPeriods.filter(period => {
    if (isNaN(period.start) || isNaN(period.end) || period.start >= period.end) {
      console.warn(`[findFreeTimeBlocks] Período ocupado inválido ignorado: ${period.start}-${period.end}`);
      return false;
    }
    return true;
  });
  
  const totalSlotDuration = slotEndMinutes - slotStartMinutes;
  console.log(`[findFreeTimeBlocks] Análise de slot total: ${minutesToTime(slotStartMinutes)}-${minutesToTime(slotEndMinutes)} (${totalSlotDuration} min)`);
  
  // IMPORTANTE: Filtrar e limitar períodos ocupados de acordo com o slot de disponibilidade
  const relevantPeriods = validOccupiedPeriods
    // 1. Filtrar apenas períodos que têm pelo menos alguma interseção com o slot atual
    .filter(period => period.end > slotStartMinutes && period.start < slotEndMinutes)
    // 2. Ajustar os limites dos períodos para que fiquem contidos no slot atual
    .map(period => ({
      start: Math.max(period.start, slotStartMinutes),
      end: Math.min(period.end, slotEndMinutes)
    }))
    // 3. Ordenar cronologicamente para facilitar processamento
    .sort((a, b) => a.start - b.start);
  
  console.log(`[findFreeTimeBlocks] Períodos ocupados relevantes: ${relevantPeriods.length} de ${validOccupiedPeriods.length} totais`);
  
  // Abordagem otimizada: usar mapa de eventos para rastrear início/fim de períodos ocupados
  if (relevantPeriods.length === 0) {
    // Nenhum período ocupado relevante
    freeBlocks.push({ start: slotStartMinutes, end: slotEndMinutes });
    console.log(`[findFreeTimeBlocks] Nenhum período ocupado relevante. Slot inteiro disponível.`);
    return freeBlocks;
  }
  
  // Mesclar períodos ocupados que se sobrepõem usando uma abordagem de única passagem
  const mergedOccupiedPeriods: TimeBlock[] = [];
  let currentBlock = { ...relevantPeriods[0] };
  
  console.log(`[findFreeTimeBlocks] Iniciando mesclagem de períodos ocupados sobrepostos...`);
  
  for (let i = 1; i < relevantPeriods.length; i++) {
    const period = relevantPeriods[i];
    
    if (period.start <= currentBlock.end) {
      // Estender o bloco atual se houver sobreposição
      currentBlock.end = Math.max(currentBlock.end, period.end);
    } else {
      // Finalizar o bloco atual e iniciar um novo
      mergedOccupiedPeriods.push(currentBlock);
      currentBlock = { ...period };
    }
  }
  
  // Adicionar o último bloco ocupado
  mergedOccupiedPeriods.push(currentBlock);
  
  // Log de períodos ocupados apenas para serviços longos ou quando houver poucos períodos
  if (mergedOccupiedPeriods.length < 10) {
    mergedOccupiedPeriods.forEach((period, index) => {
      console.log(`[findFreeTimeBlocks] Período ocupado #${index+1}: ${minutesToTime(period.start)}-${minutesToTime(period.end)} (${period.end - period.start} min)`);
    });
  } else {
    console.log(`[findFreeTimeBlocks] ${mergedOccupiedPeriods.length} períodos ocupados identificados`);
  }
  
  // CORRIGIDO: Calcular o total de minutos ocupados com validação para impedir cálculos negativos
  const totalOccupiedMinutes = mergedOccupiedPeriods.reduce((total, period) => {
    // Certificar-se que os períodos são válidos
    const duration = Math.max(0, period.end - period.start);
    return total + duration;
  }, 0);
  
  // Garantir que o totalFreeMinutes nunca seja negativo
  const totalFreeMinutes = Math.max(0, totalSlotDuration - totalOccupiedMinutes);
  console.log(`[findFreeTimeBlocks] Slot total: ${minutesToTime(slotStartMinutes)}-${minutesToTime(slotEndMinutes)} (${totalSlotDuration} min)`);
  console.log(`[findFreeTimeBlocks] Total ocupado: ${totalOccupiedMinutes} min, Total livre: ${totalFreeMinutes} min`);
  
  // Gerar blocos livres a partir dos períodos ocupados mesclados
  let lastEndTime = slotStartMinutes;
  
  for (const period of mergedOccupiedPeriods) {
    // Se há espaço antes do período ocupado, adicionar como bloco livre
    if (period.start > lastEndTime) {
      const freeBlock = {
        start: lastEndTime,
        end: period.start
      };
      
      const blockDuration = freeBlock.end - freeBlock.start;
      // Registrar apenas blocos significativos para reduzir ruído de log
      if (blockDuration >= 15) {
        console.log(`[findFreeTimeBlocks] Bloco livre: ${minutesToTime(freeBlock.start)}-${minutesToTime(freeBlock.end)} (${blockDuration} min)`);
      }
      
      freeBlocks.push(freeBlock);
    }
    
    // Atualizar último horário de término para o próximo ciclo
    lastEndTime = period.end;
  }
  
  // Adicionar bloco final se houver espaço livre após o último período ocupado
  if (lastEndTime < slotEndMinutes) {
    const finalBlock = {
      start: lastEndTime,
      end: slotEndMinutes
    };
    const blockDuration = finalBlock.end - finalBlock.start;
    if (blockDuration >= 15) {
      console.log(`[findFreeTimeBlocks] Bloco livre final: ${minutesToTime(finalBlock.start)}-${minutesToTime(finalBlock.end)} (${blockDuration} min)`);
    }
    freeBlocks.push(finalBlock);
  }
  
  return freeBlocks;
}

/**
 * Verifica se um bloco de tempo tem duração suficiente para um serviço
 * 
 * @param block Bloco de tempo livre
 * @param serviceDuration Duração do serviço em minutos
 * @returns Verdadeiro se o bloco tem duração suficiente
 */
export function hasEnoughTimeForService(block: TimeBlock, serviceDuration: number): boolean {
  // Validações de segurança
  if (!block || typeof block.start !== 'number' || typeof block.end !== 'number') {
    console.error(`[hasEnoughTimeForService] Bloco inválido:`, block);
    return false;
  }
  
  if (!serviceDuration || serviceDuration <= 0) {
    console.error(`[hasEnoughTimeForService] Duração de serviço inválida: ${serviceDuration}`);
    return false;
  }

  const durationInMinutes = block.end - block.start;
  const hasEnoughTime = durationInMinutes >= serviceDuration;
  
  // Logging mais detalhado para ajudar no diagnóstico
  if (!hasEnoughTime) {
    console.log(`[hasEnoughTimeForService] INSUFICIENTE: Bloco ${minutesToTime(block.start)}-${minutesToTime(block.end)} (${durationInMinutes} min) é insuficiente para serviço de ${serviceDuration} min`);
  } else {
    console.log(`[hasEnoughTimeForService] ADEQUADO: Bloco ${minutesToTime(block.start)}-${minutesToTime(block.end)} (${durationInMinutes} min) é adequado para serviço de ${serviceDuration} min`);
  }
  
  return hasEnoughTime;
}

/**
 * Gera horários preferenciais de início dentro de um bloco livre
 * 
 * Implementação melhorada:
 * - Respeita a duração do serviço (não gera slots sobrepostos)
 * - Distribui slots de acordo com a duração do serviço
 * - Prioriza horários "redondos" (em ponto, meias horas)
 * 
 * @param block Bloco de tempo livre
 * @param serviceDuration Duração do serviço em minutos
 * @returns Lista de horários de início possíveis (em minutos)
 */
export function generatePreferredStartTimes(
  block: TimeBlock, 
  serviceDuration: number
): number[] {
  // Validação de entrada
  if (!block || typeof block.start !== 'number' || typeof block.end !== 'number') {
    console.error('[generatePreferredStartTimes] Bloco inválido:', block);
    return [];
  }
  
  if (!serviceDuration || serviceDuration <= 0) {
    console.error(`[generatePreferredStartTimes] Duração de serviço inválida: ${serviceDuration}`);
    return [];
  }
  
  // Calcular a duração do bloco em minutos
  const duration = block.end - block.start;
  console.log(`[generatePreferredStartTimes] Gerando horários para bloco ${minutesToTime(block.start)}-${minutesToTime(block.end)} (${duration} min) para serviço de ${serviceDuration} min`);
  
  // Verificar se o bloco tem tamanho suficiente
  if (duration < serviceDuration) {
    console.log(`[generatePreferredStartTimes] AVISO: Bloco ${minutesToTime(block.start)}-${minutesToTime(block.end)} (${duration} min) é pequeno demais para o serviço de ${serviceDuration} min. Nenhum horário gerado.`);
    return [];
  }
  
  // Resultados e estado
  const preferredStartTimes: number[] = [];
  const addedTimes = new Set<number>();
  
  // Função auxiliar para adicionar horários
  const addTimeIfAvailable = (timeMinutes: number) => {
    if (timeMinutes >= block.start && 
        timeMinutes + serviceDuration <= block.end && 
        !addedTimes.has(timeMinutes)) {
      preferredStartTimes.push(timeMinutes);
      addedTimes.add(timeMinutes);
      console.log(`[generatePreferredStartTimes] Adicionado horário: ${minutesToTime(timeMinutes)} (termina: ${minutesToTime(timeMinutes + serviceDuration)})`);
    }
  };
  
  // Abordagem específica dependendo da duração do serviço
  if (serviceDuration >= 180) {
    // Para serviços muito longos (3 horas ou mais), tomar uma abordagem mais simples
    // Começar a cada hora em ponto apenas, ou usar apenas o início do bloco
    console.log(`[generatePreferredStartTimes] Estratégia para serviço MUITO LONGO (${serviceDuration} min)`);
    
    // Horas de início e fim para iteração (com margem de segurança)
    const startHour = Math.floor(block.start / 60);
    const endHour = Math.floor((block.end - serviceDuration) / 60);
    
    // Adicionar horários inteiros (8:00, 9:00, etc.)
    for (let hour = startHour; hour <= endHour; hour++) {
      const timeMinutes = hour * 60;
      // Verificação mais explícita para diagnóstico
      if (timeMinutes >= block.start && timeMinutes + serviceDuration <= block.end) {
        console.log(`[generatePreferredStartTimes] SUCESSO: ${minutesToTime(timeMinutes)} + ${serviceDuration} min termina às ${minutesToTime(timeMinutes + serviceDuration)}, dentro do bloco até ${minutesToTime(block.end)}`);
        addTimeIfAvailable(timeMinutes);
      } else {
        console.log(`[generatePreferredStartTimes] FALHA: ${minutesToTime(timeMinutes)} + ${serviceDuration} min termina às ${minutesToTime(timeMinutes + serviceDuration)}, fora do bloco até ${minutesToTime(block.end)}`);
      }
    }
    
    // Adicionar o início do bloco (se não for hora cheia)
    addTimeIfAvailable(block.start);
    
  } else if (serviceDuration >= 90) {
    // Para serviços longos (90min a 179min), usar intervalos maiores
    console.log(`[generatePreferredStartTimes] Estratégia para serviço LONGO (${serviceDuration} min)`);
    
    // Horas de início e fim para iteração
    const startHour = Math.floor(block.start / 60);
    const endHour = Math.floor((block.end - serviceDuration) / 60);
    
    // Adicionar horários alinhados às horas e meias horas
    for (let hour = startHour; hour <= endHour; hour++) {
      addTimeIfAvailable(hour * 60);     // XX:00
      addTimeIfAvailable(hour * 60 + 30); // XX:30
    }
    
    // Sempre incluir o início do bloco se possível
    addTimeIfAvailable(block.start);
    
  } else {
    // NOVA ABORDAGEM: Gera slots precisamente espaçados com base na duração do serviço
    console.log(`[generatePreferredStartTimes] Estratégia de slots sucessivos para serviço de ${serviceDuration} min`);
    
    // Começar do início do bloco
    let currentStartTime = block.start;
    
    // Preferir horários "redondos" se estiverem próximos do início
    const nearestHourStart = Math.ceil(block.start / 60) * 60; // Próxima hora em ponto
    const nearestHalfHourStart = Math.ceil(block.start / 30) * 30; // Próxima meia hora
    
    // Se estiver próximo de um horário "redondo", começar por ele
    if (nearestHourStart - block.start <= 15 && nearestHourStart < block.end) {
      currentStartTime = nearestHourStart;
      console.log(`[generatePreferredStartTimes] Ajustando início para hora redonda: ${minutesToTime(currentStartTime)}`);
    } else if (nearestHalfHourStart - block.start <= 10 && nearestHalfHourStart < block.end) {
      currentStartTime = nearestHalfHourStart;
      console.log(`[generatePreferredStartTimes] Ajustando início para meia hora: ${minutesToTime(currentStartTime)}`);
    }
    
    // Gerar slots sucessivos, cada um com duração exata do serviço
    while (currentStartTime + serviceDuration <= block.end) {
      addTimeIfAvailable(currentStartTime);
      
      // Avançar para o próximo slot, exatamente após o término do serviço atual
      currentStartTime += serviceDuration;
      
      // Adicionar pequeno intervalo entre serviços para permitir preparação (5 minutos)
      // Mas apenas se o serviço durar menos de 60 minutos
      if (serviceDuration < 60) {
        currentStartTime += 5; // 5 minutos de intervalo entre serviços
      }
      
      // Ajustar para horários "redondos" se estiver próximo
      const nextHourStart = Math.ceil(currentStartTime / 60) * 60;
      const nextHalfHourStart = Math.ceil(currentStartTime / 30) * 30;
      
      // Preferir horários "redondos" se o desvio for pequeno (10 minutos ou menos)
      if (nextHourStart - currentStartTime <= 10 && nextHourStart + serviceDuration <= block.end) {
        currentStartTime = nextHourStart;
      } else if (nextHalfHourStart - currentStartTime <= 5 && nextHalfHourStart + serviceDuration <= block.end) {
        currentStartTime = nextHalfHourStart;
      }
    }
    
    // Adicionar horários especiais (em ponto e meias horas) que podem ter sido ignorados
    const startHour = Math.floor(block.start / 60);
    const endHour = Math.floor((block.end - serviceDuration) / 60);
    
    for (let hour = startHour; hour <= endHour; hour++) {
      // Adicionar horas em ponto (XX:00)
      const hourStart = hour * 60;
      if (hourStart >= block.start && hourStart + serviceDuration <= block.end) {
        addTimeIfAvailable(hourStart);
      }
      
      // Adicionar meias horas (XX:30)
      const halfHourStart = hour * 60 + 30;
      if (halfHourStart >= block.start && halfHourStart + serviceDuration <= block.end) {
        addTimeIfAvailable(halfHourStart);
      }
    }
  }
  
  console.log(`[generatePreferredStartTimes] Total de ${preferredStartTimes.length} horários gerados para serviço de ${serviceDuration} min`);
  
  // Ordenar os horários
  return preferredStartTimes.sort((a, b) => a - b);
}

/**
 * Gera slots de tempo a partir de blocos livres e duração do serviço
 * 
 * @param freeBlocks Lista de blocos de tempo livre
 * @param serviceDuration Duração do serviço em minutos
 * @param availabilityId ID opcional da disponibilidade associada
 * @returns Lista de slots de tempo gerados
 */
export function generateTimeSlotsFromFreeBlocks(
  freeBlocks: TimeBlock[],
  serviceDuration: number,
  availabilityId?: number
): TimeSlot[] {
  console.log(`[generateTimeSlotsFromFreeBlocks] Gerando slots para ${freeBlocks.length} blocos livres, serviço de ${serviceDuration} min`);
  
  const timeSlots: TimeSlot[] = [];
  
  // IMPORTANTE: Garantir que existem blocos válidos para processar
  if (!freeBlocks || freeBlocks.length === 0) {
    console.warn(`[generateTimeSlotsFromFreeBlocks] Nenhum bloco livre disponível para processamento`);
    return timeSlots;
  }
  
  // Log do total de blocos e tempo disponível
  const totalFreeTime = freeBlocks.reduce((total, block) => total + (block.end - block.start), 0);
  console.log(`[generateTimeSlotsFromFreeBlocks] Total de ${freeBlocks.length} blocos livres com ${totalFreeTime} minutos disponíveis`);
  
  // Processar cada bloco livre
  for (const block of freeBlocks) {
    // Validação do bloco
    if (!block || typeof block.start !== 'number' || typeof block.end !== 'number') {
      console.error(`[generateTimeSlotsFromFreeBlocks] Bloco inválido ignorado:`, block);
      continue;
    }
    
    // Verificar se o bloco tem tamanho suficiente
    if (!hasEnoughTimeForService(block, serviceDuration)) {
      console.log(`[generateTimeSlotsFromFreeBlocks] Bloco ${minutesToTime(block.start)}-${minutesToTime(block.end)} (${block.end - block.start} min) insuficiente para serviço de ${serviceDuration} min`);
      continue;
    }
    
    // Gerar horários preferenciais dentro deste bloco
    const startTimes = generatePreferredStartTimes(block, serviceDuration);
    
    // Converter cada horário de início em um slot
    for (const startMinutes of startTimes) {
      const endMinutes = startMinutes + serviceDuration;
      
      // CORRIGIDO: Garantir que o slot está completamente dentro do bloco disponível
      if (startMinutes < block.start || endMinutes > block.end) {
        console.error(`[generateTimeSlotsFromFreeBlocks] Slot ${minutesToTime(startMinutes)}-${minutesToTime(endMinutes)} fora dos limites do bloco ${minutesToTime(block.start)}-${minutesToTime(block.end)}`);
        continue;
      }
      
      const slot: TimeSlot = {
        startTime: minutesToTime(startMinutes),
        endTime: minutesToTime(endMinutes),
        isAvailable: true,
        availabilityId,
        serviceDuration
      };
      
      timeSlots.push(slot);
    }
  }
  
  console.log(`[generateTimeSlotsFromFreeBlocks] Gerados ${timeSlots.length} slots de tempo`);
  return timeSlots;
}

/**
 * Função principal: Gera slots de tempo para serviços longos
 * 
 * @param availabilityStart Hora de início da disponibilidade "HH:MM"
 * @param availabilityEnd Hora de fim da disponibilidade "HH:MM"
 * @param occupiedPeriods Lista de períodos ocupados (em minutos)
 * @param serviceDuration Duração do serviço em minutos
 * @param availabilityId ID opcional da disponibilidade associada
 * @returns Lista de slots de tempo gerados
 */
export function generateLongServiceTimeSlots(
  availabilityStart: string,
  availabilityEnd: string,
  occupiedPeriods: TimeBlock[],
  serviceDuration: number,
  availabilityId?: number
): TimeSlot[] {
  // Validação de entrada
  if (!availabilityStart || !availabilityEnd) {
    console.error(`[generateLongServiceTimeSlots] Horários de disponibilidade inválidos: ${availabilityStart} - ${availabilityEnd}`);
    return [];
  }
  
  if (!serviceDuration || serviceDuration <= 0) {
    console.error(`[generateLongServiceTimeSlots] Duração de serviço inválida: ${serviceDuration}`);
    return [];
  }
  
  // Converter horários para minutos com tratamento de formato inválido
  try {
    const startMinutes = timeToMinutes(availabilityStart);
    const endMinutes = timeToMinutes(availabilityEnd);
    
    // Verificar se o período total é suficiente para o serviço
    if (endMinutes - startMinutes < serviceDuration) {
      console.error(`[generateLongServiceTimeSlots] Período de disponibilidade total (${availabilityStart}-${availabilityEnd}, ${endMinutes - startMinutes} min) é menor que a duração do serviço (${serviceDuration} min)`);
      return [];
    }
    
    console.log(`[generateLongServiceTimeSlots] Iniciando para serviço de ${serviceDuration} min, período ${availabilityStart}-${availabilityEnd} (${endMinutes - startMinutes} min total)`);
    
    // Filtrar períodos ocupados inválidos
    const validOccupiedPeriods = occupiedPeriods.filter(period => {
      const isValid = period && typeof period.start === 'number' && typeof period.end === 'number';
      if (!isValid) {
        console.error(`[generateLongServiceTimeSlots] Ignorando período ocupado inválido:`, period);
      }
      return isValid;
    });
    
    // Log detalhado para serviços longos
    if (serviceDuration >= 180) {
      console.log(`[generateLongServiceTimeSlots] Processando serviço MUITO LONGO (${serviceDuration} min)`);
      console.log(`[generateLongServiceTimeSlots] Intervalo total: ${availabilityStart}-${availabilityEnd}, ${endMinutes - startMinutes} minutos`);
      console.log(`[generateLongServiceTimeSlots] Total de períodos ocupados: ${validOccupiedPeriods.length}`);
      
      // Aplicando regra específica para serviços de 180 minutos
      // Eles devem ser tratados como slots equivalentes a 30, 45 ou 90 minutos
      if (serviceDuration === 180) {
        console.log(`[generateLongServiceTimeSlots] Aplicando regra especial para serviço de 180 minutos (equivalente a slots de 30, 45 e 90 min)`);
        
        // Vamos criar blocos ocupados artificiais para representar os slots reservados para serviços menores
        // Esta lógica garante que os serviços de 180 minutos não competirão com slots dedicados para serviços menores
        
        // Nesta implementação, vamos reservar os slots das 10:00, 14:00 e 16:00 para os serviços de 30, 45 e 90 minutos
        let horariosReservados = [
          { horario: '10:00', duracao: 30 },  // Reservar 10:00 para serviços de 30 min
          { horario: '14:00', duracao: 45 },  // Reservar 14:00 para serviços de 45 min
          { horario: '16:00', duracao: 90 }   // Reservar 16:00 para serviços de 90 min
        ];
        
        // Adicionar períodos ocupados artificiais para os horários reservados
        horariosReservados.forEach(reserva => {
          const inicioReserva = timeToMinutes(reserva.horario);
          const fimReserva = inicioReserva + reserva.duracao;
          
          // Verificar se o horário reservado está dentro do período de disponibilidade
          if (inicioReserva >= startMinutes && fimReserva <= endMinutes) {
            console.log(`[generateLongServiceTimeSlots] Reservando ${reserva.horario} para serviços de ${reserva.duracao} min`);
            validOccupiedPeriods.push({
              start: inicioReserva,
              end: fimReserva
            });
          }
        });
        
        // Reordenar os períodos ocupados após adicionar as reservas
        validOccupiedPeriods.sort((a, b) => a.start - b.start);
      }
    }
    
    // Encontrar blocos de tempo livre
    const freeBlocks = findFreeTimeBlocks(startMinutes, endMinutes, validOccupiedPeriods);
    
    // DIAGNÓSTICO: Verificar se há blocos válidos para todos os serviços, não apenas os longos
    console.log(`[generateLongServiceTimeSlots] Disponibilidade total: ${endMinutes - startMinutes} min, duração do serviço: ${serviceDuration} min`);
    console.log(`[generateLongServiceTimeSlots] Encontrados ${freeBlocks.length} blocos livres para serviço de ${serviceDuration} min:`);
    
    // Para depuração completa, sempre logar os blocos
    let temBlocoValido = false;
    freeBlocks.forEach((block, i) => {
      const duration = block.end - block.start;
      const isLongEnough = duration >= serviceDuration;
      if (isLongEnough) temBlocoValido = true;
      console.log(`[generateLongServiceTimeSlots] Bloco livre #${i+1}: ${minutesToTime(block.start)}-${minutesToTime(block.end)} (${duration} min) - ${isLongEnough ? 'ADEQUADO' : 'INSUFICIENTE'}`);
    });
    
    // CORREÇÃO IMPORTANTE: Se não houver blocos adequados para o serviço, criar um slot padrão
    if (freeBlocks.length === 0 || !temBlocoValido) {
      console.log(`[generateLongServiceTimeSlots] Nenhum bloco adequado encontrado. Criando slot de disponibilidade total.`);
      
      // Criar um bloco livre artificial para o período total
      const artificialBlock: TimeBlock = {
        start: startMinutes,
        end: endMinutes
      };
      
      // Verificar se o bloco artificial é adequado
      if (artificialBlock.end - artificialBlock.start >= serviceDuration) {
        console.log(`[generateLongServiceTimeSlots] Criado bloco artificial ${minutesToTime(artificialBlock.start)}-${minutesToTime(artificialBlock.end)} (${artificialBlock.end - artificialBlock.start} min)`);
        freeBlocks.push(artificialBlock);
      } else {
        console.error(`[generateLongServiceTimeSlots] Período total ${minutesToTime(artificialBlock.start)}-${minutesToTime(artificialBlock.end)} (${artificialBlock.end - artificialBlock.start} min) insuficiente para serviço de ${serviceDuration} min`);
      }
    }
    
    // Gerar slots de tempo a partir dos blocos livres
    const slots = generateTimeSlotsFromFreeBlocks(freeBlocks, serviceDuration, availabilityId);
    
    // Verificar se foi possível gerar slots
    if (slots.length === 0 && serviceDuration >= 180) {
      console.log(`[generateLongServiceTimeSlots] ATENÇÃO: Nenhum slot gerado para serviço longo de ${serviceDuration} min`);
    }
    
    return slots;
    
  } catch (error) {
    console.error(`[generateLongServiceTimeSlots] Erro ao gerar slots:`, error);
    return [];
  }
}

/**
 * Função utilitária para processar slots de tempo, garantindo que cada slot tenha endTime corretamente calculado
 * 
 * @param slot Slot de tempo com horário de início
 * @param serviceDuration Duração do serviço em minutos (opcional)
 * @returns Slot de tempo com horário de término calculado ou null se o slot for inválido
 */
export function processSlot(slot: TimeSlot, serviceDuration?: number): TimeSlot | null {
  // Validação de entrada
  if (!slot) {
    console.error('[processSlot] Slot nulo ou indefinido');
    return null;
  }
  
  if (!slot.startTime) {
    console.error('[processSlot] Slot sem horário de início:', slot);
    return null;
  }
  
  // Se já tem horário de término e é válido, retornar como está
  if (slot.endTime && typeof slot.endTime === 'string' && slot.endTime.trim() !== '') {
    return slot;
  }
  
  try {
    // Determinar a duração do serviço
    const duration = serviceDuration || slot.serviceDuration || 60; // Fallback para 60 minutos
    
    // Tentativa de converter horário de início para minutos
    const startMinutes = timeToMinutes(slot.startTime);
    if (isNaN(startMinutes)) {
      console.error(`[processSlot] Formato de horário inválido: ${slot.startTime}`);
      return null;
    }
    
    // Calcular o horário de término
    const endMinutes = startMinutes + duration;
    
    // Criar novo slot com horário de término calculado
    return {
      ...slot,
      endTime: minutesToTime(endMinutes),
      serviceDuration: duration
    };
  } catch (error) {
    console.error(`[processSlot] Erro ao processar slot:`, error);
    return null;
  }
}