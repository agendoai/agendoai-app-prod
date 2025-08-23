#!/usr/bin/env node

import fetch from 'node-fetch';

const testResponseStructure = async () => {
  console.log('🧪 Testando estrutura da resposta da API...\n');
  
  try {
    console.log('📤 Fazendo login...');
    const response = await fetch('https://app.tbsnet.com.br/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'rauanconceicao75@gmail.com',
        password: 'Carlos123'
      })
    });
    
    console.log(`📡 Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      
      console.log('\n📋 ESTRUTURA DA RESPOSTA:');
      console.log('🔍 Tipo da resposta:', typeof data);
      console.log('🔍 É um objeto?', typeof data === 'object');
      console.log('🔍 É um array?', Array.isArray(data));
      console.log('🔍 Chaves da resposta:', Object.keys(data || {}));
      
      console.log('\n📋 DADOS ESPECÍFICOS:');
      console.log('🔍 data.user existe?', !!data.user);
      console.log('🔍 data.token existe?', !!data.token);
      console.log('🔍 data.userType existe?', !!data.userType);
      
      if (data.user) {
        console.log('🔍 data.user.id:', data.user.id);
        console.log('🔍 data.user.email:', data.user.email);
        console.log('🔍 data.user.userType:', data.user.userType);
      }
      
      if (data.token) {
        console.log('🔍 data.token length:', data.token.length);
        console.log('🔍 data.token preview:', data.token.substring(0, 50) + '...');
      }
      
      console.log('\n📋 RESPOSTA COMPLETA:');
      console.log(JSON.stringify(data, null, 2));
      
      // Simular o que o frontend faria
      console.log('\n🧪 SIMULANDO FRONTEND:');
      console.log('🔍 if (data && data.token):', !!(data && data.token));
      console.log('🔍 if (response && response.token):', !!(response && response.token));
      
      if (data && data.token) {
        console.log('✅ Condição do frontend seria TRUE');
        console.log('🔑 Token seria salvo');
      } else {
        console.log('❌ Condição do frontend seria FALSE');
        console.log('🔍 data existe?', !!data);
        console.log('🔍 data.token existe?', !!data?.token);
      }
      
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Login falhou');
      console.log(`   Erro: ${errorData.message || response.statusText}`);
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error.message);
  }
};

testResponseStructure().catch(console.error);
