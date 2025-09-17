/**
 * Script para testar o endpoint POST /api/booking
 * e verificar se o código de validação está sendo gerado corretamente
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

// Forçar uso do servidor local para teste
const BASE_URL = 'http://localhost:5000';

/**
 * Função para fazer login e obter token JWT
 */
async function login() {
  try {
    console.log('🔐 Fazendo login...');
    
    const response = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@agendoai.com.br', // Usuário admin de emergência
        password: '123456' // Senha de teste
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Erro no login: ${data.error || response.statusText}`);
    }
    
    console.log('✅ Login realizado com sucesso');
    console.log('👤 Usuário:', data.user?.name || 'N/A');
    console.log('🎫 Token obtido');
    
    return data.token;
  } catch (error) {
    console.error('❌ Erro no login:', error.message);
    throw error;
  }
}

/**
 * Função para testar criação de agendamento
 */
async function testBookingCreation(token) {
  try {
    console.log('\n📅 Verificando slots disponíveis...');
    
    // Primeiro, verificar se há slots disponíveis para hoje
     const today = new Date();
     const tomorrow = new Date(today);
     tomorrow.setDate(tomorrow.getDate() + 1);
     const testDate = tomorrow.toISOString().split('T')[0]; // Formato YYYY-MM-DD
     
     const slotsResponse = await fetch(`${BASE_URL}/api/time-slots?providerId=1&date=${testDate}&serviceId=1`, {
       method: 'GET',
       headers: {
         'Content-Type': 'application/json'
       }
     });
     
     const slotsData = await slotsResponse.json();
     console.log(`📋 Slots disponíveis para ${testDate}:`, JSON.stringify(slotsData, null, 2));
    
    console.log('📅 Testando criação de agendamento...');
    
    // Usar a primeira slot disponível se houver, senão usar 10:00
    let startTime = '10:00';
    if (slotsData.timeSlots && slotsData.timeSlots.length > 0) {
      const availableSlot = slotsData.timeSlots.find(slot => slot.isAvailable);
      if (availableSlot) {
        startTime = availableSlot.startTime;
      }
    }
    
    const bookingData = {
      providerId: 1, // ID de um prestador de teste
      serviceId: 1,  // ID de um serviço de teste
      date: testDate, // Data futura
      startTime: startTime,
      paymentMethod: 'dinheiro', // Pagamento em dinheiro (não requer validação de pagamento)
      paymentStatus: 'pending',
      totalPrice: 50.00,
      serviceName: 'Teste de Serviço',
      clientName: 'Cliente Teste'
    };
    
    console.log('📋 Dados do agendamento:', bookingData);
    
    const response = await fetch(`${BASE_URL}/api/booking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(bookingData)
    });
    
    const responseText = await response.text();
    console.log('📤 Status da resposta:', response.status);
    console.log('📥 Resposta completa:', responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse da resposta JSON:', parseError.message);
      console.log('📄 Resposta raw:', responseText);
      return null;
    }
    
    if (!response.ok) {
      console.error('❌ Erro na criação do agendamento:');
      console.error('   Status:', response.status);
      console.error('   Erro:', data.error || 'Erro desconhecido');
      return null;
    }
    
    console.log('✅ Agendamento criado com sucesso!');
    console.log('🆔 ID do agendamento:', data.appointmentId);
    console.log('💬 Mensagem:', data.message);
    
    return data.appointmentId;
  } catch (error) {
    console.error('❌ Erro ao testar criação de agendamento:', error.message);
    return null;
  }
}

/**
 * Função para verificar se o código de validação foi gerado
 */
async function checkValidationCode(appointmentId, token) {
  try {
    console.log('\n🔍 Verificando código de validação...');
    
    const response = await fetch(`${BASE_URL}/api/appointments/${appointmentId}/validation-code`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ Erro ao buscar código de validação:', data.error);
      return false;
    }
    
    console.log('✅ Código de validação encontrado!');
    console.log('🔐 Código:', data.validationCode);
    console.log('🆔 ID do agendamento:', data.appointmentId);
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao verificar código de validação:', error.message);
    return false;
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando teste do endpoint de agendamento...');
    console.log('🌐 URL base:', BASE_URL);
    
    // 1. Fazer login
    const token = await login();
    
    // 2. Testar criação de agendamento
    const appointmentId = await testBookingCreation(token);
    
    if (appointmentId) {
      // 3. Verificar código de validação
      const hasValidationCode = await checkValidationCode(appointmentId, token);
      
      if (hasValidationCode) {
        console.log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!');
        console.log('✅ Endpoint POST /api/booking está funcionando');
        console.log('✅ Código de validação está sendo gerado corretamente');
      } else {
        console.log('\n⚠️  TESTE PARCIALMENTE CONCLUÍDO');
        console.log('✅ Endpoint POST /api/booking está funcionando');
        console.log('❌ Código de validação NÃO foi gerado ou não está acessível');
      }
    } else {
      console.log('\n❌ TESTE FALHOU');
      console.log('❌ Endpoint POST /api/booking NÃO está funcionando');
    }
    
  } catch (error) {
    console.error('\n💥 ERRO CRÍTICO NO TESTE:', error.message);
    process.exit(1);
  }
}

// Executar teste
main();