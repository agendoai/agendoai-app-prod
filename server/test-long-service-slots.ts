/**
 * Script de teste para geração de slots de tempo para serviços longos
 * 
 * Este script testa diretamente as funções do algoritmo avançado de geração de slots
 * para verificar o comportamento com serviços de longa duração.
 */

import * as AdvancedSlotGenerator from './advanced-slot-generator';
import { createLogger } from './logger';

const logger = createLogger('TestLongServiceSlots');

// Função para testar a geração de slots com diversos casos de teste
async function testLongServiceSlotGeneration() {
  logger.info('Iniciando testes de geração de slots para serviços longos');

  // Caso 1: Dia inteiro livre, serviço de 180 minutos (3 horas)
  testCase(
    'Caso 1: Dia inteiro livre, serviço de 3 horas',
    '08:00',
    '18:00',
    [],
    180
  );

  // Caso 2: Um agendamento existente no meio do dia
  testCase(
    'Caso 2: Um agendamento existente no meio do dia (12:00-13:00)',
    '08:00',
    '18:00',
    [
      { start: AdvancedSlotGenerator.timeToMinutes('12:00'), end: AdvancedSlotGenerator.timeToMinutes('13:00') }
    ],
    180
  );

  // Caso 3: Múltiplos agendamentos ao longo do dia
  testCase(
    'Caso 3: Múltiplos agendamentos ao longo do dia',
    '08:00',
    '18:00',
    [
      { start: AdvancedSlotGenerator.timeToMinutes('09:30'), end: AdvancedSlotGenerator.timeToMinutes('10:30') },
      { start: AdvancedSlotGenerator.timeToMinutes('13:00'), end: AdvancedSlotGenerator.timeToMinutes('14:30') },
      { start: AdvancedSlotGenerator.timeToMinutes('16:00'), end: AdvancedSlotGenerator.timeToMinutes('16:30') }
    ],
    180
  );

  // Caso 4: Dia quase todo ocupado, apenas um espaço no início
  testCase(
    'Caso 4: Apenas um espaço livre de 3 horas no início do dia',
    '08:00',
    '18:00',
    [
      { start: AdvancedSlotGenerator.timeToMinutes('11:00'), end: AdvancedSlotGenerator.timeToMinutes('18:00') }
    ],
    180
  );

  // Caso 5: Dia quase todo ocupado, apenas um espaço no final
  testCase(
    'Caso 5: Apenas um espaço livre de 3 horas no final do dia',
    '08:00',
    '18:00',
    [
      { start: AdvancedSlotGenerator.timeToMinutes('08:00'), end: AdvancedSlotGenerator.timeToMinutes('15:00') }
    ],
    180
  );

  // Caso 6: Espaço livre fragmentado (não deve gerar slots se não houver espaço suficiente)
  testCase(
    'Caso 6: Espaços livres fragmentados (nenhum suficiente para 3 horas)',
    '08:00',
    '18:00',
    [
      { start: AdvancedSlotGenerator.timeToMinutes('08:00'), end: AdvancedSlotGenerator.timeToMinutes('10:00') },
      { start: AdvancedSlotGenerator.timeToMinutes('11:00'), end: AdvancedSlotGenerator.timeToMinutes('13:00') },
      { start: AdvancedSlotGenerator.timeToMinutes('14:00'), end: AdvancedSlotGenerator.timeToMinutes('16:00') },
      { start: AdvancedSlotGenerator.timeToMinutes('17:00'), end: AdvancedSlotGenerator.timeToMinutes('18:00') }
    ],
    180
  );

  // Caso 7: Dia sem disponibilidade suficiente
  testCase(
    'Caso 7: Disponibilidade insuficiente para o serviço (apenas 2 horas)',
    '08:00',
    '10:00',
    [],
    180
  );

  // Caso 8: Blocos exatamente do tamanho necessário
  testCase(
    'Caso 8: Blocos exatamente do tamanho necessário (3 horas)',
    '08:00',
    '18:00',
    [
      { start: AdvancedSlotGenerator.timeToMinutes('08:00'), end: AdvancedSlotGenerator.timeToMinutes('11:00') },
      { start: AdvancedSlotGenerator.timeToMinutes('14:00'), end: AdvancedSlotGenerator.timeToMinutes('17:00') }
    ],
    180
  );

  // Caso 9: Serviço extremamente longo (6 horas)
  testCase(
    'Caso 9: Serviço extremamente longo (6 horas)',
    '08:00',
    '18:00',
    [
      { start: AdvancedSlotGenerator.timeToMinutes('12:00'), end: AdvancedSlotGenerator.timeToMinutes('13:00') }
    ],
    360
  );

  logger.info('Testes de geração de slots concluídos');
}

// Função auxiliar para testar um caso específico
function testCase(
  caseName: string,
  startTime: string,
  endTime: string,
  occupiedPeriods: Array<{ start: number, end: number }>,
  serviceDuration: number
) {
  logger.info(`\n--- ${caseName} ---`);
  logger.info(`Horário disponível: ${startTime} - ${endTime}, Duração do serviço: ${serviceDuration} minutos`);
  
  // Gerar slots de tempo usando o algoritmo avançado
  const slots = AdvancedSlotGenerator.generateLongServiceTimeSlots(
    startTime,
    endTime,
    occupiedPeriods,
    serviceDuration
  );
  
  // Exibir resultados
  logger.info(`Períodos ocupados: ${occupiedPeriods.map(p => 
    `${AdvancedSlotGenerator.minutesToTime(p.start)}-${AdvancedSlotGenerator.minutesToTime(p.end)}`).join(', ')}`);
  logger.info(`Total de slots gerados: ${slots.length}`);
  
  if (slots.length > 0) {
    logger.info('Primeiros 5 slots gerados:');
    slots.slice(0, 5).forEach((slot, index) => {
      logger.info(`  ${index + 1}. ${slot.startTime} - ${slot.endTime}`);
    });
    
    if (slots.length > 5) {
      logger.info(`  ... e mais ${slots.length - 5} slots`);
    }
  } else {
    logger.info('Nenhum slot de tempo disponível para este caso.');
  }
}

// Executar os testes
testLongServiceSlotGeneration()
  .then(() => {
    console.log('Testes de slots para serviços longos concluídos com sucesso.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erro ao executar testes:', error);
    process.exit(1);
  });