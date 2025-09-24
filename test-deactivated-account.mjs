// Teste para verificar se a validação de conta desativada está funcionando
const API_URL = 'http://localhost:3000';

async function testDeactivatedAccountLogin() {
  console.log('🧪 Testando validação de conta desativada...\n');
  
  try {
    // Primeiro, vamos verificar se o servidor está rodando
    console.log('📡 Verificando se o servidor está rodando...');
    const healthCheck = await fetch(`${API_URL}/api/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!healthCheck.ok && healthCheck.status !== 401) {
      console.log('❌ Servidor não está respondendo. Status:', healthCheck.status);
      return;
    }
    
    console.log('✅ Servidor está rodando\n');
    
    // Agora vamos testar o login com diferentes contas
    const testAccounts = [
      {
        email: 'admin@agendoai.com.br',
        password: '123456',
        description: 'Admin de emergência (deve funcionar)'
      },
      {
        email: 'prestador@agendoai.com',
        password: 'prestador123',
        description: 'Prestador de emergência (deve funcionar)'
      }
    ];
    
    for (const account of testAccounts) {
      console.log(`🔐 Testando login: ${account.description}`);
      console.log(`📧 Email: ${account.email}`);
      
      try {
        const loginResponse = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: account.email,
            password: account.password
          })
        });
        
        console.log('📥 Status da resposta:', loginResponse.status);
        
        if (loginResponse.ok) {
          const response = await loginResponse.json();
          console.log('✅ Login bem-sucedido!');
          console.log('👤 Usuário:', response.user?.name || response.user?.email);
          console.log('🔍 isActive:', response.user?.isActive);
        } else {
          const errorText = await loginResponse.text();
          console.log('❌ Erro no login:', errorText);
          
          if (loginResponse.status === 403) {
            console.log('🎯 VALIDAÇÃO FUNCIONANDO! Conta desativada detectada.');
          }
        }
        
      } catch (error) {
        console.log('💥 Erro na requisição:', error.message);
      }
      
      console.log(''); // Linha em branco
    }
    
    // Agora vamos testar com uma conta que sabemos que pode estar desativada
    console.log('🔐 Testando com sua conta (se souber o email e senha)...');
    console.log('ℹ️  Para testar sua conta específica, você pode modificar este script');
    console.log('   adicionando seu email e senha na lista testAccounts acima.\n');
    
  } catch (error) {
    console.error('💥 Erro geral no teste:', error);
  }
}

// Executar o teste
testDeactivatedAccountLogin();