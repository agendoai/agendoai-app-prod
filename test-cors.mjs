import fetch from 'node-fetch';

const testUrls = [
  'http://localhost:5000/api/login',
  'https://app.tbsnet.com.br/api/login'
];

const testOrigins = [
  'http://localhost:3000',
  'https://agendoai-app-prod-6qoh.vercel.app',
  'https://app.tbsnet.com.br'
];

async function testCORS() {
  console.log('🧪 Testando configuração de CORS...\n');
  
  for (const url of testUrls) {
    console.log(`🔍 Testando URL: ${url}`);
    
    for (const origin of testOrigins) {
      try {
        console.log(`  📡 Origin: ${origin}`);
        
        const response = await fetch(url, {
          method: 'OPTIONS',
          headers: {
            'Origin': origin,
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type, Authorization'
          }
        });
        
        console.log(`    ✅ Status: ${response.status}`);
        console.log(`    📋 CORS Headers:`);
        console.log(`       Access-Control-Allow-Origin: ${response.headers.get('access-control-allow-origin')}`);
        console.log(`       Access-Control-Allow-Methods: ${response.headers.get('access-control-allow-methods')}`);
        console.log(`       Access-Control-Allow-Headers: ${response.headers.get('access-control-allow-headers')}`);
        console.log(`       Access-Control-Allow-Credentials: ${response.headers.get('access-control-allow-credentials')}`);
        
      } catch (error) {
        console.log(`    ❌ Erro: ${error.message}`);
      }
      
      console.log('');
    }
    
    console.log('─'.repeat(80));
  }
}

testCORS().catch(console.error);
