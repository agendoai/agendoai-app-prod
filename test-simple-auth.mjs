#!/usr/bin/env node

import fetch from 'node-fetch';

const testSimpleAuth = async () => {
  console.log('🧪 Testando autenticação simples...\n');
  
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
      console.log('✅ Login bem-sucedido!');
      console.log(`   User ID: ${data.user?.id}`);
      console.log(`   User Type: ${data.user?.userType}`);
      console.log(`   Token: ${data.token ? 'PRESENTE' : 'AUSENTE'}`);
      console.log(`   Token length: ${data.token ? data.token.length : 0}`);
      
      if (data.token) {
        console.log('\n🔐 Testando requisição autenticada...');
        const authResponse = await fetch('https://app.tbsnet.com.br/api/user', {
          headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json',
          }
        });
        
        console.log(`📡 Status da requisição autenticada: ${authResponse.status}`);
        
        if (authResponse.ok) {
          const userData = await authResponse.json();
          console.log('✅ Requisição autenticada bem-sucedida!');
          console.log(`   User ID: ${userData.id}`);
          console.log(`   Email: ${userData.email}`);
          
          console.log('\n🎉 TUDO FUNCIONANDO!');
          console.log('💡 O problema está no frontend não salvando o token.');
          console.log('🔧 Soluções implementadas:');
          console.log('   1. localStorage (padrão)');
          console.log('   2. sessionStorage (fallback)');
          console.log('   3. Variável global (último recurso)');
          console.log('   4. Logs detalhados para debug');
          
        } else {
          console.log('❌ Requisição autenticada falhou');
          const errorData = await authResponse.text();
          console.log(`   Erro: ${errorData}`);
        }
      }
      
      return data;
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.log('❌ Login falhou');
      console.log(`   Erro: ${errorData.message || response.statusText}`);
      return null;
    }
  } catch (error) {
    console.log('❌ Erro na requisição:', error.message);
    return null;
  }
};

testSimpleAuth().catch(console.error);
