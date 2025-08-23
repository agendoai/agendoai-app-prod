// Simulação do que o frontend faz
const API_URL = 'https://app.tbsnet.com.br';

async function simulateFrontendLogin() {
  console.log('🧪 Simulando o que o frontend faz...\n');
  
  try {
    // 1. Simular o que apiJson faz
    console.log('📤 Fazendo login (simulando apiJson)...');
    const loginResponse = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@agendoai.com',
        password: 'admin123'
      })
    });
    
    console.log('📥 Status da resposta:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.log('❌ Erro no login:', errorText);
      return;
    }
    
    // 2. Simular o que apiJson retorna
    const response = await loginResponse.json();
    console.log('✅ Login bem-sucedido!');
    console.log('📋 Resposta completa:', JSON.stringify(response, null, 2));
    
    // 3. Simular o que o hook useAuth faz
    console.log('\n🔍 Simulando o que o hook useAuth faz:');
    console.log('🔍 Verificando se response.token existe:', !!response.token);
    console.log('🔍 Tipo de response.token:', typeof response.token);
    console.log('🔍 Tamanho do token:', response.token ? response.token.length : 'N/A');
    
    // 4. Simular salvamento no localStorage
    if (response.token) {
      // Simular localStorage (que não existe no Node.js)
      console.log('🔑 Token encontrado! Simulando salvamento...');
      console.log('🔍 Token seria salvo:', response.token.substring(0, 50) + '...');
      
      // 5. Simular retorno do user
      console.log('\n👤 Retornando dados do usuário:', JSON.stringify(response.user, null, 2));
      
      // 6. Simular teste com o token
      console.log('\n🔐 Testando /api/user com o token...');
      const userResponse = await fetch(`${API_URL}/api/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${response.token}`,
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
      console.log('🔍 Estrutura da resposta:', Object.keys(response));
    }
    
  } catch (error) {
    console.error('💥 Erro na simulação:', error);
  }
}

// Executar a simulação
simulateFrontendLogin();
