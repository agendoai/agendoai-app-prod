// Script para verificar diretamente no banco de dados
import { storage } from './server/storage.ts';

async function checkDatabase() {
  try {
    console.log('🔍 Verificando banco de dados...');
    
    // Verificar agendamentos para o providerId 2 no dia 16/09/2025
    console.log('\n📅 Buscando agendamentos para providerId=2, data=2025-09-16...');
    
    try {
      const appointments = await storage.getProviderAppointmentsByDate(2, '2025-09-16');
      console.log(`📊 Agendamentos encontrados: ${appointments.length}`);
      
      if (appointments.length > 0) {
        console.log('📋 Detalhes dos agendamentos:');
        appointments.forEach((apt, index) => {
          console.log(`  ${index + 1}. ${apt.startTime} - ${apt.endTime} (Status: ${apt.status})`);
        });
      }
    } catch (error) {
      console.log('❌ Erro ao buscar agendamentos:', error.message);
    }
    
    // Verificar bloqueios de horário
    console.log('\n🚫 Buscando bloqueios de horário para providerId=2, data=2025-09-16...');
    
    try {
      const blockedSlots = await storage.getBlockedTimeSlots(2, '2025-09-16');
      console.log(`📊 Bloqueios encontrados: ${blockedSlots.length}`);
      
      if (blockedSlots.length > 0) {
        console.log('📋 Detalhes dos bloqueios:');
        blockedSlots.forEach((block, index) => {
          console.log(`  ${index + 1}. ${block.startTime} - ${block.endTime} (Motivo: ${block.reason || 'N/A'})`);
        });
      }
    } catch (error) {
      console.log('❌ Erro ao buscar bloqueios:', error.message);
    }
    
    // Verificar disponibilidade do provedor
    console.log('\n⏰ Verificando disponibilidade do provedor...');
    
    try {
      const availability = await storage.getProviderAvailability(2);
      console.log(`📊 Disponibilidades encontradas: ${availability.length}`);
      
      if (availability.length > 0) {
        console.log('📋 Detalhes das disponibilidades:');
        availability.forEach((avail, index) => {
          console.log(`  ${index + 1}. Dia ${avail.dayOfWeek}: ${avail.startTime} - ${avail.endTime} (Ativo: ${avail.isAvailable})`);
        });
      }
    } catch (error) {
      console.log('❌ Erro ao buscar disponibilidade:', error.message);
    }
    
    // Verificar qual dia da semana é 16/09/2025
    const date = new Date('2025-09-16');
    const dayOfWeek = date.getDay(); // 0 = domingo, 1 = segunda, etc.
    console.log(`\n📅 16/09/2025 é um ${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][dayOfWeek]} (dayOfWeek: ${dayOfWeek})`);
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkDatabase();