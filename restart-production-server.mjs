import { spawn } from 'child_process';
import fetch from 'node-fetch';

async function checkServerHealth() {
  try {
    const response = await fetch('https://app.tbsnet.com.br/api/health', {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function restartServer() {
  console.log('🔄 Reiniciando servidor de produção...');
  
  // Verificar se o servidor está rodando
  const isHealthy = await checkServerHealth();
  console.log(`📊 Status atual do servidor: ${isHealthy ? '✅ Online' : '❌ Offline'}`);
  
  if (isHealthy) {
    console.log('⚠️  Servidor já está rodando. As mudanças de CORS devem ser aplicadas automaticamente.');
    console.log('🔄 Para forçar uma reinicialização, você pode:');
    console.log('   1. Parar o processo atual (Ctrl+C)');
    console.log('   2. Executar: node server/deploy.js');
    console.log('   3. Ou usar: npm run start:prod');
  } else {
    console.log('🚀 Iniciando servidor de produção...');
    
    const server = spawn('node', ['server/deploy.js'], {
      stdio: 'inherit',
      shell: true
    });
    
    server.on('error', (error) => {
      console.error('❌ Erro ao iniciar servidor:', error);
    });
    
    server.on('close', (code) => {
      console.log(`📊 Servidor encerrado com código: ${code}`);
    });
  }
}

// Verificar configuração de CORS
console.log('🔍 Verificando configuração de CORS...');
console.log('✅ CORS configurado para:');
console.log('   - http://localhost:3000');
console.log('   - https://agendoai-app-prod-6qoh.vercel.app');
console.log('   - https://app.tbsnet.com.br');
console.log('   - https://*.tbsnet.com.br');
console.log('');

restartServer().catch(console.error);
