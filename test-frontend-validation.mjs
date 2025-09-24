// Teste da validação de conta desativada no frontend
const API_URL = 'http://localhost:3000';

async function testFrontendValidation() {
  console.log('🌐 TESTANDO VALIDAÇÃO NO FRONTEND...\n');
  
  try {
    // 1. Simular o que o frontend faz
    console.log('1️⃣ Simulando login no frontend...');
    const response = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'prestador@agendoai.com',
        password: 'prestador123'
      })
    });
    
    console.log(`📥 Status: ${response.status}`);
    
    if (response.status === 403) {
      const errorData = await response.json();
      console.log('✅ VALIDAÇÃO FUNCIONANDO NO BACKEND!');
      console.log(`📝 Mensagem: ${errorData.message}`);
      
      // 2. Verificar se o frontend trataria corretamente
      console.log('\n2️⃣ Verificando tratamento do frontend...');
      
      const errorMessage = errorData.message || '';
      const isDeactivatedAccount = 
        response.status === 403 && 
        (errorMessage.includes('403') || 
         errorMessage.includes('desativada') || 
         errorMessage.includes('conta foi desativada'));
      
      if (isDeactivatedAccount) {
        console.log('✅ Frontend detectaria conta desativada!');
        console.log('📱 Mensagem que apareceria: "Sua conta foi desativada. Entre em contato com o suporte."');
      } else {
        console.log('❌ Frontend NÃO detectaria conta desativada');
        console.log(`📝 Mensagem recebida: "${errorMessage}"`);
      }
      
    } else if (response.ok) {
      const loginData = await response.json();
      console.log('❌ PROBLEMA: Login foi bem-sucedido quando deveria falhar!');
      console.log(`👤 Usuário: ${loginData.user.name}`);
      console.log(`✅ isActive: ${loginData.user.isActive}`);
      
    } else {
      const errorText = await response.text();
      console.log(`❓ Resposta inesperada: ${response.status} - ${errorText}`);
    }
    
    // 3. Instruções para teste manual
    console.log('\n3️⃣ TESTE MANUAL NO NAVEGADOR:');
    console.log('Para confirmar que está funcionando:');
    console.log('1. Abra o navegador e vá para http://localhost:4020');
    console.log('2. Tente fazer login com:');
    console.log('   📧 Email: prestador@agendoai.com');
    console.log('   🔑 Senha: prestador123');
    console.log('3. Você deve ver a mensagem: "Sua conta foi desativada"');
    console.log('');
    console.log('💡 Se ainda conseguir fazer login:');
    console.log('   - Limpe o cache do navegador (Ctrl+Shift+Del)');
    console.log('   - Abra uma aba anônima/privada');
    console.log('   - Verifique se há tokens salvos no localStorage');
    
    // 4. Verificar localStorage
    console.log('\n4️⃣ LIMPEZA DE CACHE/TOKENS:');
    console.log('Para limpar tokens salvos, execute no console do navegador:');
    console.log('localStorage.removeItem("token");');
    console.log('sessionStorage.removeItem("token");');
    console.log('localStorage.clear();');
    console.log('sessionStorage.clear();');
    
  } catch (error) {
    console.error('💥 Erro:', error.message);
  }
}

// Executar teste
testFrontendValidation();