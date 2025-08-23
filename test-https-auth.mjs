#!/usr/bin/env node

/**
 * Script para testar autenticação HTTPS
 */

const API_BASE_URL = 'https://app.tbsnet.com.br';

async function testHTTPSAuth() {
  console.log('🔍 Testando autenticação HTTPS...');
  console.log('🌐 API URL:', API_BASE_URL);
  
  try {
    // 1. Testar login HTTPS
    console.log('\n📤 1. Testando login HTTPS...');
    const loginResponse = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://agendoai-app-prod-6qoh.vercel.app'
      },
      body: JSON.stringify({
        email: 'admin@agendoai.com.br',
        password: '123456'
      })
    });
    
    console.log('📥 Status do login HTTPS:', loginResponse.status);
    console.log('📥 Headers do login HTTPS:', Object.fromEntries(loginResponse.headers.entries()));
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('❌ Erro no login HTTPS:', errorText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login HTTPS bem-sucedido');
    console.log('🔑 Token recebido:', loginData.token ? 'SIM' : 'NÃO');
    
    if (!loginData.token) {
      console.error('❌ Nenhum token recebido no login HTTPS');
      return;
    }
    
    // 2. Testar /api/user com token HTTPS
    console.log('\n📤 2. Testando /api/user com token HTTPS...');
    const userResponse = await fetch(`${API_BASE_URL}/api/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${loginData.token}`,
        'Origin': 'https://agendoai-app-prod-6qoh.vercel.app'
      }
    });
    
    console.log('📥 Status do /api/user HTTPS:', userResponse.status);
    console.log('📥 Headers do /api/user HTTPS:', Object.fromEntries(userResponse.headers.entries()));
    
    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('❌ Erro no /api/user HTTPS:', errorText);
      return;
    }
    
    const userData = await userResponse.json();
    console.log('✅ /api/user HTTPS bem-sucedido');
    console.log('👤 Dados do usuário:', userData.email);
    
    // 3. Comparar com HTTP local
    console.log('\n📤 3. Comparando com HTTP local...');
    const localResponse = await fetch('http://localhost:5000/api/user', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${loginData.token}`,
        'Origin': 'http://localhost:3000'
      }
    });
    
    console.log('📥 Status do /api/user local:', localResponse.status);
    
    if (localResponse.ok) {
      console.log('✅ /api/user local funciona');
    } else {
      console.log('❌ /api/user local não funciona');
    }
    
    console.log('\n✅ Teste HTTPS concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste HTTPS:', error);
  }
}

testHTTPSAuth();
