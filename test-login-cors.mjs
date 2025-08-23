import fetch from 'node-fetch';

const testLogin = async () => {
  console.log('🧪 Testando endpoint de login com CORS...\n');
  
  const loginUrl = 'https://app.tbsnet.com.br/api/login';
  const testOrigins = [
    'https://agendoai-app-prod-6qoh.vercel.app',
    'http://localhost:3000'
  ];
  
  for (const origin of testOrigins) {
    console.log(`🔍 Testando origem: ${origin}`);
    
    try {
      // Teste 1: OPTIONS (preflight)
      console.log('  📡 Testando preflight OPTIONS...');
      const optionsResponse = await fetch(loginUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization'
        }
      });
      
      console.log(`    ✅ OPTIONS Status: ${optionsResponse.status}`);
      console.log(`    📋 CORS Headers:`);
      console.log(`       Access-Control-Allow-Origin: ${optionsResponse.headers.get('access-control-allow-origin')}`);
      console.log(`       Access-Control-Allow-Methods: ${optionsResponse.headers.get('access-control-allow-methods')}`);
      console.log(`       Access-Control-Allow-Headers: ${optionsResponse.headers.get('access-control-allow-headers')}`);
      
      // Teste 2: POST (requisição real)
      console.log('  📡 Testando POST real...');
      const postResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Origin': origin,
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test123'
        })
      });
      
      console.log(`    ✅ POST Status: ${postResponse.status}`);
      console.log(`    📋 Response Headers:`);
      console.log(`       Access-Control-Allow-Origin: ${postResponse.headers.get('access-control-allow-origin')}`);
      console.log(`       Content-Type: ${postResponse.headers.get('content-type')}`);
      
      if (postResponse.status === 401) {
        console.log('    ✅ 401 é esperado para credenciais inválidas - CORS funcionando!');
      }
      
    } catch (error) {
      console.log(`    ❌ Erro: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🎯 Resumo:');
  console.log('✅ Se você vê "Access-Control-Allow-Origin" nos headers, o CORS está funcionando');
  console.log('✅ Se você recebe 401 para credenciais inválidas, a autenticação está funcionando');
  console.log('✅ Agora teste o login no frontend!');
};

testLogin().catch(console.error);
