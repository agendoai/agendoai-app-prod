/**
 * Testes para o gerador de slots de tempo
 */

import { generateAvailableTimeSlots, prioritizeTimeSlots } from './time-slot-generator';

/**
 * Função auxiliar para exibir os resultados de teste de forma amigável
 */
function printTestResults(testName: string, result: { start: string, end: string }[], expected: { start: string, end: string }[]) {
  console.log(`\n==== ${testName} ====`);
  console.log('Resultado:');
  result.forEach(slot => console.log(`  ${slot.start} - ${slot.end}`));
  
  console.log('\nEsperado:');
  expected.forEach(slot => console.log(`  ${slot.start} - ${slot.end}`));
  
  const success = expected.length === result.length && 
    expected.every((exp, i) => exp.start === result[i].start && exp.end === result[i].end);
  
  console.log(`\nResultado: ${success ? 'PASSOU ✅' : 'FALHOU ❌'}`);
  
  if (!success) {
    // Encontrar o que está faltando ou diferente
    const missingSlotsFromExpected = expected.filter(exp => 
      !result.some(res => res.start === exp.start && res.end === exp.end)
    );
    
    const extraSlotsInResult = result.filter(res => 
      !expected.some(exp => exp.start === res.start && exp.end === res.end)
    );
    
    if (missingSlotsFromExpected.length > 0) {
      console.log('\nSlots esperados que faltaram:');
      missingSlotsFromExpected.forEach(slot => console.log(`  ${slot.start} - ${slot.end}`));
    }
    
    if (extraSlotsInResult.length > 0) {
      console.log('\nSlots extras não esperados:');
      extraSlotsInResult.forEach(slot => console.log(`  ${slot.start} - ${slot.end}`));
    }
  }
  
  return success;
}

// Teste 1: Cenário da descrição do problema
function testBasicScenario() {
  const workingHours = { start: "08:00", end: "18:00" };
  const lunchBreak = { start: "12:00", end: "13:00" };
  const appointments = [
    { startTime: "09:00", duration: 60 },
    { startTime: "13:30", duration: 90 }
  ];
  
  const serviceDuration = 90;
  
  console.log('\n\n=== TESTE DE CENÁRIO BÁSICO ===');
  console.log('Horário de trabalho:', workingHours);
  console.log('Almoço:', lunchBreak);
  console.log('Agendamentos:', appointments);
  console.log('Duração do serviço:', serviceDuration, 'minutos');
  
  const result = generateAvailableTimeSlots(
    workingHours,
    lunchBreak,
    appointments,
    serviceDuration
  );
  
  console.log('Resultado completo:', result.map(s => `${s.start}-${s.end}`).join(', '));
  
  // Extrair apenas os slots que começam nas horas e meias horas
  const hourAndHalfHourSlots = result.filter(slot => {
    const minutes = parseInt(slot.start.split(':')[1]);
    return minutes === 0 || minutes === 30;
  });
  
  // Neste cenário básico, com agendamentos às 09:00 (60min) e 13:30 (90min)
  // e com horário de almoço (12:00-13:00), os slots disponíveis de hora e meia hora são:
  const expected = [
    { start: "10:00", end: "11:30" }, // Após o primeiro agendamento
    { start: "10:30", end: "12:00" }, // Antes do almoço
    { start: "15:00", end: "16:30" }, // Após o segundo agendamento
    { start: "15:30", end: "17:00" },
    { start: "16:00", end: "17:30" },
    { start: "16:30", end: "18:00" }
  ];
  
  return printTestResults('Cenário Básico', hourAndHalfHourSlots, expected);
}

// Teste 2: Dia completamente livre
function testCompletelyFreeDay() {
  const workingHours = { start: "09:00", end: "17:00" };
  const lunchBreak = null; // Sem horário de almoço
  const appointments = []; // Sem agendamentos
  
  const serviceDuration = 60;
  
  const result = generateAvailableTimeSlots(
    workingHours,
    lunchBreak,
    appointments,
    serviceDuration
  );
  
  // Para simplificar o teste, vamos verificar apenas os slots de hora exata
  const wholeHourSlots = result.filter(slot => {
    const minutes = parseInt(slot.start.split(':')[1]);
    return minutes === 0;
  });
  
  const expected = [
    { start: "09:00", end: "10:00" },
    { start: "10:00", end: "11:00" },
    { start: "11:00", end: "12:00" },
    { start: "12:00", end: "13:00" },
    { start: "13:00", end: "14:00" },
    { start: "14:00", end: "15:00" },
    { start: "15:00", end: "16:00" },
    { start: "16:00", end: "17:00" }
  ];
  
  return printTestResults('Dia Completamente Livre', wholeHourSlots, expected);
}

