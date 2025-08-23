#!/usr/bin/env node

import fetch from 'node-fetch';

const testHttpsAuth = async () => {
  console.log('🔒 Testando autenticação em HTTPS...\n');
  
  // Testar login
  try {
    console.log('📤 Fazendo login...');
    const loginResponse = await fetch('https://app.tbsnet.com.br/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'rauanconceicao75@gmail.com',
        password: '123456'
      })
    });
    
    console.log(`📡 Status do login: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login bem-sucedido!');
      console.log(`   User ID: ${loginData.user?.id}`);
      console.log(`   User Type: ${loginData.user?.userType}`);
      console.log(`   Token: ${loginData.token ? 'PRESENTE' : 'AUSENTE'}`);
      console.log(`   Token length: ${loginData.token ? loginData.token.length : 0}`);
      
      if (loginData.token) {
        // Testar requisição autenticada
        console.log('\n🔐 Testando requisição autenticada...');
        const authResponse = await fetch('https://app.tbsnet.com.br/api/user', {
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json',
          }
        });
        
        console.log(`📡 Status da requisição autenticada: ${authResponse.status}`);
        
        if (authResponse.ok) {
          const userData = await authResponse.json();
          console.log('✅ Requisição autenticada bem-sucedida!');
          console.log(`   User ID: ${userData.id}`);
          console.log(`   Email: ${userData.email}`);
        } else {
          console.log('❌ Requisição autenticada falhou');
          const errorData = await authResponse.text();
          console.log(`   Erro: ${errorData}`);
        }
      }
      
      return loginData;
    } else {
      const errorData = await loginResponse.json().catch(() => ({}));
      console.log('❌ Login falhou');
      console.log(`   Erro: ${errorData.message || loginResponse.statusText}`);
      return null;
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error.message);
    return null;
  }
};

const testCorsHeaders = async () => {
  console.log('\n🌐 Testando headers CORS...');
  
  try {
    const response = await fetch('https://app.tbsnet.com.br/api/login', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://agendoai-app-prod-6qoh.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      }
    });
    
    console.log(`📡 Status OPTIONS: ${response.status}`);
    console.log('📋 Headers CORS:');
    console.log(`   Access-Control-Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`   Access-Control-Allow-Methods: ${response.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`   Access-Control-Allow-Headers: ${response.headers.get('Access-Control-Allow-Headers')}`);
    console.log(`   Access-Control-Allow-Credentials: ${response.headers.get('Access-Control-Allow-Credentials')}`);
    
  } catch (error) {
    console.log('❌ Erro no teste CORS:', error.message);
  }
};

const main = async () => {
  console.log('🚀 Iniciando teste de autenticação HTTPS...\n');
  
  // 1. Testar CORS
  await testCorsHeaders();
  
  // 2. Testar login
  const loginResult = await testHttpsAuth();
  
  console.log('\n📋 Resumo do teste HTTPS:');
  
  if (loginResult && loginResult.token) {
    console.log('✅ LOGIN FUNCIONOU EM HTTPS');
    console.log('🔍 O problema está no frontend:');
    console.log('   1. localStorage não disponível em HTTPS');
    console.log('   2. Política de segurança do navegador');
    console.log('   3. Service Worker interferindo');
    console.log('   4. CORS mal configurado');
    
    console.log('\n💡 SOLUÇÕES IMPLEMENTADAS:');
    console.log('   1. Fallback para sessionStorage');
    console.log('   2. Fallback para cookies');
    console.log('   3. Logs detalhados para debug');
    console.log('   4. Verificação de protocolo HTTPS');
  } else {
    console.log('❌ LOGIN NÃO FUNCIONOU EM HTTPS');
    console.log('🔍 O problema está no backend:');
    console.log('   1. CORS mal configurado');
    console.log('   2. SSL/TLS mal configurado');
    console.log('   3. Headers de segurança');
  }
};

main().catch(console.error);
