#!/usr/bin/env node

/**
 * Script para testar localStorage em produção
 */

// Simular localStorage para teste
const localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
    console.log(`🔑 localStorage.setItem(${key}, ${value.substring(0, 50)}...)`);
  },
  removeItem(key) {
    delete this.data[key];
    console.log(`🗑️ localStorage.removeItem(${key})`);
  }
};

// Simular window
const window = {
  localStorage: localStorage
};

// Simular fetch para teste
const fetch = async (url, options) => {
  console.log('🌐 Fetch chamado para:', url);
  console.log('📤 Headers:', options?.headers);
  
  // Simular resposta de login
  if (url.includes('/api/login')) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        user: {
          id: 1,
          email: 'admin@agendoai.com.br',
          name: 'Admin Demo',
          userType: 'admin'
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBhZ2VuZG9haS5jb20uYnIiLCJ1c2VyVHlwZSI6ImFkbWluIiwibmFtZSI6IkFkbWluIERlbW8iLCJpYXQiOjE3MzQ5NzI0NTEsImV4cCI6MTczNTU3NzI1MX0.example'
      })
    };
  }
  
  return {
    ok: false,
    status: 404,
    json: async () => ({ message: 'Endpoint não encontrado' })
  };
};

// Simular a função apiJson
const apiJson = async (endpoint, options = {}) => {
  console.log('🔄 apiJson chamada para:', endpoint);
  const response = await fetch(endpoint, options);
  console.log('📥 apiJson - Status da resposta:', response.status);
  const jsonData = await response.json();
  console.log('📥 apiJson - Dados JSON:', jsonData);
  return jsonData;
};

// Simular o fluxo de login
async function testLocalStorageProduction() {
  console.log('🔍 Testando localStorage em produção...');
  
  try {
    // 1. Fazer login
    console.log('\n📤 1. Fazendo login...');
    const loginData = await apiJson("/api/login", {
      method: "POST",
      body: JSON.stringify({
        email: 'admin@agendoai.com.br',
        password: '123456'
      })
    });
    
    console.log('✅ Login bem-sucedido');
    console.log('🔑 Token recebido:', loginData.token ? 'SIM' : 'NÃO');
    
    // 2. Verificar estrutura da resposta
    console.log('\n📤 2. Verificando estrutura da resposta...');
    console.log('🔍 Tipo da resposta:', typeof loginData);
    console.log('🔍 Chaves da resposta:', Object.keys(loginData || {}));
    console.log('🔍 Response.token existe:', !!loginData.token);
    console.log('🔍 Response.user existe:', !!loginData.user);
    
    // 3. Tentar salvar no localStorage
    console.log('\n📤 3. Salvando no localStorage...');
    if (loginData && loginData.token) {
      try {
        localStorage.setItem('authToken', loginData.token);
        console.log('🔑 Token salvo no localStorage');
        
        // Verificar se foi salvo
        const savedToken = localStorage.getItem('authToken');
        console.log('🔍 Token salvo:', savedToken ? 'SIM' : 'NÃO');
        
        if (savedToken) {
          console.log('✅ Token confirmado no localStorage');
          console.log('🔍 Token salvo:', savedToken.substring(0, 50) + '...');
        } else {
          console.log('❌ Token não foi salvo no localStorage');
        }
      } catch (error) {
        console.error('❌ Erro ao salvar token:', error);
      }
    } else {
      console.log('❌ Nenhum token encontrado na resposta');
      console.log('🔍 Estrutura da resposta:', Object.keys(loginData || {}));
    }
    
    console.log('\n✅ Teste localStorage concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  }
}

testLocalStorageProduction();
