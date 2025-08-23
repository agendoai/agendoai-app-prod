#!/usr/bin/env node

import fetch from 'node-fetch';

// Simular o comportamento do localStorage em produção
const testLocalStorage = () => {
  console.log('🧪 Testando localStorage em produção...');
  
  // Simular o que acontece no frontend
  const mockLocalStorage = {
    data: {},
    getItem(key) {
      console.log(`🔍 localStorage.getItem("${key}")`);
      const value = this.data[key];
      console.log(`   Resultado: ${value ? 'ENCONTRADO' : 'NÃO ENCONTRADO'}`);
      if (value) {
        console.log(`   Valor: ${value.substring(0, 50)}...`);
      }
      return value;
    },
    setItem(key, value) {
      console.log(`💾 localStorage.setItem("${key}", "${value.substring(0, 50)}...")`);
      this.data[key] = value;
      console.log(`   ✅ Valor salvo com sucesso`);
      console.log(`   🔍 Verificando se foi salvo: ${this.data[key] ? 'SIM' : 'NÃO'}`);
    },
    removeItem(key) {
      console.log(`🗑️ localStorage.removeItem("${key}")`);
      delete this.data[key];
      console.log(`   ✅ Valor removido com sucesso`);
    }
  };

  // Simular o processo de login
  console.log('\n📝 Simulando processo de login...');
  
  // 1. Tentar pegar token existente
  const existingToken = mockLocalStorage.getItem('authToken');
  
  // 2. Simular resposta de login
  const loginResponse = {
    user: {
      id: 3,
      email: "rauanconceicao75@gmail.com",
      name: "Carlos Andre",
      userType: "client"
    },
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiZW1haWwiOiJyYXVhbmNvbmNlaWNhbzc1QGdtYWlsLmNvbSIsInVzZXJUeXBlIjoiY2xpZW50IiwibmFtZSI6IkNhcmxvcyBBbmRyZSIsImlhdCI6MTc1NTk2MDQ3NywiZXhwIjoxNzU2NTY1Mjc3fQ.1WtFwSgSsLXp9cGyYQ9YUvGU51MUin0-3UoxkoQtQQs"
  };
  
  // 3. Salvar token
  if (loginResponse.token) {
    mockLocalStorage.setItem('authToken', loginResponse.token);
  }
  
  // 4. Verificar se foi salvo
  const savedToken = mockLocalStorage.getItem('authToken');
  
  console.log('\n📊 Resultado do teste:');
  console.log(`   Token inicial: ${existingToken ? 'EXISTIA' : 'NÃO EXISTIA'}`);
  console.log(`   Token após login: ${savedToken ? 'SALVO' : 'NÃO SALVO'}`);
  console.log(`   Token válido: ${savedToken === loginResponse.token ? 'SIM' : 'NÃO'}`);
  
  return {
    success: savedToken === loginResponse.token,
    token: savedToken
  };
};

// Testar com fetch real para verificar se o problema é no localStorage ou na API
const testApiCall = async () => {
  console.log('\n🌐 Testando chamada real para a API...');
  
  try {
    const response = await fetch('https://app.tbsnet.com.br/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'rauanconceicao75@gmail.com',
        password: '123456'
      })
    });
    
    console.log(`📡 Status da resposta: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Resposta da API:');
      console.log(`   User: ${data.user ? 'PRESENTE' : 'AUSENTE'}`);
      console.log(`   Token: ${data.token ? 'PRESENTE' : 'AUSENTE'}`);
      console.log(`   Token length: ${data.token ? data.token.length : 0}`);
      
      return data;
    } else {
      console.log('❌ Erro na API:', response.statusText);
      return null;
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error.message);
    return null;
  }
};

// Executar testes
const runTests = async () => {
  console.log('🚀 Iniciando testes de localStorage e API...\n');
  
  // Teste 1: localStorage
  const localStorageResult = testLocalStorage();
  
  // Teste 2: API real
  const apiResult = await testApiCall();
  
  console.log('\n📋 Resumo dos testes:');
  console.log(`   localStorage: ${localStorageResult.success ? '✅ FUNCIONANDO' : '❌ PROBLEMA'}`);
  console.log(`   API: ${apiResult ? '✅ FUNCIONANDO' : '❌ PROBLEMA'}`);
  
  if (apiResult && !localStorageResult.success) {
    console.log('\n🔍 DIAGNÓSTICO: O problema está no localStorage do frontend');
    console.log('   Possíveis causas:');
    console.log('   1. localStorage não disponível em produção');
    console.log('   2. Política de segurança do navegador');
    console.log('   3. Modo incógnito ou privado');
    console.log('   4. Cookies/Storage bloqueados');
  } else if (!apiResult) {
    console.log('\n🔍 DIAGNÓSTICO: O problema está na API');
  } else {
    console.log('\n🔍 DIAGNÓSTICO: Ambos funcionando, problema pode estar na integração');
  }
};

runTests().catch(console.error);
