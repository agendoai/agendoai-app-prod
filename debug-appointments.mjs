// Debug específico para entender por que o slot das 17:00 não está disponível

const API_BASE = 'http://localhost:5000';

async function debugSpecificSlot() {
  try {
    console.log('🔍 Analisando slot específico das 17:00...');
    
    // Primeiro, vamos ver todos os slots gerados (incluindo indisponíveis)
    const url = `${API_BASE}/api/time-slots/available?providerId=2&date=2025-09-16&serviceId=2`;
    console.log(`📡 Fazendo requisição para: ${url}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log('📊 Resposta da API:');
    console.log(JSON.stringify(data, null, 2));
    
    // Agora vamos tentar acessar diretamente o storage para ver os slots antes da filtragem
    console.log('\n🔍 Testando com data futura para ver se gera slots...');
    
    const futureUrl = `${API_BASE}/api/time-slots/available?providerId=2&date=2025-09-17&serviceId=2`;
    console.log(`📡 Fazendo requisição para: ${futureUrl}`);
    
    const futureResponse = await fetch(futureUrl);
    const futureData = await futureResponse.json();
    
    console.log('📊 Resposta para data futura:');
    console.log(JSON.stringify(futureData, null, 2));
    
    // Testar com horário mais tarde no dia atual
    console.log('\n🔍 Testando com providerId diferente...');
    
    const provider1Url = `${API_BASE}/api/time-slots/available?providerId=1&date=2025-09-16&serviceId=2`;
    console.log(`📡 Fazendo requisição para: ${provider1Url}`);
    
    try {
      const provider1Response = await fetch(provider1Url);
      const provider1Data = await provider1Response.json();
      
      console.log('📊 Resposta para providerId=1:');
      console.log(JSON.stringify(provider1Data, null, 2));
    } catch (error) {
      console.log('❌ Erro ao testar providerId=1:', error.message);
    }
    
    console.log('\n⚠️  ANÁLISE DETALHADA:');
    console.log(`- Slots hoje (16/09): ${data.totalSlots} total, ${data.availableSlots} disponíveis`);
    console.log(`- Slots amanhã (17/09): ${futureData.totalSlots} total, ${futureData.availableSlots} disponíveis`);
    
    if (data.totalSlots === 1 && data.availableSlots === 0) {
      console.log('\n🎯 PROBLEMA IDENTIFICADO:');
      console.log('- Há 1 slot sendo gerado (provavelmente 17:00)');
      console.log('- Mas ele está sendo marcado como isAvailable: false');
      console.log('- Possíveis causas:');
      console.log('  1. Há um agendamento às 17:00');
      console.log('  2. Há um bloqueio de horário às 17:00');
      console.log('  3. Bug na lógica de verificação de conflitos');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

debugSpecificSlot();