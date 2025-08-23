import fetch from 'node-fetch';

const testJWTToken = async () => {
  console.log('🧪 Testando autenticação JWT...\n');
  
  const baseUrl = 'https://app.tbsnet.com.br';
  const testOrigin = 'https://agendoai-app-prod-6qoh.vercel.app';
  
  try {
    // Teste 1: Login para obter token
    console.log('📡 Testando login...');
    const loginResponse = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Origin': testOrigin,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@agendoai.com',
        password: 'admin123'
      })
    });
    
    console.log(`    ✅ Login Status: ${loginResponse.status}`);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log(`    📋 Login Response:`, {
        hasUser: !!loginData.user,
        hasToken: !!loginData.token,
        tokenLength: loginData.token ? loginData.token.length : 0,
        userEmail: loginData.user?.email
      });
      
      const token = loginData.token;
      
      if (token) {
        console.log(`    🔑 Token obtido: ${token.substring(0, 50)}...`);
        
        // Teste 2: Usar token para acessar /api/user
        console.log('\n📡 Testando /api/user com token...');
        const userResponse = await fetch(`${baseUrl}/api/user`, {
          method: 'GET',
          headers: {
            'Origin': testOrigin,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log(`    ✅ /api/user Status: ${userResponse.status}`);
        console.log(`    📋 Response Headers:`, {
          'Access-Control-Allow-Origin': userResponse.headers.get('access-control-allow-origin'),
          'Access-Control-Allow-Credentials': userResponse.headers.get('access-control-allow-credentials'),
          'Content-Type': userResponse.headers.get('content-type')
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log(`    ✅ Usuário obtido:`, {
            id: userData.id,
            email: userData.email,
            name: userData.name,
            userType: userData.userType
          });
        } else {
          const errorData = await userResponse.text();
          console.log(`    ❌ Erro: ${errorData}`);
        }
        
        // Teste 3: Tentar sem token
        console.log('\n📡 Testando /api/user SEM token...');
        const noTokenResponse = await fetch(`${baseUrl}/api/user`, {
          method: 'GET',
          headers: {
            'Origin': testOrigin,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`    ✅ /api/user sem token Status: ${noTokenResponse.status}`);
        const noTokenError = await noTokenResponse.text();
        console.log(`    📋 Erro esperado: ${noTokenError}`);
        
      } else {
        console.log('    ❌ Nenhum token recebido no login');
      }
    } else {
      const errorData = await loginResponse.text();
      console.log(`    ❌ Erro no login: ${errorData}`);
    }
    
  } catch (error) {
    console.log(`    ❌ Erro: ${error.message}`);
  }
  
  console.log('\n🎯 Resumo:');
  console.log('✅ Se o login retorna 200 e token, a autenticação está funcionando');
  console.log('✅ Se /api/user retorna 200 com token, o JWT está funcionando');
  console.log('✅ Se /api/user retorna 401 sem token, a proteção está funcionando');
};

testJWTToken().catch(console.error);
