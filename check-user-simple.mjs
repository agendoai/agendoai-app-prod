// Script simples para verificar usuários via API
const API_URL = 'http://localhost:3000';

async function checkUserViaAPI() {
  console.log('🔍 Verificando usuários via API...\n');
  
  try {
    // Primeiro, vamos tentar fazer login com diferentes contas para ver quais existem
    const testAccounts = [
      { email: 'admin@agendoai.com.br', password: '123456', name: 'Admin' },
      { email: 'prestador@agendoai.com', password: 'prestador123', name: 'Prestador' },
      // Adicione aqui sua conta se souber o email e senha
      // { email: 'seu-email@exemplo.com', password: 'sua-senha', name: 'Sua Conta' }
      
      // Testando algumas contas comuns que podem estar desativadas
      { email: 'test@test.com', password: '123456', name: 'Test User' },
      { email: 'cliente@agendoai.com', password: '123456', name: 'Cliente Test' },
      { email: 'user@example.com', password: '123456', name: 'Example User' }
    ];
    
    console.log('🧪 Testando contas conhecidas...\n');
    
    for (const account of testAccounts) {
      console.log(`🔐 Testando: ${account.name} (${account.email})`);
      
      try {
        const response = await fetch(`${API_URL}/api/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: account.email,
            password: account.password
          })
        });
        
        console.log(`📥 Status: ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Login bem-sucedido!`);
          console.log(`   👤 Nome: ${data.user.name}`);
          console.log(`   📧 Email: ${data.user.email}`);
          console.log(`   🏷️  Tipo: ${data.user.userType}`);
          console.log(`   ✅ Ativo: ${data.user.isActive ? 'SIM' : 'NÃO'}`);
          console.log(`   ✅ Verificado: ${data.user.isVerified ? 'SIM' : 'NÃO'}`);
        } else {
          const errorText = await response.text();
          console.log(`❌ Erro: ${errorText}`);
          
          if (response.status === 403) {
            console.log('🎯 CONTA DESATIVADA DETECTADA!');
          }
        }
        
      } catch (error) {
        console.log(`💥 Erro na requisição: ${error.message}`);
      }
      
      console.log(''); // Linha em branco
    }
    
    console.log('ℹ️  Para testar sua conta específica:');
    console.log('   1. Adicione seu email e senha na lista testAccounts acima');
    console.log('   2. Execute o script novamente');
    console.log('   3. Ou tente fazer login no frontend e veja se aparece a mensagem de erro');
    
  } catch (error) {
    console.error('💥 Erro geral:', error);
  }
}

// Executar verificação
checkUserViaAPI();