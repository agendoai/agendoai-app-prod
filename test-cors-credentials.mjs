import fetch from 'node-fetch';

const testCORSWithCredentials = async () => {
  console.log('🧪 Testando CORS com credenciais...\n');
  
  const testUrl = 'https://app.tbsnet.com.br/api/user';
  const testOrigin = 'https://agendoai-app-prod-6qoh.vercel.app';
  
  console.log(`🔍 Testando URL: ${testUrl}`);
  console.log(`📡 Origin: ${testOrigin}\n`);
  
  try {
    // Teste 1: OPTIONS (preflight) com credenciais
    console.log('📡 Testando preflight OPTIONS com credenciais...');
    const optionsResponse = await fetch(testUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': testOrigin,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
        'Access-Control-Request-Credentials': 'true'
      }
    });
    
    console.log(`    ✅ OPTIONS Status: ${optionsResponse.status}`);
    console.log(`    📋 CORS Headers:`);
    console.log(`       Access-Control-Allow-Origin: ${optionsResponse.headers.get('access-control-allow-origin')}`);
    console.log(`       Access-Control-Allow-Methods: ${optionsResponse.headers.get('access-control-allow-methods')}`);
    console.log(`       Access-Control-Allow-Headers: ${optionsResponse.headers.get('access-control-allow-headers')}`);
    console.log(`       Access-Control-Allow-Credentials: ${optionsResponse.headers.get('access-control-allow-credentials')}`);
    
    // Teste 2: GET (requisição real) com credenciais
    console.log('\n📡 Testando GET real com credenciais...');
    const getResponse = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Origin': testOrigin,
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log(`    ✅ GET Status: ${getResponse.status}`);
    console.log(`    📋 Response Headers:`);
    console.log(`       Access-Control-Allow-Origin: ${getResponse.headers.get('access-control-allow-origin')}`);
    console.log(`       Access-Control-Allow-Credentials: ${getResponse.headers.get('access-control-allow-credentials')}`);
    console.log(`       Content-Type: ${getResponse.headers.get('content-type')}`);
    
    if (getResponse.status === 401) {
      console.log('    ✅ 401 é esperado sem token válido - CORS funcionando!');
    }
    
  } catch (error) {
    console.log(`    ❌ Erro: ${error.message}`);
  }
  
  console.log('\n🎯 Resumo:');
  console.log('✅ Se Access-Control-Allow-Credentials é "true", o CORS está configurado corretamente');
  console.log('✅ Se você recebe 401, a autenticação está funcionando');
  console.log('✅ Agora teste no frontend!');
};

testCORSWithCredentials().catch(console.error);
