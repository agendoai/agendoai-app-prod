import fetch from 'node-fetch';

const testLoginCORS = async () => {
  console.log('🧪 Testando endpoint de login com CORS corrigido...\n');
  
  const loginUrl = 'https://app.tbsnet.com.br/api/login';
  const testOrigin = 'https://agendoai-app-prod-6qoh.vercel.app';
  
  console.log(`🔍 Testando URL: ${loginUrl}`);
  console.log(`📡 Origin: ${testOrigin}\n`);
  
  try {
    // Teste 1: OPTIONS (preflight) - simula o que o navegador faz
    console.log('📡 Testando preflight OPTIONS...');
    const optionsResponse = await fetch(loginUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': testOrigin,
        'Access-Control-Request-Method': 'POST',
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
    
    // Teste 2: POST (requisição real) - simula o login
    console.log('\n📡 Testando POST real (login)...');
    const postResponse = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Origin': testOrigin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'test123'
      })
    });
    
    console.log(`    ✅ POST Status: ${postResponse.status}`);
    console.log(`    📋 Response Headers:`);
    console.log(`       Access-Control-Allow-Origin: ${postResponse.headers.get('access-control-allow-origin')}`);
    console.log(`       Access-Control-Allow-Credentials: ${postResponse.headers.get('access-control-allow-credentials')}`);
    console.log(`       Content-Type: ${postResponse.headers.get('content-type')}`);
    
    if (postResponse.status === 401) {
      console.log('    ✅ 401 é esperado para credenciais inválidas - CORS funcionando!');
    }
    
  } catch (error) {
    console.log(`    ❌ Erro: ${error.message}`);
  }
  
  console.log('\n🎯 Resumo:');
  console.log('✅ Se Access-Control-Allow-Credentials é "true", o CORS está configurado corretamente');
  console.log('✅ Se você recebe 401, a autenticação está funcionando');
  console.log('✅ Agora teste no frontend!');
};

testLoginCORS().catch(console.error);
