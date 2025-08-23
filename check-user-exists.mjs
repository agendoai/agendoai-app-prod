#!/usr/bin/env node

import fetch from 'node-fetch';

const testUserLogin = async () => {
  console.log('🔍 Verificando se o usuário existe no banco...');
  
  const testUsers = [
    {
      email: 'rauanconceicao75@gmail.com',
      password: '123456',
      description: 'Usuário mencionado no problema'
    },
    {
      email: 'admin@agendoai.com.br',
      password: '123456',
      description: 'Usuário admin de emergência'
    },
    {
      email: 'prestador@agendoai.com',
      password: 'prestador123',
      description: 'Usuário prestador de emergência'
    }
  ];
  
  for (const user of testUsers) {
    console.log(`\n🧪 Testando login para: ${user.email} (${user.description})`);
    
    try {
      const response = await fetch('https://app.tbsnet.com.br/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          password: user.password
        })
      });
      
      console.log(`📡 Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Login bem-sucedido!');
        console.log(`   User ID: ${data.user?.id}`);
        console.log(`   User Type: ${data.user?.userType}`);
        console.log(`   Token: ${data.token ? 'PRESENTE' : 'AUSENTE'}`);
        console.log(`   Token length: ${data.token ? data.token.length : 0}`);
        
        // Testar se o token funciona fazendo uma requisição autenticada
        console.log('🔐 Testando token em requisição autenticada...');
        
        const authResponse = await fetch('https://app.tbsnet.com.br/api/user', {
          headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json',
          }
        });
        
        console.log(`📡 Status da requisição autenticada: ${authResponse.status}`);
        
        if (authResponse.ok) {
          const userData = await authResponse.json();
          console.log('✅ Token válido! Dados do usuário obtidos com sucesso');
        } else {
          console.log('❌ Token inválido ou expirado');
        }
        
        return data; // Retornar dados do primeiro login bem-sucedido
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.log('❌ Login falhou');
        console.log(`   Erro: ${errorData.message || response.statusText}`);
      }
    } catch (error) {
      console.log('❌ Erro na requisição:', error.message);
    }
  }
  
  return null;
};

const checkDatabaseConnection = async () => {
  console.log('\n🔍 Verificando conexão com o banco de dados...');
  
  try {
    // Tentar uma rota que não requer autenticação
    const response = await fetch('https://app.tbsnet.com.br/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`📡 Status da verificação de saúde: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Servidor respondendo:', data);
    } else {
      console.log('❌ Servidor não está respondendo corretamente');
    }
  } catch (error) {
    console.log('❌ Erro ao conectar com o servidor:', error.message);
  }
};

const main = async () => {
  console.log('🚀 Iniciando diagnóstico completo...\n');
  
  // 1. Verificar conexão com o servidor
  await checkDatabaseConnection();
  
  // 2. Testar logins
  const loginResult = await testUserLogin();
  
  console.log('\n📋 Resumo do diagnóstico:');
  
  if (loginResult) {
    console.log('✅ PELO MENOS UM LOGIN FUNCIONOU');
    console.log('🔍 O problema pode estar:');
    console.log('   1. No frontend não salvando o token corretamente');
    console.log('   2. Na configuração das variáveis de ambiente do frontend');
    console.log('   3. No CORS ou configurações de segurança');
  } else {
    console.log('❌ NENHUM LOGIN FUNCIONOU');
    console.log('🔍 O problema está:');
    console.log('   1. No servidor não estar rodando');
    console.log('   2. No banco de dados não estar conectado');
    console.log('   3. Nas credenciais estarem incorretas');
    console.log('   4. Na configuração do JWT_SECRET');
  }
};

main().catch(console.error);
