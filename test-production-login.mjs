// Teste de login em produção
const API_URL = 'https://app.tbsnet.com.br';

async function testProductionLogin() {
  console.log('🧪 Testando login em produção...\n');
  
  // Testar login com admin
  console.log('👤 Fazendo login com admin...');
  try {
    const loginResponse = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@agendoai.com.br',
        password: 'admin123'
      })
    });
    
    console.log('📥 Status do login:', loginResponse.status);
    console.log('📥 Headers da resposta:', Object.fromEntries(loginResponse.headers.entries()));
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login bem-sucedido!');
      console.log('📋 Resposta completa:', JSON.stringify(loginData, null, 2));
      
      if (loginData.token) {
        console.log('🔑 Token encontrado!');
        console.log('📏 Tamanho do token:', loginData.token.length);
        console.log('🔍 Primeiros 50 caracteres:', loginData.token.substring(0, 50) + '...');
        
        // Testar /api/user com o token
        console.log('\n🔐 Testando /api/user com o token...');
        const userResponse = await fetch(`${API_URL}/api/user`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${loginData.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }
        });
        
        console.log('📥 Status da resposta /api/user:', userResponse.status);
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('✅ /api/user funcionou!');
          console.log('👤 Dados do usuário:', JSON.stringify(userData, null, 2));
        } else {
          const errorText = await userResponse.text();
          console.log('❌ Erro em /api/user:', errorText);
        }
      } else {
        console.log('❌ Nenhum token encontrado na resposta!');
        console.log('🔍 Estrutura da resposta:', Object.keys(loginData));
      }
    } else {
      const errorText = await loginResponse.text();
      console.log('❌ Erro no login:', errorText);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error);
  }
}

// Executar o teste
testProductionLogin();