// Teste 3: Dia com múltiplos agendamentos
function testMultipleAppointments() {
  const workingHours = { start: "08:00", end: "18:00" };
  const lunchBreak = { start: "12:00", end: "13:00" };
  const appointments = [
    { startTime: "08:30", duration: 60 },
    { startTime: "10:00", duration: 30 },
    { startTime: "13:00", duration: 120 },
    { startTime: "16:00", duration: 60 }
  ];
  
  const serviceDuration = 60;
  
  console.log('\n\n=== TESTE DE MÚLTIPLOS AGENDAMENTOS ===');
  console.log('Horário de trabalho:', workingHours);
  console.log('Almoço:', lunchBreak);
  console.log('Agendamentos:', appointments.map(a => `${a.startTime} (${a.duration} min)`));
  console.log('Duração do serviço:', serviceDuration, 'minutos');
  
  const result = generateAvailableTimeSlots(
    workingHours,
    lunchBreak,
    appointments,
    serviceDuration
  );
  
  console.log('Resultado completo:', result.map(s => `${s.start}-${s.end}`).join(', '));
  
  // Para simplificar, vamos considerar apenas os slots que começam em hora ou meia hora
  const cleanSlots = result.filter(slot => {
    const minutes = parseInt(slot.start.split(':')[1]);
    return minutes === 0 || minutes === 30;
  });
  
  // Slots esperados considerando todas as restrições (horários em hora ou meia hora):
  // Os testes mostraram que, devido à duração mínima de 60 minutos,
  // alguns slots foram ignorados por serem muito curtos:
  // - 08:00-08:30 (muito curto, 30 minutos)  
  // - 09:30-10:00 (muito curto, 30 minutos)
  // Slots viáveis:
  // 1. 10:30-11:30 (após o segundo agendamento)
  // 2. 11:00-12:00 (antes do almoço)
  // 3. 15:00-16:00 (após o terceiro agendamento, antes do quarto)
  // 4. 17:00-18:00 (após o quarto agendamento)
  const expected = [
    { start: "10:30", end: "11:30" },
    { start: "11:00", end: "12:00" },
    { start: "15:00", end: "16:00" },
    { start: "17:00", end: "18:00" }
  ];
  
  return printTestResults('Múltiplos Agendamentos', cleanSlots, expected);
}

// Teste 4: Serviço longo
function testLongServiceDuration() {
  const workingHours = { start: "08:00", end: "18:00" };
  const lunchBreak = { start: "12:00", end: "13:00" };
  const appointments = [
    { startTime: "09:00", duration: 60 },
    { startTime: "14:00", duration: 60 }
  ];
  
  const serviceDuration = 180; // 3 horas
  
  console.log('\n\n=== TESTE DE SERVIÇO LONGO (3 HORAS) ===');
  console.log('Horário de trabalho:', workingHours);
  console.log('Almoço:', lunchBreak);
  console.log('Agendamentos:', appointments.map(a => `${a.startTime} (${a.duration} min)`));
  console.log('Duração do serviço:', serviceDuration, 'minutos');
  
  const result = generateAvailableTimeSlots(
    workingHours,
    lunchBreak,
    appointments,
    serviceDuration
  );
  
  console.log('Resultado completo:', result.map(s => `${s.start}-${s.end}`).join(', '));
  
  // Para este teste, devemos ter poucos slots devido à longa duração (3 horas)
  // Com 3 horas, e considerando o horário de almoço e os agendamentos:
  // - Como o slot 08:00-11:00 se sobrepõe ao agendamento às 09:00, ele não é viável
  // - Tarde: 15:00-18:00 (período disponível após o segundo agendamento 14:00-15:00) 
  const expected = [
    { start: "15:00", end: "18:00" }
  ];
  
  return printTestResults('Serviço Longo (3 horas)', result, expected);
}

// Teste 5: Verificar a priorização de horários
function testPrioritization() {
  const slots = [
    { start: "08:35", end: "09:20" },
    { start: "08:30", end: "09:15" },
    { start: "08:00", end: "08:45" },
    { start: "08:15", end: "09:00" },
    { start: "08:05", end: "08:50" },
    { start: "08:45", end: "09:30" }
  ];
  
  const result = prioritizeTimeSlots(slots);
  
  const expected = [
    { start: "08:00", end: "08:45" },  // Hora exata (prioridade 1)
    { start: "08:30", end: "09:15" },  // Meia hora (prioridade 2)
    { start: "08:15", end: "09:00" },  // Quarto de hora (prioridade 3)
    { start: "08:45", end: "09:30" },  // Quarto de hora (prioridade 3)
    { start: "08:05", end: "08:50" },  // Múltiplo de 5 (prioridade 4)
    { start: "08:35", end: "09:20" }   // Múltiplo de 5 (prioridade 4)
  ];
  
  return printTestResults('Priorização de Horários', result, expected);
}

// Executar todos os testes
console.log("\n=== INICIANDO TESTES DO GERADOR DE SLOTS DE TEMPO ===\n");

testBasicScenario();
testCompletelyFreeDay();
testMultipleAppointments();
testLongServiceDuration();
testPrioritization();

console.log("\n=== TESTES CONCLUÍDOS ===\n");